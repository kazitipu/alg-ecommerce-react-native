/**
 * The customer dashboard's lists, amounts and payment rules, following the
 * website's four Buy & Ship pages (`pages/user-profile/buy-and-ship-for-me/`):
 *
 *   My Request          `bookingRequest`  Pending · Approved · Delivered
 *   My Orders           `ordersApi`       Pending · Purchased · Rejected
 *   Forwarding Parcels  `ordersApi`       Abroad · In Bangladesh
 *   Delivered           `ordersApi`       —
 *
 * Every list is split by the record's `orderStatus` text, exactly as the web
 * does, then searched and filtered by payment status.
 */
export const BUCKETS = {
  REQUESTS: 'requests',
  ORDERS: 'orders',
  FORWARDING: 'forwarding',
  DELIVERED: 'delivered',
};

export const BUCKET_LABELS = {
  [BUCKETS.REQUESTS]: 'My requests',
  [BUCKETS.ORDERS]: 'My orders',
  [BUCKETS.FORWARDING]: 'Forwarding',
  [BUCKETS.DELIVERED]: 'Delivered',
};

const status = record => String(record?.orderStatus ?? '').trim();

const ABROAD = ['Received in Warehouse', 'Ready for fly', 'Bangladesh customs', 'Bangladesh warehouse'];

/** The web's tabs inside each section and which `orderStatus` values they hold. */
export const SUB_TABS = {
  [BUCKETS.REQUESTS]: [
    { key: 'pending', label: 'Pending', match: r => status(r) === 'Pending' },
    {
      key: 'approved',
      label: 'Approved',
      match: r => !['Pending', 'Reject', 'Delivered'].includes(status(r)),
    },
    { key: 'delivered', label: 'Delivered', match: r => status(r) === 'Delivered' },
  ],
  [BUCKETS.ORDERS]: [
    { key: 'pending', label: 'Pending', match: r => status(r) === 'pending' },
    { key: 'purchased', label: 'Purchased', match: r => status(r) === 'Purchased' },
    { key: 'rejected', label: 'Rejected', match: r => status(r) === 'Reject' },
  ],
  [BUCKETS.FORWARDING]: [
    { key: 'abroad', label: 'Abroad', match: r => ABROAD.includes(status(r)) },
    { key: 'bangladesh', label: 'In Bangladesh', match: r => status(r) === 'Alg warehouse' },
  ],
  [BUCKETS.DELIVERED]: [{ key: 'all', label: 'Delivered', match: r => status(r) === 'Delivered' }],
};

/** Which store a section reads: product requests, or orders. */
export const sourceFor = bucket => (bucket === BUCKETS.REQUESTS ? 'bookings' : 'ordersApi');

/** Records in a section — one tab of it, or every tab together. */
export const filterByBucket = (records, bucket, subTab) => {
  const tabs = SUB_TABS[bucket] || [];
  const chosen = subTab ? tabs.filter(tab => tab.key === subTab) : tabs;
  return (Array.isArray(records) ? records : []).filter(record => chosen.some(tab => tab.match(record)));
};

/** The web's payment-status filter. "Not paid" also covers purchase-later and blank. */
export const PAYMENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Partially Paid', label: 'Partially paid' },
  { key: 'unpaid', label: 'Not paid' },
];

export const filterByPayment = (records, key) => {
  const list = Array.isArray(records) ? records : [];
  if (!key || key === 'all') return list;
  if (key === 'unpaid') {
    return list.filter(r => ['purchaseLater', 'Not paid', ''].includes(String(r?.paymentStatus ?? '')));
  }
  return list.filter(r => r?.paymentStatus === key);
};

/** The web's search: tracking no., order date, order number, order id or product type. */
export const searchRecords = (records, query) => {
  const list = Array.isArray(records) ? records : [];
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list;
  const has = value => value !== undefined && value !== null && typeof value !== 'object' && String(value).toLowerCase().includes(q);
  return list.filter(
    r =>
      has(r?.trackingNo) ||
      has(r?.orderedDate) ||
      has(r?.orderNumber) ||
      has(r?.orderId) ||
      has(r?.bookingId) ||
      (Array.isArray(r?.items) && r.items.some(item => has(item?.productType) || has(item?.name))),
  );
};

const int = value => parseInt(value, 10) || 0;

/** Goods total from the skus, which the web falls back to when `orderTotal` is missing. */
const shopTotal = order =>
  (Array.isArray(order?.items) ? order.items : []).reduce(
    (sum, item) =>
      sum +
      (Array.isArray(item?.skus) ? item.skus : []).reduce(
        (lineSum, sku) => lineSum + int(parseFloat(sku?.price) * int(sku?.totalQuantity)),
        0,
      ),
    0,
  );

/**
 * Money on an order or request, as the web's `getTotalPaid` / `getTotalDue`:
 * goods (or the sku total) + shipping + China courier + other costs − discount,
 * less what has been paid.
 */
export const getOrderTotals = order => {
  const goods = order?.orderTotal ? int(order.orderTotal) : shopTotal(order);
  const total =
    goods + int(order?.shippingChargeCustomer) + int(order?.localShipping) + int(order?.otherCost) - int(order?.discount);
  const paid = (Array.isArray(order?.payments) ? order.payments : []).reduce((sum, p) => sum + int(p?.amount), 0);
  return { total, paid, due: Math.max(0, total - paid) };
};

/**
 * Whether "Pay now" shows, as on the web: a rejected order, nothing due, a
 * payment awaiting confirmation, or fully paid all hide it; requests also need to be past
 * stage 1 (priced by the team).
 */
export const canPay = (record, bucket) => {
  if (status(record) === 'Reject') return false;
  if (['pending', 'Paid'].includes(record?.paymentStatus)) return false;
  if (getOrderTotals(record).due <= 0) return false;
  if (bucket === BUCKETS.REQUESTS && (Number(record?.shipmentStatusScore) || 0) <= 1) return false;
  return true;
};

/** "Quick refund" is offered on paid or partly paid records without a refund already. */
export const canRefund = record =>
  ['Paid', 'Partially Paid'].includes(record?.paymentStatus) && !record?.refundStatus;

/** The web links an invoice only once the shipping charge has been set. */
export const hasInvoice = record => int(record?.shippingChargeCustomer) !== 0;

/**
 * The least a customer may pay now. After a first payment any amount works;
 * the first payment must cover 100% of an order by bank deposit, or 60% by
 * bKash — and 60% of a product request either way.
 */
export const minimumPayment = ({ kind, method, due, paid }) => {
  if (paid > 0) return 1;
  if (kind === 'order' && method === 'deposit') return due;
  return Math.ceil((due * 60) / 100);
};

/** The web's checks on the amount to pay now; returns a message or null. */
export const validatePayAmount = ({ amount, due, minimum, kind, method }) => {
  const value = Number(amount) || 0;
  if (value <= 0) return "Amount to pay now can't be 0";
  if (value > due) return "Amount to pay now can't be more than due amount.";
  if (value < minimum) {
    return kind === 'order' && method === 'deposit'
      ? "Payable amount can't be less than 100% of the due amount"
      : "Payable amount can't be less than 60% of the due amount";
  }
  return null;
};

export default {
  BUCKETS,
  BUCKET_LABELS,
  SUB_TABS,
  sourceFor,
  filterByBucket,
  filterByPayment,
  searchRecords,
  getOrderTotals,
  canPay,
  canRefund,
  hasInvoice,
  minimumPayment,
  validatePayAmount,
};
