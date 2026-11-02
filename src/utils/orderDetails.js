import { getOrderTotals } from './dashboard';

/**
 * What the website shows about one order or product request, in the rows of
 * its Buy & Ship pages (`my-orders.js`, `my-request.js`, …): the header facts,
 * every sku with its variant, unit price, quantity, product type and shipping
 * rate, the abroad-warehouse photo, refund state and the money owed.
 */

const text = value => (value === undefined || value === null || typeof value === 'object' ? '' : String(value).trim());
const int = value => parseInt(value, 10) || 0;

/** The web renames one request status for customers. */
export const statusLabel = (record, isRequest) => {
  const status = text(record?.orderStatus);
  if (isRequest && status === 'Bangladesh warehouse') return 'Custom released';
  // Orders start as lower-case "pending"; show it like the other statuses.
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/** "1688 tk/kg": the agreed customer rate, else the product's quoted rate. */
const rateOf = (record, fallback) => {
  if (text(record?.customerRate)) return `${text(record.customerRate)} Tk/kg`;
  if (text(fallback)) return `${text(fallback)} Tk/kg`;
  return '';
};

/** The header facts the web shows above each row. */
export const orderFacts = (record, isRequest) => {
  if (isRequest) {
    return [
      { key: 'id', label: 'Booking ID', value: text(record?.bookingId), copy: true },
      { key: 'date', label: 'Booking date', value: text(record?.date) },
      { key: 'store', label: 'Store', value: text(record?.store) },
      { key: 'status', label: 'Order status', value: statusLabel(record, true) },
      { key: 'tracking', label: 'Tracking no', value: text(record?.trackingNo), copy: true },
    ];
  }
  return [
    { key: 'id', label: 'Order ID', value: text(record?.orderId), copy: true },
    {
      key: 'date',
      label: 'Ordered on',
      value: [text(record?.orderedDate), text(record?.orderedTime)].filter(Boolean).join(' · '),
    },
    { key: 'shop', label: 'Shop', value: text(record?.shopName) },
    { key: 'status', label: 'Order status', value: statusLabel(record, false) },
    { key: 'suborder', label: 'Suborder ID', value: text(record?.orderNumber), copy: true },
    { key: 'tracking', label: 'Tracking no', value: text(record?.trackingNo), copy: true },
  ];
};

/**
 * The goods, one line per sku as the web lists them. Variants are labelled
 * with the product's own property names ("Color: Red", "Size: XL").
 */
export const detailLines = (record, isRequest) => {
  if (isRequest) {
    if (!record) return [];
    // Web requests use productQuantity/note; the app's form saved quantity/notes.
    const quantity = int(record.productQuantity) || int(record.quantity);
    const unit = parseFloat(record.unitPrice) || 0;
    return [
      {
        key: 'request',
        image: text(record.imageUrl),
        name: text(record.productName) || [text(record.store), text(record.productType)].filter(Boolean).join(' - ') || 'Product request',
        link: text(record.productUrl) || text(record.productLink),
        productType: text(record.productType),
        shippingRate: rateOf(record, record.shippingRate),
        variants: text(record.productVariant) ? [{ label: 'Variant', value: text(record.productVariant) }] : [],
        note: text(record.note) || text(record.notes),
        unit: int(unit),
        quantity,
        amount: int(unit * quantity),
      },
    ];
  }
  return (Array.isArray(record?.items) ? record.items : []).flatMap((item, itemIndex) => {
    const names = Array.isArray(item?.propertyNames) ? item.propertyNames : [];
    return (Array.isArray(item?.skus) ? item.skus : []).map((sku, skuIndex) => {
      const quantity = int(sku?.totalQuantity);
      const unit = parseFloat(sku?.price) || 0;
      const variants = [];
      if (text(sku?.color)) variants.push({ label: text(names[0]) || 'Colour', value: text(sku.color) });
      if (text(sku?.size)) variants.push({ label: text(names[1]) || 'Size', value: text(sku.size) });
      return {
        key: `${text(item?.id) || itemIndex}-${text(sku?.sku_id) || skuIndex}`,
        image: text(sku?.image) || text(item?.picture),
        name: text(item?.name) || 'Product',
        link: '',
        productType: text(item?.productType),
        shippingRate: rateOf(record, item?.shippingRate),
        variants,
        note: '',
        unit: int(unit),
        quantity,
        amount: int(unit * quantity),
      };
    });
  });
};

/**
 * The money on the record: what makes up the total, the payments made, and
 * any refund — the same figures as the list and the invoice.
 */
export const chargeBreakdown = record => {
  const { total, paid, due } = getOrderTotals(record);
  const shipping = int(record?.shippingChargeCustomer);
  const localShipping = int(record?.localShipping);
  const otherCost = int(record?.otherCost);
  const discount = int(record?.discount);
  const goods = total - shipping - localShipping - otherCost + discount;
  // As on the web, the weighed parcel and its rate sit with the shipping charge.
  const weight = parseFloat(record?.receivedWeight) || 0;
  const rate = parseFloat(record?.customerRate) || 0;
  const shippingHint = [weight ? `Total weight ${weight} kg` : '', rate ? `${rate} Tk/kg` : '']
    .filter(Boolean)
    .join(' × ');
  const rows = [
    { key: 'goods', label: 'Goods', value: goods },
    localShipping ? { key: 'local', label: 'China courier', value: localShipping, sign: '+' } : null,
    shipping ? { key: 'shipping', label: 'Customs & shipping', value: shipping, sign: '+', hint: shippingHint } : null,
    otherCost ? { key: 'other', label: 'Repackaging charge', value: otherCost, sign: '+' } : null,
    discount ? { key: 'discount', label: 'Discount', value: discount, sign: '-' } : null,
  ].filter(Boolean);
  const payments = (Array.isArray(record?.payments) ? record.payments : []).map((payment, index) => ({
    key: text(payment?.paymentId) || String(index),
    date: text(payment?.date),
    method: text(payment?.method),
    amount: int(payment?.amount),
  }));
  return { rows, total, paid, due, payments, weight, rate };
};

/** The refund chip the web shows: requested / approved / rejected, and the amount refunded. */
export const refundState = record => {
  const status = text(record?.refundStatus);
  const amount = int(record?.refund);
  if (!status && !amount) return null;
  return { status, amount, rejected: status.toLowerCase() === 'rejected' };
};

/** The abroad warehouse's photo of a received order (requests use `imageUrl` for the product). */
export const warehousePhoto = (record, isRequest) => (isRequest ? '' : text(record?.imageUrl));

/** The web hides the progress steps of a rejected order or request. */
export const showsProgress = record => text(record?.orderStatus) !== 'Reject';

/** Share of the total paid, 0–1 (for the payment progress bar). */
export const paidShare = ({ total, paid }) => (total > 0 ? Math.min(1, Math.max(0, paid / total)) : 0);

/**
 * A plain-text summary to copy or share (e.g. with support): reference,
 * status, tracking and the money owed.
 */
export const orderSummaryText = ({ record, isRequest, symbol = 'Tk' }) => {
  const money = chargeBreakdown(record);
  const amount = value => `${symbol} ${Math.round(value).toLocaleString('en-US')}`;
  const facts = orderFacts(record, isRequest).filter(fact => fact.value);
  const lines = detailLines(record, isRequest);
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);
  return [
    `ALG ${isRequest ? 'product request' : 'order'}`,
    ...facts.map(fact => `${fact.label}: ${fact.value}`),
    pieces ? `Items: ${lines.length} line${lines.length === 1 ? '' : 's'}, ${pieces} pcs` : null,
    `Total: ${amount(money.total)}`,
    `Paid: ${amount(money.paid)}`,
    `Due: ${amount(money.due)}`,
  ]
    .filter(Boolean)
    .join('\n');
};
