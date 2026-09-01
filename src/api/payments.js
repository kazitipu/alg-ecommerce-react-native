import client from './client';

/**
 * Both gateways use the same shape: post the order, get a hosted checkout URL
 * back, then load it. The web app redirected the whole page with
 * `window.open(url, '_self')`; the app opens it in `PaymentWebViewScreen` and
 * watches for the return URL instead.
 */

/** Returns `{ bkashURL }`. */
export const createBkashPayment = async payload => {
  const { data } = await client.post('/api/v1/bkash/create-payment', payload);
  return data;
};

/**
 * Returns the SSLCommerz redirect URL as a plain string.
 *
 * Three of the web app's four payment modals posted this to
 * `http://localhost:5000/init-sslCommerz`, a leftover dev URL that fails in
 * production. Routing it through the shared client fixes that.
 */
export const initSslCommerz = async ({ name, amount, from }) => {
  const { data } = await client.post('/init-sslCommerz', { name, amount, from });
  return data;
};
