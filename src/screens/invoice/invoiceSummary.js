import { invoiceDetails, invoiceTotals, isInvoicePaid } from '../../utils/invoiceHtml';

const text = value => (value === undefined || value === null || typeof value === 'object' ? '' : String(value).trim());

/**
 * The invoice's state at a glance: Paid (marked by the admin, or nothing left
 * to pay), Partly paid, or Due — with how much of the total has been paid.
 */
export const invoiceStatus = (order, isRequest) => {
  const sums = invoiceTotals(order, isRequest);
  const progress = sums.total > 0 ? Math.min(1, Math.max(0, sums.paid / sums.total)) : 0;
  if (isInvoicePaid(order) || (sums.total > 0 && sums.due <= 0)) {
    return { key: 'paid', label: 'Paid', progress: 1 };
  }
  if (sums.paid > 0) return { key: 'partial', label: 'Partly paid', progress };
  return { key: 'due', label: 'Due', progress };
};

/** Facts for the summary, with the ids a customer may want to copy. */
const COPYABLE = new Set(['Invoice no', 'Order ID', 'Tracking no', 'Shipping mark', 'Carton no']);

export const invoiceFacts = (order, isRequest) => {
  const facts = invoiceDetails(order, isRequest)
    .filter(([, value]) => text(value))
    .map(([label, value]) => ({ label, value: text(value), copy: COPYABLE.has(label) }));
  const weight = parseFloat(order?.receivedWeight);
  const rate = parseFloat(order?.customerRate);
  if (weight) facts.push({ label: 'Total weight', value: `${text(order.receivedWeight)} kg`, copy: false });
  if (rate) facts.push({ label: 'Shipping rate', value: `${text(order.customerRate)} Tk/kg`, copy: false });
  return facts;
};

/** The breakdown rows, as on the printed invoice, skipping the optional zero rows. */
export const invoiceRows = (order, isRequest) => {
  const sums = invoiceTotals(order, isRequest);
  return [
    { key: 'subtotal', label: 'Subtotal', value: sums.subtotal },
    { key: 'repackaging', label: 'Repackaging charge', value: sums.repackaging, sign: '+' },
    sums.otherCharges ? { key: 'other', label: 'Other charges', value: sums.otherCharges, sign: '+' } : null,
    sums.discount ? { key: 'discount', label: 'Discount', value: sums.discount, sign: '-' } : null,
    sums.coupon ? { key: 'coupon', label: 'Coupon', value: sums.coupon, sign: '-' } : null,
    sums.offerDiscount ? { key: 'offer', label: 'Discount on payment', value: sums.offerDiscount, sign: '-' } : null,
    { key: 'withoutShipping', label: 'Total', note: 'without shipping', value: sums.withoutShipping, strong: true },
    { key: 'local', label: 'Local shipping (CN)', value: sums.localShipping, sign: '+' },
    { key: 'shipping', label: 'Shipping charge (CN to BD)', value: sums.shipping, sign: '+' },
    { key: 'total', label: 'Total', note: 'including shipping', value: sums.total, strong: true },
  ].filter(Boolean);
};
