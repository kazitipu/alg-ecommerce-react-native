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
  const perShopDiscount = couponAmount ? parseInt(couponAmount / shopCount, 10) : 0;

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
      actualTotalAfterCoupon: orderTotal - perShopDiscount,
      orderTotal: orderTotal - perShopDiscount,
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
      deliveryCharge:
        deliveryCharges[shop.shopId] ?? DEFAULTS.deliveryCharge,
    };
  });
};

export default { getShopTotal, summarizeOrder, buildOrders };
