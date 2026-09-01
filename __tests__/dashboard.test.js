/**
 * Dashboard bucketing and payment maths.
 *
 * The four stage tabs are filters over `shipmentStatusScore`, and the amounts
 * shown decide what a customer is asked to pay — so both are pinned here.
 */
import {
  BUCKETS,
  filterByBucket,
  getOrderTotals,
  getSourceFor,
} from '../src/utils/dashboard';
import { FLOWS } from '../src/navigation/routes';

const atStage = score => ({ orderId: `o${score}`, shipmentStatusScore: score });
const ALL_STAGES = [1, 2, 3, 4, 5, 6, 7].map(atStage);

describe('stage buckets', () => {
  it('puts pending and approved into requests', () => {
    const requests = filterByBucket(ALL_STAGES, BUCKETS.REQUESTS);
    expect(requests.map(o => o.shipmentStatusScore)).toEqual([1, 2]);
  });

  it('puts everything in transit into forwarding', () => {
    // Abroad warehouse, ready to fly, customs, ALG warehouse.
    const forwarding = filterByBucket(ALL_STAGES, BUCKETS.FORWARDING);
    expect(forwarding.map(o => o.shipmentStatusScore)).toEqual([3, 4, 5, 6]);
  });

  it('puts only stage 7 into delivered', () => {
    const delivered = filterByBucket(ALL_STAGES, BUCKETS.DELIVERED);
    expect(delivered.map(o => o.shipmentStatusScore)).toEqual([7]);
  });

  it('covers every stage across requests, forwarding and delivered', () => {
    const covered = [
      ...filterByBucket(ALL_STAGES, BUCKETS.REQUESTS),
      ...filterByBucket(ALL_STAGES, BUCKETS.FORWARDING),
      ...filterByBucket(ALL_STAGES, BUCKETS.DELIVERED),
    ].map(o => o.shipmentStatusScore);
    expect(covered.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('treats a missing score as stage zero and shows nothing for it', () => {
    expect(filterByBucket([{ orderId: 'x' }], BUCKETS.DELIVERED)).toEqual([]);
    expect(filterByBucket([{ orderId: 'x' }], BUCKETS.FORWARDING)).toEqual([]);
  });

  it('handles an empty or missing list', () => {
    expect(filterByBucket([], BUCKETS.REQUESTS)).toEqual([]);
    expect(filterByBucket(undefined, BUCKETS.REQUESTS)).toEqual([]);
  });
});

describe('order totals', () => {
  it('adds every surcharge and subtracts the discount', () => {
    const totals = getOrderTotals({
      orderTotal: 1000,
      shippingChargeCustomer: 300,
      localShipping: 100,
      otherCost: 50,
      discount: 200,
      payments: [],
    });
    expect(totals.total).toBe(1250);
  });

  it('sums verified payments into paid, and derives what is due', () => {
    const totals = getOrderTotals({
      orderTotal: 1000,
      payments: [{ amount: 300 }, { amount: 200 }],
    });
    expect(totals.paid).toBe(500);
    expect(totals.due).toBe(500);
  });

  it('never shows a negative amount due on an overpayment', () => {
    const totals = getOrderTotals({
      orderTotal: 500,
      payments: [{ amount: 900 }],
    });
    expect(totals.due).toBe(0);
  });

  it('copes with an order that has no payments or costs yet', () => {
    expect(getOrderTotals({})).toEqual({ total: 0, paid: 0, due: 0 });
  });
});

describe('data source per flow', () => {
  it('reads ship-for-me from its own collection', () => {
    expect(getSourceFor(FLOWS.SHIP_FOR_ME, BUCKETS.ORDERS)).toBe('shipForMe');
    expect(getSourceFor(FLOWS.SHIP_FOR_ME, BUCKETS.REQUESTS)).toBe('shipForMe');
  });

  it('splits buy-and-ship between orders and requests', () => {
    expect(getSourceFor(FLOWS.BUY_AND_SHIP, BUCKETS.ORDERS)).toBe('ordersApi');
    expect(getSourceFor(FLOWS.BUY_AND_SHIP, BUCKETS.REQUESTS)).toBe('bookingRequest');
  });
});
