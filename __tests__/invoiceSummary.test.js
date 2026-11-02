import { invoiceFacts, invoiceRows, invoiceStatus } from '../src/screens/invoice/invoiceSummary';

const order = {
  orderId: 'O-1',
  orderedDate: '01/11/2026',
  trackingNo: 'TRK',
  receivedWeight: '2.5',
  customerRate: 650,
  actualTotal: 1100,
  orderTotal: 1000,
  couponAmount: 100,
  shippingChargeCustomer: 300,
  localShipping: 100,
  payments: [{ amount: 500 }],
};

describe('invoice summary', () => {
  it('reads Due, Partly paid and Paid with the share paid', () => {
    expect(invoiceStatus({ ...order, payments: [] }, false)).toEqual({ key: 'due', label: 'Due', progress: 0 });
    expect(invoiceStatus(order, false)).toEqual({ key: 'partial', label: 'Partly paid', progress: 500 / 1400 });
    expect(invoiceStatus({ ...order, payments: [{ amount: 1400 }] }, false).key).toBe('paid');
    expect(invoiceStatus({ ...order, invoiceStatus: 'Paid' }, false).key).toBe('paid');
  });

  it('lists the filled facts, marking ids as copyable', () => {
    const facts = invoiceFacts(order, false);
    expect(facts.find(f => f.label === 'Invoice no')).toEqual({ label: 'Invoice no', value: '#PC-O-1', copy: true });
    expect(facts.find(f => f.label === 'Submitted on').copy).toBe(false);
    expect(facts.find(f => f.label === 'Shipping mark')).toBeUndefined();
    expect(facts.find(f => f.label === 'Total weight').value).toBe('2.5 kg');
  });

  it('keeps the printed breakdown, skipping zero optional rows', () => {
    const rows = invoiceRows(order, false);
    expect(rows.map(r => r.key)).toEqual(['subtotal', 'repackaging', 'coupon', 'withoutShipping', 'local', 'shipping', 'total']);
    expect(rows.find(r => r.key === 'total').value).toBe(1400);
  });
});
