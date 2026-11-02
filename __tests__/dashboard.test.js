/**
 * Dashboard lists and payment rules, following the website's Buy & Ship
 * pages: each section reads its own store and splits it by `orderStatus`.
 */
import {
  BUCKETS,
  canPay,
  canRefund,
  filterByBucket,
  filterByPayment,
  getOrderTotals,
  hasInvoice,
  minimumPayment,
  searchRecords,
  sourceFor,
  validatePayAmount,
} from '../src/utils/dashboard';

const withStatus = orderStatus => ({ orderId: orderStatus || 'none', orderStatus });

describe('sections and tabs, as on the website', () => {
  const orders = ['pending', 'Purchased', 'Reject', 'Received in Warehouse', 'Ready for fly', 'Bangladesh customs', 'Bangladesh warehouse', 'Alg warehouse', 'Delivered'].map(withStatus);
  const ids = list => list.map(o => o.orderStatus);

  it('splits My orders into pending, purchased and rejected', () => {
    expect(ids(filterByBucket(orders, BUCKETS.ORDERS, 'pending'))).toEqual(['pending']);
    expect(ids(filterByBucket(orders, BUCKETS.ORDERS, 'purchased'))).toEqual(['Purchased']);
    expect(ids(filterByBucket(orders, BUCKETS.ORDERS, 'rejected'))).toEqual(['Reject']);
  });

  it('splits forwarding orders into abroad and in Bangladesh', () => {
    expect(ids(filterByBucket(orders, BUCKETS.FORWARDING, 'abroad'))).toEqual([
      'Received in Warehouse', 'Ready for fly', 'Bangladesh customs', 'Bangladesh warehouse',
    ]);
    expect(ids(filterByBucket(orders, BUCKETS.FORWARDING, 'bangladesh'))).toEqual(['Alg warehouse']);
    expect(filterByBucket(orders, BUCKETS.FORWARDING)).toHaveLength(5);
  });

  it('lists only delivered orders under Delivered', () => {
    expect(ids(filterByBucket(orders, BUCKETS.DELIVERED))).toEqual(['Delivered']);
  });

  it('splits product requests into pending, approved and delivered', () => {
    const requests = ['Pending', 'Rates Provided', 'Purchased', 'Reject', 'Delivered'].map(withStatus);
    expect(ids(filterByBucket(requests, BUCKETS.REQUESTS, 'pending'))).toEqual(['Pending']);
    expect(ids(filterByBucket(requests, BUCKETS.REQUESTS, 'approved'))).toEqual(['Rates Provided', 'Purchased']);
    expect(ids(filterByBucket(requests, BUCKETS.REQUESTS, 'delivered'))).toEqual(['Delivered']);
  });

  it('reads requests from product requests and everything else from orders', () => {
    expect(sourceFor(BUCKETS.REQUESTS)).toBe('bookings');
    expect(sourceFor(BUCKETS.ORDERS)).toBe('ordersApi');
    expect(sourceFor(BUCKETS.FORWARDING)).toBe('ordersApi');
    expect(sourceFor(BUCKETS.DELIVERED)).toBe('ordersApi');
  });

  it('handles an empty or missing list', () => {
    expect(filterByBucket(undefined, BUCKETS.ORDERS)).toEqual([]);
  });
});

describe('search and payment filter', () => {
  const list = [
    { orderId: 111, paymentStatus: 'Paid', trackingNo: 'TRK9', items: [{ productType: 'Shoes' }] },
    { orderId: 222, paymentStatus: 'Partially Paid', orderedDate: '02/11/2026' },
    { orderId: 333, paymentStatus: 'purchaseLater' },
    { orderId: 444 },
  ];

  it('filters by payment status, with Not paid covering purchase-later and blank', () => {
    expect(filterByPayment(list, 'Paid').map(o => o.orderId)).toEqual([111]);
    expect(filterByPayment(list, 'Partially Paid').map(o => o.orderId)).toEqual([222]);
    expect(filterByPayment(list, 'unpaid').map(o => o.orderId)).toEqual([333, 444]);
    expect(filterByPayment(list, 'all')).toHaveLength(4);
  });

  it('searches order id, tracking no., date and product type', () => {
    expect(searchRecords(list, '222').map(o => o.orderId)).toEqual([222]);
    expect(searchRecords(list, 'trk9').map(o => o.orderId)).toEqual([111]);
    expect(searchRecords(list, '02/11').map(o => o.orderId)).toEqual([222]);
    expect(searchRecords(list, 'shoe').map(o => o.orderId)).toEqual([111]);
    expect(searchRecords(list, '  ')).toHaveLength(4);
  });
});

