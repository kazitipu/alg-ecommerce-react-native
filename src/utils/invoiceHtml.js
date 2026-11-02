import { getOrderTotals } from './dashboard';
import { formatPrice } from './format';

/**
 * The customer invoice, following the website's printable invoice
 * (`buy-and-ship-for-me/onlyInvoiceToPrint.js`): ALG's letterhead, "#PC-<id>",
 * the customer, the parcel details (shipping mark, carton, tracking), the goods
 * lines, weight × rate, previous payments, the web's breakdown of charges, the
 * service-charge note and a PAID stamp once `invoiceStatus` is Paid.
 *
 * The web printed through the browser (`react-to-print`), which has no mobile
 * equivalent, so the same content is produced as HTML here, previewed in a
 * WebView and converted to a PDF to share or save.
 *
 * Kept as pure functions so the numbers can be tested without a renderer.
 */

export const COMPANY = {
  name: 'ALG Limited',
  address: ['85/1 Purana Paltan Lane,', 'Culvert Road, Dhaka-1000. Bangladesh'],
  hotline: '+8801881934658',
  email: 'info@alg.com.bd',
};

const ACCENT = '#ff4a4e';

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const int = value => parseInt(value, 10) || 0;
const text = value => (value === undefined || value === null || typeof value === 'object' ? '' : String(value).trim());

/** Whether a record is a product request (`bookingRequest`) rather than an order. */
export const isProductRequest = (order, hint) =>
  typeof hint === 'boolean' ? hint : Boolean(order?.bookingId && !order?.orderId);

/** The invoice's number as the web prints it. */
export const invoiceNumber = order => `PC-${text(order?.orderId || order?.bookingId)}`;

/**
 * The goods lines: every sku of an order, or the single line of a product
 * request ("store - product type", quantity × unit price).
 */
export const invoiceLines = (order, isRequest) => {
  if (isRequest) {
    if (!order) return [];
    const quantity = int(order.productQuantity);
    const unit = parseFloat(order.unitPrice) || 0;
    const name = [text(order.store), text(order.productType)].filter(Boolean).join(' - ');
    return [{ name: name || 'Product request', variant: '', quantity, unit: int(unit), amount: int(unit * quantity) }];
  }
  return (Array.isArray(order?.items) ? order.items : []).flatMap(item =>
    (Array.isArray(item?.skus) ? item.skus : []).map(sku => {
      const quantity = int(sku?.totalQuantity);
      const unit = parseFloat(sku?.price) || 0;
      return {
        name: text(item?.name) || 'Product',
        variant: [text(sku?.color), text(sku?.size)].filter(Boolean).join(' / ') || text(sku?.name),
        quantity,
        unit: int(unit),
        amount: int(unit * quantity),
      };
    }),
  );
};

/**
 * The web's breakdown, row for row. "Subtotal" is the goods before coupon and
 * offer (`actualTotal`); the totals with and without shipping and the due
 * match the dashboard's `getOrderTotals`.
 */
export const invoiceTotals = (order, isRequest) => {
  const { total, paid, due } = getOrderTotals(order);
  const linesTotal = invoiceLines(order, isRequest).reduce((sum, line) => sum + line.amount, 0);
  const subtotal = int(order?.actualTotal) || linesTotal || int(order?.orderTotal);
  const coupon = int(order?.couponAmount);
  const offerDiscount = order?.offer ? Math.max(0, subtotal - coupon - int(order?.orderTotal)) : 0;
  const localShipping = int(order?.localShipping);
  const shipping = int(order?.shippingChargeCustomer);
  return {
    subtotal,
    repackaging: int(order?.otherCost),
    otherCharges: int(order?.otherCharges),
    discount: int(order?.discount),
    coupon,
    offerDiscount,
    withoutShipping: total - localShipping - shipping,
    localShipping,
    shipping,
    total,
    paid,
    due,
    refunded: int(order?.refund),
  };
};

/**
 * Who the invoice is for. The order's own delivery address comes first; the
 * web only had the customer's default shipping address, used here as the
 * fallback.
 */
export const billingContact = (order, user) => {
  const book = Array.isArray(user?.addressBook) ? user.addressBook : [];
  const address = (order?.deliveryAddress && typeof order.deliveryAddress === 'object' && order.deliveryAddress) ||
    book.find(entry => entry?.defaultShipping) ||
    {};
  const area = [address.thana, address.district, address.division].map(text).filter(Boolean).join(', ');
  return {
    name: text(user?.displayName) || text(address.name) || text(order?.displayName),
    address: text(address.address),
    area,
    mobile: text(address.mobileNo) || text(user?.mobileNo),
    email: text(user?.email),
  };
};

