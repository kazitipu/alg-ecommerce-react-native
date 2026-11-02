import { DEFAULTS } from '../constants/config';

/**
 * Turns the selected cart shops into the `ordersApi` documents ALG's admin
 * panel and the freight pipeline read. One document per shop, because each shop
 * ships separately.
 */

/** Goods total for one shop: unit price x quantity across every SKU. */
export const getShopTotal = shop =>
  (shop.items || []).reduce(
    (shopTotal, item) =>
      shopTotal +
      (item.skus || []).reduce(
        (lineTotal, sku) =>
          lineTotal + parseInt(parseFloat(sku.price) * parseFloat(sku.totalQuantity), 10),
        0,
      ),
    0,
  );

/** Goods total, distinct product lines, and unit count across the whole order. */
export const summarizeOrder = pendingOrders => {
  let totalAmount = 0;
  let goodsCategory = 0;
  let totalQuantity = 0;

  (pendingOrders || []).forEach(shop => {
    goodsCategory += (shop.items || []).length;
    (shop.items || []).forEach(item => {
      (item.skus || []).forEach(sku => {
        totalAmount += parseInt(parseFloat(sku.price) * parseFloat(sku.totalQuantity), 10);
        totalQuantity += parseInt(sku.totalQuantity, 10);
      });
    });
  });

  return { totalAmount, goodsCategory, totalQuantity };
};

/**
 * Builds the order documents.
 *
 * A coupon is split evenly across shops, matching the web app — an order across
 * three shops carries a third of the discount each.
 *
 * `createdAt` is supplied by the caller (a Firestore Timestamp) so this stays
 * a pure function.
 */
export const buildOrders = ({
  pendingOrders,
  couponAmount = 0,
  coupon = null,
  additionalNotes = '',
  deliveryCharges = {},
  deliveryAddress,
  currency,
  createdAt,
}) => {
  const shopCount = pendingOrders.length || 1;
  // As on the web: the stored share is exact, the totals subtract its whole part.
  const perShopDiscount = couponAmount ? couponAmount / shopCount : 0;
  const perShopWhole = parseInt(perShopDiscount, 10);

  return pendingOrders.map(shop => {
    const date = new Date();
    const orderTotal = getShopTotal(shop);

    return {
      ...shop,
      orderId: shop.orderId || Math.floor(Math.random() * Date.now()),
      time: date.getTime(),
      orderedDate: date.toLocaleDateString('en-GB'),
      orderedTime: date.toLocaleTimeString('en-US'),
      orderStatus: 'pending',
      actualTotal: orderTotal,
      actualTotalAfterCoupon: orderTotal - perShopWhole,
      orderTotal: orderTotal - perShopWhole,
      couponUsed: coupon,
      couponAmount: perShopDiscount,
      paymentStatus: 'purchaseLater',
      additionalNotes,
      // Entry point of the 7-stage freight pipeline.
      shipmentStatusScore: 1,
      websiteName: '1688.com',
      currency,
      createdAt,
      deliveryAddress,
      // A missing or failed (NaN / 0) quote falls back to the flat 100 Tk.
      deliveryCharge: getDeliveryCharge(deliveryCharges, shop),
    };
  });
};

/** The quoted delivery charge inside Bangladesh, or the web's flat 100 Tk. */
export const getDeliveryCharge = (deliveryCharges, shop) =>
  deliveryCharges?.[shop.shopId] || DEFAULTS.deliveryCharge;

/** Total pieces in a shop entry. */
export const getShopQuantity = shop =>
  (shop.items || []).reduce(
    (total, item) =>
      total + (item.skus || []).reduce((sum, sku) => sum + (parseInt(sku.totalQuantity, 10) || 0), 0),
    0,
  );

/**
 * "Customs & Shipping charge (approx)" for a shop, exactly as the web shows
 * it: `parseInt(parseInt(shippingRate) × weight)`. Shown for information only;
 * it is charged later, once the goods reach Bangladesh.
 */
export const getCustomsCharge = shop => {
  const item = shop.items?.[0];
  return parseInt((parseInt(item?.shippingRate, 10) || 0) * (parseFloat(item?.weight) || 0), 10) || 0;
};

/**
 * "Total Payable Now (excluding all shipping charges)": goods minus coupon.
 * The China courier, customs and delivery charges are settled later.
 */
export const getPayableNow = (totalAmount, couponAmount) =>
  parseInt(totalAmount, 10) - parseInt(couponAmount || 0, 10);

/**
 * The web's advance-payment offer (`discountModal.js`). `partial` holds the
 * discount for paying 100%, 80% or 60% now; `offer` is one of those, as "N%".
 *
 *  - `total`: the order after the offer's discount
 *  - `payableTotal`: what is paid now — the discounted total for 100%, or
 *    80% / 60% of the undiscounted total
 *  - `payNowPercent`: "100%", "80%" or "60%"
 */
