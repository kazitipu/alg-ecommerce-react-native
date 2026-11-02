/**
 * The order details page shows what the website's Buy & Ship rows show.
 */
import { canPay } from '../src/utils/dashboard';
import {
  chargeBreakdown,
  detailLines,
  orderFacts,
  orderSummaryText,
  paidShare,
  refundState,
  showsProgress,
  statusLabel,
  warehousePhoto,
} from '../src/utils/orderDetails';

const order = {
  orderId: 'O-1',
  orderedDate: '02/11/2026',
  orderedTime: '10:00:00 AM',
  shopName: 'Shop',
  orderStatus: 'Purchased',
  orderNumber: 'SUB-9',
  trackingNo: 'TRK',
  customerRate: 650,
  imageUrl: 'https://img/warehouse.jpg',
  orderTotal: 1000,
  localShipping: 100,
  shippingChargeCustomer: 300,
  otherCost: 50,
  discount: 200,
  payments: [{ amount: 500, date: '03/11/2026', method: 'bKash', paymentId: 7 }],
  items: [
    {
      id: 'i1',
      name: 'Jacket',
      picture: 'https://img/item.jpg',
      productType: 'Clothes',
      shippingRate: 700,
      propertyNames: ['Colour family', 'Size'],
      skus: [
        { sku_id: 'a', color: 'Red', size: 'M', price: '200.6', totalQuantity: 3, image: 'https://img/red.jpg' },
        { sku_id: 'b', color: 'Blue', price: 200, totalQuantity: 2 },
      ],
    },
  ],
};

describe('order facts', () => {
  it("lists the web row's header for orders", () => {
    const facts = Object.fromEntries(orderFacts(order, false).map(f => [f.label, f.value]));
    expect(facts).toEqual({
      'Order ID': 'O-1',
      'Ordered on': '02/11/2026 · 10:00:00 AM',
      Shop: 'Shop',
      'Order status': 'Purchased',
      'Suborder ID': 'SUB-9',
      'Tracking no': 'TRK',
    });
  });

  it('calls a request at "Bangladesh warehouse" Custom released, as the web does', () => {
    expect(statusLabel({ orderStatus: 'Bangladesh warehouse' }, true)).toBe('Custom released');
    expect(statusLabel({ orderStatus: 'Bangladesh warehouse' }, false)).toBe('Bangladesh warehouse');
  });
});

describe('goods lines', () => {
  it('has one line per sku, labelled with the product property names', () => {
    const [first, second] = detailLines(order, false);
    expect(first).toMatchObject({
      image: 'https://img/red.jpg',
      name: 'Jacket',
      productType: 'Clothes',
      variants: [
        { label: 'Colour family', value: 'Red' },
        { label: 'Size', value: 'M' },
      ],
      unit: 200,
      quantity: 3,
      amount: 601,
    });
    expect(second.image).toBe('https://img/item.jpg');
    expect(second.variants).toEqual([{ label: 'Colour family', value: 'Blue' }]);
  });

  it("uses the agreed customer rate, else the product's quoted rate", () => {
    expect(detailLines(order, false)[0].shippingRate).toBe('650 Tk/kg');
    expect(detailLines({ ...order, customerRate: undefined }, false)[0].shippingRate).toBe('700 Tk/kg');
  });

  it("reads both the web's and the app's product-request fields", () => {
    const [web] = detailLines({ bookingId: 'B', store: '1688', productType: 'Shoes', productQuantity: 4, unitPrice: 250, productVariant: 'Black 42', note: 'Gift' }, true);
    expect(web).toMatchObject({ name: '1688 - Shoes', quantity: 4, amount: 1000, note: 'Gift', variants: [{ label: 'Variant', value: 'Black 42' }] });
    const [app] = detailLines({ bookingId: 'B', productName: 'Lamp', productLink: 'https://x', quantity: '2', notes: 'Warm' }, true);
    expect(app).toMatchObject({ name: 'Lamp', link: 'https://x', quantity: 2, note: 'Warm' });
  });
});

describe('money', () => {
  it('breaks the total down and lists payments', () => {
    const money = chargeBreakdown(order);
    expect(money.rows.map(r => [r.label, r.value])).toEqual([
      ['Goods', 1000],
      ['China courier', 100],
      ['Customs & shipping', 300],
      ['Repackaging charge', 50],
      ['Discount', 200],
    ]);
    expect(money.total).toBe(1250);
    expect(money.paid).toBe(500);
    expect(money.due).toBe(750);
    expect(money.payments).toEqual([{ key: '7', date: '03/11/2026', method: 'bKash', amount: 500 }]);
  });

  it('reports refund status and amount', () => {
    expect(refundState(order)).toBeNull();
    expect(refundState({ refundStatus: 'rejected' })).toEqual({ status: 'rejected', amount: 0, rejected: true });
    expect(refundState({ refund: '300' })).toMatchObject({ amount: 300 });
  });
});

describe('rejected and photos', () => {
  it('hides progress and Pay once rejected, as the web does', () => {
    const rejected = { ...order, orderStatus: 'Reject', paymentStatus: 'Not paid' };
    expect(showsProgress(rejected)).toBe(false);
    expect(canPay(rejected, 'orders')).toBe(false);
    expect(showsProgress(order)).toBe(true);
  });

  it("shows the warehouse photo for orders only (a request's imageUrl is the product)", () => {
    expect(warehousePhoto(order, false)).toBe('https://img/warehouse.jpg');
    expect(warehousePhoto(order, true)).toBe('');
  });
});

describe('summary and progress', () => {
  it('works out the share paid, clamped to 0–1', () => {
    expect(paidShare({ total: 1000, paid: 250 })).toBe(0.25);
    expect(paidShare({ total: 0, paid: 0 })).toBe(0);
    expect(paidShare({ total: 100, paid: 500 })).toBe(1);
  });

  it('builds a shareable plain-text summary', () => {
    const text = orderSummaryText({ record: order, isRequest: false, symbol: 'Tk' });
    expect(text).toContain('ALG order');
    expect(text).toContain('Order ID: O-1');
    expect(text).toContain('Tracking no: TRK');
    expect(text).toContain('Items: 2 lines, 5 pcs');
    expect(text).toContain('Total: Tk 1,250');
    expect(text).toContain('Due: Tk 750');
  });
});

describe('weight with the shipping charge', () => {
  it('shows the weighed parcel and rate beside customs & shipping, as the web does', () => {
    const rows = chargeBreakdown({ orderTotal: 1000, shippingChargeCustomer: 1625, receivedWeight: '2.5', customerRate: 650 }).rows;
    expect(rows.find(r => r.key === 'shipping').hint).toBe('Total weight 2.5 kg × 650 Tk/kg');
    expect(chargeBreakdown({ orderTotal: 1000, shippingChargeCustomer: 100 }).rows.find(r => r.key === 'shipping').hint).toBe('');
  });
});