/** Parcel details shown beside the customer, as on the web. */
export const invoiceDetails = (order, isRequest) => [
  ['Submitted on', isRequest ? text(order?.date) || text(order?.orderedDate) : text(order?.orderedDate)],
  ['Invoice no', `#${invoiceNumber(order)}`],
  ['Order ID', text(order?.orderId || order?.bookingId)],
  ['Shipping mark', text(order?.shippingMark)],
  ['Carton no', text(order?.ctnNo).replace('CB', 'AR')],
  ['Tracking no', text(order?.trackingNo)],
];

/** Whether the admin has marked the invoice paid (the web's PAID stamp). */
export const isInvoicePaid = order => order?.invoiceStatus === 'Paid';

const money = value => escapeHtml(formatPrice(value));

const row = (label, value, { sign = '', strong = false, note = '' } = {}) => `
      <tr class="${strong ? 'strong' : ''}">
        <th>${escapeHtml(label)}${note ? ` <small>${escapeHtml(note)}</small>` : ''}</th>
        <td>${sign}${money(value)}</td>
      </tr>`;

export const buildInvoiceHtml = (order, { user = null, isRequest: hint, logo = '', paidStamp = '' } = {}) => {
  const isRequest = isProductRequest(order, hint);
  const lines = invoiceLines(order, isRequest);
  const sums = invoiceTotals(order, isRequest);
  const contact = billingContact(order, user);
  const details = invoiceDetails(order, isRequest);
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  // Not yet weighed shows a dash rather than "0 kg".
  const weight = parseFloat(order?.receivedWeight) ? text(order.receivedWeight) : '';
  const rate = parseFloat(order?.customerRate) ? text(order.customerRate) : '';

  const lineRows = lines.length
    ? lines
        .map(
          (line, index) => `
        <tr>
          <td class="idx">${index + 1}</td>
          <td class="name">${escapeHtml(line.name)}${line.variant ? `<div class="variant">${escapeHtml(line.variant)}</div>` : ''}</td>
          <td class="num">${line.quantity}pc</td>
          <td class="num">${money(line.unit)}</td>
          <td class="num">${money(line.amount)}</td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">No line items recorded.</td></tr>';

  const paymentRows = payments
    .map(
      payment => `
          <tr>
            <td>${escapeHtml(text(payment?.date))}</td>
            <td>${escapeHtml(text(payment?.method))}</td>
            <td class="num">${money(int(payment?.amount))}</td>
          </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: -apple-system, Roboto, Helvetica, sans-serif; color: #1f2340; background: #fff; font-size: 12px; }
  .sheet { position: relative; max-width: 820px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .logo { width: 140px; height: auto; display: block; }
  .brand { font-size: 22px; font-weight: 800; color: ${ACCENT}; }
  .company { margin-top: 6px; color: #6b6f85; line-height: 1.5; font-size: 11px; }
  .title { text-align: right; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: ${ACCENT}; color: #fff; font-weight: 800; letter-spacing: 2px; font-size: 13px; }
  .number { margin-top: 8px; font-size: 18px; font-weight: 800; word-break: break-all; }
  .rule { height: 3px; border-radius: 3px; margin: 14px 0; background: linear-gradient(90deg, #ff8a5c, ${ACCENT}, #e8344a); }
  .info { display: flex; gap: 12px; }
  .box { flex: 1; padding: 12px; border-radius: 12px; background: #f7f7fa; line-height: 1.55; }
  .box h3 { margin: 0 0 6px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #8a8ea3; }
  .box .who { font-weight: 800; font-size: 13px; }
  .kv { display: flex; justify-content: space-between; gap: 8px; }
  .kv span:first-child { color: #6b6f85; }
  .kv span:last-child { font-weight: 700; text-align: right; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; }
  .items { margin-top: 14px; border-radius: 12px; overflow: hidden; }
  .items th { background: ${ACCENT}; color: #fff; text-align: left; padding: 8px; font-size: 11px; }
  .items td { padding: 8px; border-bottom: 1px solid #eeeef3; vertical-align: top; }
  .items .idx { width: 24px; color: #8a8ea3; }
  .items .name { font-weight: 600; }
  .variant { margin-top: 2px; font-weight: 400; color: #8a8ea3; font-size: 11px; }
  .num { text-align: right; white-space: nowrap; }
  .empty { text-align: center; color: #8a8ea3; }
  .lower { display: flex; gap: 14px; margin-top: 14px; align-items: flex-start; }
  .left { flex: 1; }
  .facts .kv { padding: 4px 0; }
  .payments { margin-top: 12px; }
  .payments h4 { margin: 0 0 6px; color: ${ACCENT}; font-size: 12px; }
  .payments th { text-align: left; font-size: 10px; color: #8a8ea3; padding: 4px 6px; border-bottom: 1px solid #eeeef3; }
  .payments td { padding: 5px 6px; border-bottom: 1px solid #f3f3f6; }
  .sums { width: 52%; }
  .sums th { text-align: left; font-weight: 500; color: #4a4e66; padding: 5px 0; }
  .sums th small { font-size: 9px; color: #8a8ea3; }
  .sums td { text-align: right; padding: 5px 0; white-space: nowrap; font-weight: 600; }
  .sums tr.strong th, .sums tr.strong td { font-weight: 800; color: #1f2340; border-top: 1px solid #e4e4ec; }
  .sums tr.due th, .sums tr.due td { background: ${ACCENT}; color: #fff; font-weight: 800; padding: 8px 10px; }
  .sums tr.due th { border-radius: 10px 0 0 10px; }
  .sums tr.due td { border-radius: 0 10px 10px 0; }
  .foot { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .note { color: #6b6f85; font-size: 11px; }
  .thanks { padding: 6px 16px; border-radius: 999px; background: ${ACCENT}; color: #fff; font-weight: 800; letter-spacing: 2px; }
  .stamp { position: absolute; top: 46%; left: 22%; width: 180px; height: auto; opacity: 0.9; }
  @media (max-width: 560px) {
    .info, .lower { flex-direction: column; }
    .number { font-size: 14px; }
    .sums { width: 100%; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      ${logo ? `<img class="logo" src="${logo}" alt="${escapeHtml(COMPANY.name)}" />` : `<div class="brand">${escapeHtml(COMPANY.name)}</div>`}
      <div class="company">
        ${COMPANY.address.map(escapeHtml).join('<br />')}<br />
        Hotline: ${escapeHtml(COMPANY.hotline)}<br />
        ${escapeHtml(COMPANY.email)}
      </div>
    </div>
    <div class="title">
      <span class="badge">INVOICE</span>
      <div class="number">#${escapeHtml(invoiceNumber(order))}</div>
    </div>
  </div>

  <div class="rule"></div>

  <div class="info">
    <div class="box">
      <h3>To</h3>
      <div class="who">${escapeHtml(contact.name)}</div>
      ${contact.address ? `<div>${escapeHtml(contact.address)}</div>` : ''}
      ${contact.area ? `<div>${escapeHtml(contact.area)}</div>` : ''}
      ${contact.mobile ? `<div>Mobile: ${escapeHtml(contact.mobile)}</div>` : ''}
      ${contact.email ? `<div>${escapeHtml(contact.email)}</div>` : ''}
    </div>
    <div class="box">
      <h3>Details</h3>
      ${details
        .map(([label, value]) => `<div class="kv"><span>${escapeHtml(label)}</span><span>${escapeHtml(value || '—')}</span></div>`)
        .join('')}
    </div>
  </div>

  <table class="items">
    <thead>
      <tr><th>#</th><th>Product</th><th class="num">Quantity</th><th class="num">Unit price</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="lower">
    <div class="left">
      <div class="facts">
        <div class="kv"><span>Total weight</span><span>${escapeHtml(weight ? `${weight} kg` : '—')}</span></div>
        <div class="kv"><span>Customs &amp; shipping rate</span><span>${escapeHtml(rate ? `${rate} Tk/kg` : '—')}</span></div>
        <div class="kv"><span>Total shipping charge</span><span>${money(sums.shipping)}</span></div>
        ${sums.refunded ? `<div class="kv"><span>Refunded amount</span><span>${money(sums.refunded)}</span></div>` : ''}
      </div>
      ${
        payments.length
          ? `<div class="payments">
        <h4>Previous payments</h4>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th class="num">Amount</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
      </div>`
          : ''
      }
    </div>

    <table class="sums">
      <tbody>
      ${row('Subtotal', sums.subtotal)}
      ${row('Repackaging charge', sums.repackaging, { sign: '+' })}
      ${sums.otherCharges ? row('Other charges', sums.otherCharges, { sign: '+' }) : ''}
      ${row('Discount', sums.discount, { sign: '-' })}
      ${sums.coupon ? row('Coupon', sums.coupon, { sign: '-' }) : ''}
      ${sums.offerDiscount ? row('Discount on payment', sums.offerDiscount, { sign: '-' }) : ''}
      ${row('Total', sums.withoutShipping, { strong: true, note: '(without shipping charge)' })}
      ${row('Local shipping (CN)', sums.localShipping, { sign: '+' })}
      ${row('Shipping charge (CN to BD)', sums.shipping, { sign: '+' })}
      ${row('Total', sums.total, { strong: true, note: '(including shipping charge)' })}
      ${row('Total paid', sums.paid)}
      <tr class="due"><th>TOTAL BILL DUE</th><td>${money(sums.due)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="foot">
    <div class="note">******Freight, approx customs duty and 5% service charge included.</div>
    <div class="thanks">THANKS!</div>
  </div>

  ${isInvoicePaid(order) && paidStamp ? `<img class="stamp" src="${paidStamp}" alt="Paid" />` : ''}
</div>
</body>
</html>`;
};

export default buildInvoiceHtml;
