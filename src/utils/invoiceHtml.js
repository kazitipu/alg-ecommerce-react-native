import { colors } from '../theme';
import { getOrderTotals } from './dashboard';
import { formatDate, formatPrice } from './format';

/**
 * Renders an order as a printable HTML invoice.
 *
 * The web app used `react-to-print` to drive the browser's print dialog, which
 * has no mobile equivalent — so the same markup is produced here and converted
 * to a PDF the customer can share or save.
 *
 * Kept as a pure string builder so it can be tested without a renderer.
 */
const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const rowsFor = order =>
  (order.items || [])
    .flatMap(item =>
      (item.skus || []).map(sku => {
        const quantity = Number(sku.totalQuantity) || 0;
        const price = Number(sku.price) || 0;
        return `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(sku.name || sku.properties || '-')}</td>
            <td class="num">${quantity}</td>
            <td class="num">${formatPrice(price)}</td>
            <td class="num">${formatPrice(price * quantity)}</td>
          </tr>`;
      }),
    )
    .join('');

export const buildInvoiceHtml = (order, { companyName = 'ALG Limited' } = {}) => {
  const { total, paid, due } = getOrderTotals(order);
  const reference = order.orderId || order.bookingId || '';
  const address = order.deliveryAddress || {};

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, sans-serif; color: #222; padding: 24px; }
  h1 { color: ${colors.primary}; margin: 0 0 4px; font-size: 26px; }
  .muted { color: #777; font-size: 12px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid ${colors.primary}; padding-bottom: 12px; margin-bottom: 20px; }
  .ref { text-align: right; }
  .ref strong { font-size: 16px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; text-transform: uppercase; color: #777;
                letter-spacing: .5px; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #f5f5f5; padding: 8px; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-top: 16px; margin-left: auto; width: 260px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid #222; margin-top: 6px; padding-top: 8px;
                   font-weight: bold; font-size: 15px; }
  .due { color: ${colors.primary}; font-weight: bold; }
  footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;
           font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${escapeHtml(companyName)}</h1>
      <div class="muted">China sourcing &amp; freight forwarding</div>
    </div>
    <div class="ref">
      <div class="muted">Invoice</div>
      <strong>#${escapeHtml(reference)}</strong>
      <div class="muted">${escapeHtml(order.orderedDate || formatDate(order.time))}</div>
    </div>
  </div>

  <div class="section">
    <h2>Billed to</h2>
    <div>${escapeHtml(address.name || order.displayName || '')}</div>
    <div class="muted">${escapeHtml(address.address || '')}</div>
    <div class="muted">${escapeHtml(address.mobileNo || '')}</div>
  </div>

  <div class="section">
    <h2>Items</h2>
    <table>
      <thead>
        <tr>
          <th>Product</th><th>Variant</th>
          <th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rowsFor(order) || '<tr><td colspan="5">No line items recorded.</td></tr>'}</tbody>
    </table>
  </div>

  <div class="totals">
    <div><span>Goods total</span><span>${formatPrice(order.orderTotal || 0)}</span></div>
    ${order.localShipping ? `<div><span>China courier</span><span>${formatPrice(order.localShipping)}</span></div>` : ''}
    ${order.shippingChargeCustomer ? `<div><span>Shipping &amp; customs</span><span>${formatPrice(order.shippingChargeCustomer)}</span></div>` : ''}
    ${order.otherCost ? `<div><span>Other charges</span><span>${formatPrice(order.otherCost)}</span></div>` : ''}
    ${order.discount ? `<div><span>Discount</span><span>-${formatPrice(order.discount)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${formatPrice(total)}</span></div>
    <div><span>Paid</span><span>${formatPrice(paid)}</span></div>
    <div class="due"><span>Due</span><span>${formatPrice(due)}</span></div>
  </div>

  <footer>
    Thank you for shipping with ${escapeHtml(companyName)}.
    This invoice was generated from the ALG app.
  </footer>
</body>
</html>`;
};

export default buildInvoiceHtml;