export const getPayNowOffer = (partial, total, offer) => {
  const percent = parseFloat(String(offer).split('%')[0]) || 0;
  const discounted = Math.round(total - (total * percent) / 100);
  if (offer === `${partial.payNow100}%`) {
    return { offer, total: discounted, payableTotal: discounted, payNowPercent: '100%' };
  }
  if (offer === `${partial.payNow80}%`) {
    return { offer, total: discounted, payableTotal: Math.round(total * 0.8), payNowPercent: '80%' };
  }
  return { offer, total: discounted, payableTotal: Math.round(total * 0.6), payNowPercent: '60%' };
};

/** bKash (and other gateways) add 1.5% on the web; a City Bank deposit adds nothing. */
export const BANK_METHOD = 'City';

/**
 * The payment request for a just-placed order, field for field as the web's
 * `paymentModal.js` sends it (direct deposit and bKash share this shape).
 * `newOrder` carries the offer picked after placing: `{ total, payableTotal,
 * offer, payNowPercent, couponAmount }`.
 */
export const buildNewOrderPayment = ({ newOrder, orders, currentUser, method, now = new Date() }) => {
  const { total, payableTotal, offer, payNowPercent, couponAmount = 0 } = newOrder;
  const actualTotal = (orders || []).reduce((sum, shop) => sum + getShopTotal(shop), 0);
  return {
    status: 'pending',
    date: now.toLocaleDateString('en-GB'),
    paymentId: Math.floor(Math.random() * now.getTime()),
    amount: total,
    method,
    pendingOrders: (orders || []).map(shop => ({
      ...shop,
      paymentStatus: 'pending',
      payNowPercent,
      actualTotal: getShopTotal(shop),
      offer,
    })),
    userId: currentUser?.id,
    time: now.getTime(),
    displayName: currentUser?.displayName,
    actualTotal,
    actualTotalAfterCouponAdd: parseInt(actualTotal, 10) - parseInt(couponAmount, 10),
    offer,
    payNowPercent,
    payableTotal,
    total,
    payableTotalWithGatewayCharge:
      method === BANK_METHOD ? payableTotal : parseInt(payableTotal * (1.5 / 100) + payableTotal, 10),
    couponAmount,
  };
};

/**
 * Whether a placed order still needs paying. Orders are created as
 * `purchaseLater`; submitting a payment moves them to `pending` (and the
 * admin on to `paid` etc.), so anything else means payment is under way.
 */
export const isAwaitingPayment = order => !order?.paymentStatus || order.paymentStatus === 'purchaseLater';

/**
 * The payment request for an order or product request that already exists
 * (My orders → Pay now), field for field as the web's `paymentModalOrder.js`
 * (orders) and `paymentModal.js` (requests) send it. `existing` is
 * `{ kind: 'order' | 'request', total, paid, due }`; `payableTotal` is what the
 * customer chose to pay now. `taka` is only used for the orders' informational
 * `actualTotal`, which the web works out as sku price × taka × quantity.
 */
export const buildExistingPayment = ({ existing, records, currentUser, method, payableTotal, taka = 0, now = new Date() }) => {
  const list = records || [];
  const recordsTotal = list.reduce((sum, record) => sum + (parseInt(record?.orderTotal, 10) || 0), 0);
  const remaining = (existing?.total || 0) - (existing?.paid || 0);
  const payNowPercent = remaining > 0 ? `${((payableTotal / remaining) * 100).toFixed(2)}%` : '0%';
  const withCharge =
    method === BANK_METHOD ? payableTotal : parseInt(payableTotal * (1.5 / 100) + payableTotal, 10);
  const common = {
    status: 'pending',
    date: now.toLocaleDateString('en-GB'),
    paymentId: Math.floor(Math.random() * now.getTime()),
    amount: payableTotal,
    method,
    pendingOrders: list,
    userId: currentUser?.id,
    displayName: currentUser?.displayName,
    time: now.getTime(),
    offer: '',
    payNowPercent,
    payableTotal,
    total: recordsTotal,
    actualTotalAfterCouponAdd: recordsTotal,
    payableTotalWithGatewayCharge: withCharge,
  };
  if (existing?.kind === 'request') {
    return { ...common, actualTotal: recordsTotal, productRequestArray: list };
  }
  const skuTotal = list.reduce(
    (sum, shop) =>
      sum +
      (shop?.items || []).reduce(
        (itemSum, item) =>
          itemSum +
          (item?.skus || []).reduce(
            (skuSum, sku) =>
              skuSum + parseInt(parseFloat(sku?.price) * parseFloat(taka) * (parseInt(sku?.totalQuantity, 10) || 0), 10) || skuSum,
            0,
          ),
        0,
      ),
    0,
  );
  return { ...common, actualTotal: skuTotal, couponAmount: 0 };
};

export default {
  buildExistingPayment,
  isAwaitingPayment,
  buildNewOrderPayment,
  getShopTotal,
  summarizeOrder,
  buildOrders,
  getDeliveryCharge,
  getShopQuantity,
  getCustomsCharge,
  getPayableNow,
  getPayNowOffer,
};
