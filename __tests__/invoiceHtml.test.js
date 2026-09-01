/**
 * The invoice is a customer-facing financial document, so its numbers must
 * match the order exactly and its content must survive untrusted product names.
 */
import { buildInvoiceHtml } from '../src/utils/invoiceHtml';

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
        { sku_id: 'a', name: 'Red / M', totalQuantity: 3, price: 200 },
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

  it('omits optional charge rows that are absent', () => {
    const html = buildInvoiceHtml({ orderId: 'X', orderTotal: 500 });
    expect(html).not.toContain('China courier');
    expect(html).not.toContain('Discount');
  });
});
