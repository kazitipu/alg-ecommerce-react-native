import { FLOWS } from '../navigation/routes';

/**
 * Which pipeline stage each dashboard tab shows.
 *
 * The web app had four separate screens per flow, each filtering the same
 * arrays inline. These are those filters, named, so both flows share one set of
 * screens rather than the web's two duplicated route trees.
 *
 * Stages (`shipmentStatusScore`):
 *   1 Pending · 2 Approved · 3 Abroad Warehouse · 4 Ready to Fly
 *   5 Bangladesh Customs · 6 ALG Warehouse · 7 Delivered
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

const scoreOf = record => Number(record?.shipmentStatusScore) || 0;

const MATCHERS = {
  // Awaiting approval or quoting.
  [BUCKETS.REQUESTS]: record => scoreOf(record) <= 2,
  // Approved and being purchased or paid for, but not yet shipped.
  [BUCKETS.ORDERS]: record => scoreOf(record) >= 1 && scoreOf(record) <= 2,
  // In transit: at the overseas warehouse through customs and our warehouse.
  [BUCKETS.FORWARDING]: record => scoreOf(record) >= 3 && scoreOf(record) <= 6,
  [BUCKETS.DELIVERED]: record => scoreOf(record) === 7,
};

export const filterByBucket = (records, bucket) =>
  (records || []).filter(MATCHERS[bucket] || (() => true));

/**
 * Money owed on an order.
 *
 * Total is the goods plus every surcharge minus any discount; paid is the sum
 * of verified payments. Mirrors the web's `getTotalPaid` / `getTotalDue`.
 */
export const getOrderTotals = order => {
  const total =
    (Number(order?.orderTotal) || 0) +
    (Number(order?.shippingChargeCustomer) || 0) +
    (Number(order?.localShipping) || 0) +
    (Number(order?.otherCost) || 0) -
    (Number(order?.discount) || 0);

  const paid = (order?.payments || []).reduce(
    (sum, payment) => sum + (Number(payment?.amount) || 0),
    0,
  );

  return { total, paid, due: Math.max(0, total - paid) };
};

/** Which Firestore-backed list a tab reads, given the flow. */
export const getSourceFor = (flow, bucket) => {
  if (flow === FLOWS.SHIP_FOR_ME) return 'shipForMe';
  return bucket === BUCKETS.ORDERS ? 'ordersApi' : 'bookingRequest';
};

export default {
  BUCKETS,
  BUCKET_LABELS,
  filterByBucket,
  getOrderTotals,
  getSourceFor,
};
