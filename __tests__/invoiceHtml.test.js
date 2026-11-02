/**
 * The invoice is a customer-facing financial document, so its numbers must
 * match the order exactly and its content must survive untrusted product names.
 */
import {
  billingContact,
  buildInvoiceHtml,
  invoiceLines,
  invoiceNumber,
  invoiceTotals,
  isProductRequest,
} from '../src/utils/invoiceHtml';

const order = {
  orderId: 'ORD-991',
  orderedDate: '01/02/2026',
  displayName: 'Kazi',
  orderTotal: 1000,
  localShipping: 100,
  shippingChargeCustomer: 300,
  otherCost: 50,
  discount: 200,
  payments: [{ amount: 500 }],
  deliveryAddress: { name: 'Kazi', address: 'Dhaka', mobileNo: '01700000000' },
  items: [
    {
      id: 'i1',
      name: 'Cotton shirt',
      skus: [
        { sku_id: 'a', color: 'Red', size: 'M', totalQuantity: 3, price: 200 },
        { sku_id: 'b', name: 'Red / L', totalQuantity: 2, price: 200 },
      ],
    },
  ],
};

describe('invoice content', () => {
  const html = buildInvoiceHtml(order);

  it('shows the reference, date and customer', () => {
    expect(html).toContain('ORD-991');
    expect(html).toContain('01/02/2026');
    expect(html).toContain('Dhaka');
    expect(html).toContain('01700000000');
  });

  it('lists every SKU as its own line', () => {
    expect(html).toContain('Cotton shirt');
    expect(html).toContain('Red / M');
    expect(html).toContain('Red / L');
  });

  it('computes the line amount as unit price x quantity', () => {
    // 3 x 200 = 600 and 2 x 200 = 400
    expect(html).toContain('Tk 600');
    expect(html).toContain('Tk 400');
  });

  it('totals surcharges minus discount, and shows paid and due', () => {
    // 1000 + 300 + 100 + 50 - 200 = 1250, less 500 paid leaves 750 due.
    expect(html).toContain('Tk 1,250');
    expect(html).toContain('Tk 500');
    expect(html).toContain('Tk 750');
  });

  it('is a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
  });
});