describe('pay and refund rules', () => {
  it('offers Pay only with something due and no payment awaiting confirmation', () => {
    expect(canPay({ orderTotal: 500 }, BUCKETS.ORDERS)).toBe(true);
    expect(canPay({ orderTotal: 500, paymentStatus: 'pending' }, BUCKETS.ORDERS)).toBe(false);
    expect(canPay({ orderTotal: 500, paymentStatus: 'Paid' }, BUCKETS.ORDERS)).toBe(false);
    expect(canPay({ orderTotal: 500, payments: [{ amount: 500 }] }, BUCKETS.ORDERS)).toBe(false);
  });

  it('needs a product request to be priced (past stage 1) before it can be paid', () => {
    expect(canPay({ orderTotal: 500, shipmentStatusScore: 1 }, BUCKETS.REQUESTS)).toBe(false);
    expect(canPay({ orderTotal: 500, shipmentStatusScore: 2 }, BUCKETS.REQUESTS)).toBe(true);
  });

  it('offers a quick refund only on paid or partly paid records without one already', () => {
    expect(canRefund({ paymentStatus: 'Paid' })).toBe(true);
    expect(canRefund({ paymentStatus: 'Partially Paid' })).toBe(true);
    expect(canRefund({ paymentStatus: 'Paid', refundStatus: 'requested' })).toBe(false);
    expect(canRefund({ paymentStatus: 'purchaseLater' })).toBe(false);
  });

  it('asks for 100% on a first bank deposit for an order, 60% otherwise, anything after', () => {
    expect(minimumPayment({ kind: 'order', method: 'deposit', due: 1000, paid: 0 })).toBe(1000);
    expect(minimumPayment({ kind: 'order', method: 'bkash', due: 1000, paid: 0 })).toBe(600);
    expect(minimumPayment({ kind: 'request', method: 'deposit', due: 1000, paid: 0 })).toBe(600);
    expect(minimumPayment({ kind: 'order', method: 'deposit', due: 400, paid: 600 })).toBe(1);
  });

  it('checks the amount with the website messages', () => {
    const base = { due: 1000, minimum: 600, kind: 'order', method: 'bkash' };
    expect(validatePayAmount({ ...base, amount: 0 })).toBe("Amount to pay now can't be 0");
    expect(validatePayAmount({ ...base, amount: 1200 })).toBe("Amount to pay now can't be more than due amount.");
    expect(validatePayAmount({ ...base, amount: 500 })).toBe("Payable amount can't be less than 60% of the due amount");
    expect(validatePayAmount({ ...base, amount: 700 })).toBeNull();
    expect(validatePayAmount({ ...base, method: 'deposit', minimum: 1000, amount: 700 })).toBe(
      "Payable amount can't be less than 100% of the due amount",
    );
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

  it('falls back to the sku total when there is no orderTotal, as the web does', () => {
    const order = { items: [{ skus: [{ price: '120.5', totalQuantity: 2 }] }], localShipping: 50 };
    expect(getOrderTotals(order).total).toBe(291);
  });
});

describe('invoice link', () => {
  it('shows only once the shipping charge is set, as on the web', () => {
    expect(hasInvoice({ shippingChargeCustomer: 0 })).toBe(false);
    expect(hasInvoice({})).toBe(false);
    expect(hasInvoice({ shippingChargeCustomer: '450' })).toBe(true);
  });
});
