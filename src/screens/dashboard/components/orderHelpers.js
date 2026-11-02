import {
  BUCKETS,
  SUB_TABS,
  filterByBucket,
  getOrderTotals,
  sourceFor,
} from '../../../utils/dashboard';

/**
 * Presentation helpers for the orders dashboard, order cards and tracking
 * page. Firestore fields can be numbers, null or objects, so everything shown
 * as text goes through `asText`.
 */

export const asText = value =>
  value === undefined || value === null || typeof value === 'object'
    ? ''
    : String(value);

/** The 7 pipeline stages with the look used on cards and the timeline. */
export const STAGES = [
  {
    score: 1,
    label: 'Pending',
    short: 'Pending',
    icon: 'time',
    color: '#f59e0b',
    tint: '#fff4e6',
  },
  {
    score: 2,
    label: 'Approved',
    short: 'Approved',
    icon: 'checkmark-done',
    color: '#4f46e5',
    tint: '#eef2ff',
  },
  {
    score: 3,
    label: 'Abroad Warehouse',
    short: 'China WH',
    icon: 'business',
    color: '#0284c7',
    tint: '#e0f2fe',
  },
  {
    score: 4,
    label: 'Ready to Fly',
    short: 'Ready',
    icon: 'airplane',
    color: '#2563eb',
    tint: '#e8f4ff',
  },
  {
    score: 5,
    label: 'Bangladesh Customs',
    short: 'Customs',
    icon: 'shield-checkmark',
    color: '#7c3aed',
    tint: '#f3e8ff',
  },
  {
    score: 6,
    label: 'ALG Warehouse',
    short: 'ALG WH',
    icon: 'cube',
    color: '#db2777',
    tint: '#fdeefe',
  },
  {
    score: 7,
    label: 'Delivered',
    short: 'Delivered',
    icon: 'home',
    color: '#059669',
    tint: '#ecfdf5',
  },
];

/** The stage an order is at (score below 1 or unknown reads as Pending). */
export const stageOf = order => {
  const score = Math.min(
    Math.max(Number(order?.shipmentStatusScore) || 1, 1),
    7,
  );
  return STAGES[score - 1];
};

/** Payment status as a short label and tone, from the stored status and the amounts. */
export const paymentStateOf = order => {
  const { paid, due } = getOrderTotals(order);
  const status = asText(order?.paymentStatus);
  if (due <= 0 && paid > 0) return { label: 'Paid', tone: 'paid' };
  if (status === 'pending')
    return { label: 'Payment pending', tone: 'pending' };
  if (paid > 0) return { label: 'Partly paid', tone: 'partial' };
  return { label: 'Unpaid', tone: 'unpaid' };
};

/** Up to `limit` distinct product pictures for an order. */
export const orderThumbs = (order, limit = 3) => {
  const pictures = (Array.isArray(order?.items) ? order.items : []).flatMap(
    item => [
      asText(item?.picture),
      ...(Array.isArray(item?.skus) ? item.skus : []).map(sku =>
        asText(sku?.image),
      ),
    ],
  );
  return [...new Set(pictures.filter(uri => /^https?:\/\//.test(uri)))].slice(
    0,
    limit,
  );
};

/** Total pieces across an order's items. */
export const orderPieces = order =>
  (Array.isArray(order?.items) ? order.items : []).reduce(
    (total, item) =>
      total +
      (Array.isArray(item?.skus) ? item.skus : []).reduce(
        (sum, sku) => sum + (Number(sku?.totalQuantity) || 0),
        0,
      ),
    0,
  );

/**
 * The records one section (and optionally one of its tabs) shows, read from
 * the store the website reads it from: requests from `bookingRequest`, the
 * rest from `ordersApi`. (`flow` is kept for callers; Buy & Ship is the only
 * service now.)
 */
export const recordsFor = (flow, bucket, sources, subTab) =>
  filterByBucket(sources?.[sourceFor(bucket)], bucket, subTab);

export const BUCKET_ORDER = [
  BUCKETS.REQUESTS,
  BUCKETS.ORDERS,
  BUCKETS.FORWARDING,
  BUCKETS.DELIVERED,
];

/** How many records each section holds. */
export const bucketCounts = (flow, sources) =>
  Object.fromEntries(
    BUCKET_ORDER.map(bucket => [bucket, recordsFor(flow, bucket, sources).length]),
  );

/** How many records each tab of a section holds. */
export const subTabCounts = (bucket, sources) =>
  Object.fromEntries(
    (SUB_TABS[bucket] || []).map(tab => [tab.key, recordsFor(null, bucket, sources, tab.key).length]),
  );

/**
 * Summary strip: every order and request, how many orders are on the way
 * (Forwarding), and the total still due.
 */
export const flowSummary = (flow, sources) => {
  const all = [...(sources.ordersApi || []), ...(sources.bookings || [])];
  const inTransit = recordsFor(flow, BUCKETS.FORWARDING, sources).length;
  const due = all.reduce((sum, record) => sum + getOrderTotals(record).due, 0);
  return { total: all.length, inTransit, due };
};
