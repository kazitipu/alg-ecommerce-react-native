import {
  asText,
  bucketCounts,
  flowSummary,
  orderPieces,
  orderThumbs,
  paymentStateOf,
  stageOf,
} from '../src/screens/dashboard/components/orderHelpers';
import { BUCKETS } from '../src/utils/dashboard';
import { FLOWS } from '../src/navigation/routes';

describe('order helpers', () => {
  it('labels stages and clamps odd scores', () => {
    expect(stageOf({ shipmentStatusScore: 4 }).label).toBe('Ready to Fly');
    expect(stageOf({ shipmentStatusScore: '7' }).label).toBe('Delivered');
    expect(stageOf({}).label).toBe('Pending');
    expect(stageOf({ shipmentStatusScore: 99 }).score).toBe(7);
  });

  it('reads payment state from status and amounts', () => {
    expect(paymentStateOf({ orderTotal: 100, payments: [{ amount: 100 }] }).label).toBe('Paid');
    expect(paymentStateOf({ orderTotal: 100, paymentStatus: 'pending' }).label).toBe('Payment pending');
    expect(paymentStateOf({ orderTotal: 100, payments: [{ amount: 40 }] }).label).toBe('Partly paid');
    expect(paymentStateOf({ orderTotal: 100 }).label).toBe('Unpaid');
  });

  it('never turns objects into text, and collects real picture URLs only', () => {
    expect(asText({ a: 1 })).toBe('');
    expect(asText(12)).toBe('12');
    const order = {
      items: [
        { picture: 'https://x/a.jpg', skus: [{ image: 'https://x/b.jpg', totalQuantity: '3' }, { image: { bad: true }, totalQuantity: 2 }] },
      ],
    };
    expect(orderThumbs(order)).toEqual(['https://x/a.jpg', 'https://x/b.jpg']);
    expect(orderPieces(order)).toBe(5);
    expect(orderThumbs({ items: null })).toEqual([]);
  });

  it('counts each section the way the website lists it', () => {
    const sources = {
      ordersApi: [{ orderStatus: 'pending' }, { orderStatus: 'Purchased' }, { orderStatus: 'Ready for fly' }, { orderStatus: 'Delivered' }],
      bookings: [{ orderStatus: 'Pending' }, { orderStatus: 'Rates Provided' }],
    };
    expect(bucketCounts(FLOWS.BUY_AND_SHIP, sources)).toEqual({
      [BUCKETS.REQUESTS]: 2,
      [BUCKETS.ORDERS]: 2,
      [BUCKETS.FORWARDING]: 1,
      [BUCKETS.DELIVERED]: 1,
    });
  });

  it('summarises a flow: all records, in transit, and money due', () => {
    const sources = {
      ordersApi: [{ orderStatus: 'Ready for fly', orderTotal: 500, payments: [{ amount: 200 }] }],
      bookings: [{ orderStatus: 'Pending', orderTotal: 100 }],
    };
    expect(flowSummary(FLOWS.BUY_AND_SHIP, sources)).toEqual({ total: 2, inTransit: 1, due: 400 });
  });
});

describe('paying and refunding existing orders', () => {
  const { buildExistingPayment } = require('../src/utils/order');
  const { buildRefundRequest } = require('../src/screens/dashboard/components/RefundSheet');
  const { orderNotice } = require('../src/screens/dashboard/TrackingDetailsScreen');
  const user = { id: 'u1', displayName: 'Kazi' };

  it('files an order payment with the web modal fields', () => {
    const order = { orderId: 1, orderTotal: 1000, items: [{ skus: [{ price: 10, totalQuantity: 2 }] }] };
    const payment = buildExistingPayment({
      existing: { kind: 'order', total: 1200, paid: 200, due: 1000 },
      records: [order],
      currentUser: user,
      method: 'Bkash',
      payableTotal: 600,
      taka: 17,
    });
    expect(payment).toMatchObject({
      status: 'pending',
      amount: 600,
      method: 'Bkash',
      offer: '',
      payNowPercent: '60.00%',
      payableTotal: 600,
      total: 1000,
      actualTotal: 340,
      actualTotalAfterCouponAdd: 1000,
      payableTotalWithGatewayCharge: 609,
      couponAmount: 0,
      pendingOrders: [order],
      userId: 'u1',
    });
  });

  it('files a product request payment against productRequestArray, with no bank fee', () => {
    const request = { bookingId: 'b1', orderTotal: 500 };
    const payment = buildExistingPayment({
      existing: { kind: 'request', total: 500, paid: 0, due: 500 },
      records: [request],
      currentUser: user,
      method: 'City',
      payableTotal: 300,
    });
    expect(payment.productRequestArray).toEqual([request]);
    expect(payment.payableTotalWithGatewayCharge).toBe(300);
    expect(payment.actualTotal).toBe(500);
  });

  it('marks refunds the way the web does for orders and requests', () => {
    const base = { order: { orderId: 1 }, reason: 'Out of stock', paymentMethod: 'Bkash', bankInfo: ' 01711 ', now: 5 };
    expect(buildRefundRequest(base)).toEqual({ ...base, bankInfo: '01711', refundId: 5, quickRefund: true, now: undefined });
    expect(buildRefundRequest({ ...base, isRequest: true })).toMatchObject({ productRequest: true, refundId: 5 });
  });

  it('explains pending, rejected, not-yet-ordered and not-yet-shipped orders', () => {
    expect(orderNotice({ orderId: 1, orderStatus: 'pending' }).title).toBe('Your order is still being processed.');
    expect(orderNotice({ orderId: 1, orderStatus: 'Reject' }).title).toBe('Your order has been rejected.');
    expect(orderNotice({ orderId: 1, orderStatus: 'Purchased' }).title).toBe('Your order has not been ordered yet.');
    expect(orderNotice({ orderId: 1, orderStatus: 'Purchased', orderNumber: 'N1' }).title).toBe('No logistics yet');
    expect(orderNotice({ orderId: 1, orderStatus: 'Purchased', orderNumber: 'N1', trackingNo: 'T1' })).toBeNull();
  });
});