describe('robustness', () => {
  it('escapes markup in product names so the layout cannot be broken', () => {
    // Product titles come from a Chinese marketplace and are not trusted.
    const html = buildInvoiceHtml({
      ...order,
      items: [
        {
          id: 'i1',
          name: '<script>alert(1)</script>',
          skus: [{ sku_id: 'a', name: 'x', totalQuantity: 1, price: 1 }],
        },
      ],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders an order with no line items', () => {
    const html = buildInvoiceHtml({ orderId: 'EMPTY', items: [] });
    expect(html).toContain('No line items recorded.');
    expect(html).toContain('EMPTY');
  });

  it('falls back to the booking id for freight bookings', () => {
    expect(buildInvoiceHtml({ bookingId: 'BK-77' })).toContain('BK-77');
  });

  it('names variants by colour and size, not the raw sku id', () => {
    expect(invoiceLines({ items: [{ name: 'X', skus: [{ properties: '0:0', color: 'Blue', size: 'L', totalQuantity: 1, price: 1 }] }] }, false)[0].variant).toBe('Blue / L');
  });

  it('shows a dash for a parcel not yet weighed', () => {
    const html = buildInvoiceHtml({ orderId: 'W', receivedWeight: '0', customerRate: 0 });
    expect(html).not.toContain('0 kg');
    expect(html).not.toContain('0 Tk/kg');
  });

  it('omits the optional rows the web hides when absent', () => {
    const html = buildInvoiceHtml({ orderId: 'X', orderTotal: 500 });
    expect(html).not.toContain('Other charges');
    expect(html).not.toContain('Coupon');
    expect(html).not.toContain('Discount on payment');
    expect(html).not.toContain('Previous payments');
    expect(html).not.toContain('Refunded amount');
  });
});

describe('web parity', () => {
  const full = {
    ...order,
    actualTotal: 1100,
    couponAmount: 100,
    orderTotal: 1000,
    otherCharges: 40,
    receivedWeight: 2.5,
    customerRate: 120,
    shippingMark: 'ALG-77',
    ctnNo: 'CB_390-12',
    trackingNo: 'TRK-1',
    refund: 60,
    payments: [{ amount: 500, date: '02/02/2026', method: 'bKash' }],
  };

  it('numbers the invoice as #PC-<id> with the parcel details', () => {
    const html = buildInvoiceHtml(full);
    expect(invoiceNumber(full)).toBe('PC-ORD-991');
    expect(html).toContain('#PC-ORD-991');
    expect(html).toContain('ALG-77');
    expect(html).toContain('AR_390-12');
    expect(html).toContain('TRK-1');
    expect(html).toContain('2.5 kg');
    expect(html).toContain('120 Tk/kg');
    expect(html).toContain('Refunded amount');
  });

  it('carries the company letterhead and service-charge note', () => {
    const html = buildInvoiceHtml(full);
    expect(html).toContain('Purana Paltan');
    expect(html).toContain('+8801881934658');
    expect(html).toContain('5% service charge included');
  });

  it('breaks the money down as the web does', () => {
    const sums = invoiceTotals(full, false);
    expect(sums.subtotal).toBe(1100);
    expect(sums.coupon).toBe(100);
    expect(sums.otherCharges).toBe(40);
    // 1000 goods + 50 repackaging - 200 discount
    expect(sums.withoutShipping).toBe(850);
    // + 100 China courier + 300 shipping
    expect(sums.total).toBe(1250);
    expect(sums.paid).toBe(500);
    expect(sums.due).toBe(750);
  });

  it('shows the pay-now offer discount only for orders placed with an offer', () => {
    expect(invoiceTotals(full, false).offerDiscount).toBe(0);
    // 1100 - 100 coupon - 950 order total = 50 off for paying early
    expect(invoiceTotals({ ...full, offer: '5%', orderTotal: 950 }, false).offerDiscount).toBe(50);
  });

  it('lists previous payments', () => {
    const html = buildInvoiceHtml(full);
    expect(html).toContain('Previous payments');
    expect(html).toContain('02/02/2026');
    expect(html).toContain('bKash');
  });

  it('stamps PAID only when the invoice is marked paid', () => {
    expect(buildInvoiceHtml(full, { paidStamp: 'data:stamp' })).not.toContain('data:stamp');
    expect(buildInvoiceHtml({ ...full, invoiceStatus: 'Paid' }, { paidStamp: 'data:stamp' })).toContain('data:stamp');
  });

  it('bills a product request as one "store - type" line', () => {
    const request = { bookingId: 'BK-5', store: '1688', productType: 'Shoes', productQuantity: 4, unitPrice: '250.5', date: '03/03/2026' };
    expect(isProductRequest(request)).toBe(true);
    expect(invoiceLines(request, true)).toEqual([
      { name: '1688 - Shoes', variant: '', quantity: 4, unit: 250, amount: 1002 },
    ]);
    const html = buildInvoiceHtml(request);
    expect(html).toContain('1688 - Shoes');
    expect(html).toContain('03/03/2026');
  });

  it("falls back to the customer's default shipping address", () => {
    const user = {
      displayName: 'Tipu',
      email: 'a@b.c',
      addressBook: [
        { address: 'Old', defaultShipping: false },
        { name: 'Home', address: 'Road 1', thana: 'Motijheel', district: 'Dhaka', division: 'Dhaka', mobileNo: '018', defaultShipping: true },
      ],
    };
    expect(billingContact({ orderId: 1 }, user)).toEqual({
      name: 'Tipu',
      address: 'Road 1',
      area: 'Motijheel, Dhaka, Dhaka',
      mobile: '018',
      email: 'a@b.c',
    });
    // The order's own delivery address wins when it has one.
    expect(billingContact(order, user).address).toBe('Dhaka');
  });
});
