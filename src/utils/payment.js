import { PAYMENT_RETURN_URLS } from '../constants/config';

/**
 * Detects the gateway's redirect back into the app.
 *
 * bKash and SSLCommerz both finish by redirecting to one of our web URLs with
 * `?paymentStatus=` on it. The WebView watches every navigation for that, which
 * is how the app knows a payment finished without leaving the app.
 *
 * Returns the status string when the URL is a return URL, otherwise null.
 * A return URL with no status is treated as success, matching the web app's
 * behaviour of showing the order list on any redirect back.
 */
export const parsePaymentReturn = (url, returnUrls = PAYMENT_RETURN_URLS) => {
  if (!url) return null;

  const isReturnUrl = returnUrls.some(returnUrl => url.startsWith(returnUrl));
  if (!isReturnUrl) return null;

  const match = url.match(/[?&]paymentStatus=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : 'success';
};

export default { parsePaymentReturn };
