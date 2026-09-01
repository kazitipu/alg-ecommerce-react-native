/**
 * Every external endpoint and credential the app talks to, in one place.
 *
 * The web app scattered these across ~15 files and hardcoded `localhost:5000`
 * for SSLCommerz in four payment modals (a bug that breaks card payments in
 * production). Centralising them here fixes that and makes the RedX token —
 * currently shipped in client code — a single thing to move server-side later.
 */

/** Firebase project `alg-ecommerce-a9a51` — the same database the website uses. */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDI5Ykwrz1CgsnOGCycihu8aQZhYR3bS30',
  authDomain: 'alg-ecommerce-a9a51.firebaseapp.com',
  projectId: 'alg-ecommerce-a9a51',
  storageBucket: 'alg-ecommerce-a9a51.firebasestorage.app',
  messagingSenderId: '224053311224',
  appId: '1:224053311224:web:c36a85b78dcad4b3ceed0d',
  measurementId: 'G-Q7XRK7NGBL',
};

/** Primary backend: product sourcing, OTP SMS and payment session creation. */
export const API_BASE = 'https://alg.com.bd';

export const ENDPOINTS = {
  product: id => `${API_BASE}/api/products/${id}`,
  search: `${API_BASE}/api/products/search`,
  searchByImage: `${API_BASE}/api/products/search-by-image`,
  vendorProducts: `${API_BASE}/api/products/vendor-products`,
  category: `${API_BASE}/api/products/category`,
  shipping: `${API_BASE}/api/products/shipping`,
  uploadImage: `${API_BASE}/api/products/upload-image`,

  sendOtp: phone => `${API_BASE}/api/v1/otp-sms-send/${phone}`,
  verifyOtp: phone => `${API_BASE}/api/v1/verify-otp/+88${phone}`,

  bkashCreatePayment: `${API_BASE}/api/v1/bkash/create-payment`,
  // the web app points three of its four payment modals at localhost:5000 here
  sslCommerzInit: `${API_BASE}/init-sslCommerz`,

  setBooking: 'https://alglimited.com/api/v1/alg-set-booking',
};

/** Legacy 1688/Taobao product-detail proxy still used by two detail screens. */
export const LEGACY_PRODUCT_API = 'https://globalbuybd.com/singleProduct';

/**
 * RedX courier — parcel tracking and BD delivery-charge estimation.
 * The bearer token is embedded in the web client too; it belongs behind our own
 * backend, but keeping it here preserves current behaviour and confines the fix
 * to one file.
 */
export const REDX = {
  baseUrl: 'https://openapi.redx.com.bd/v1.0.0-beta',
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Njg5NDEiLCJpYXQiOjE3NTM4ODAxNTksImlzcyI6IkZVT2VESWVSZzlwdDRmeGUzSmRYb2tmNnZPYVFBYk1TIiwic2hvcF9pZCI6NzY4OTQxLCJ1c2VyX2lkIjoxMTY3ODQ1fQ.hDlvRuwKit8rpfz2ETnsfPW2lXT-JZS_2ZBZsMdvTfk',
};

/**
 * Payment gateways redirect back to these web URLs when done. The RN app loads
 * the gateway in a WebView and pops it as soon as navigation reaches one of
 * them, reading `?paymentStatus=` off the query string.
 */
export const PAYMENT_RETURN_URLS = [
  `${API_BASE}/pages/dashboard/buy-and-ship-for-me/my-orders`,
  `${API_BASE}/pages/dashboard/buy-and-ship-for-me/my-request`,
  `${API_BASE}/pages/dashboard/ship-for-me/my-request`,
];

/**
 * OAuth *web* client id from the Firebase console — not the Android one.
 * `@react-native-google-signin` exchanges it for a Firebase credential, and
 * Google rejects the Android client id here. Read from the `client_type: 3`
 * entry in `android/app/google-services.json`.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '224053311224-73ip4v7h1fklgr7va3eg593acgcbsp7s.apps.googleusercontent.com';

export const CONTACT = {
  hotline: '+8801881934658',
  whatsapp: '+8801881934658',
  facebookPageId: '1460172221038797',
  email: 'info@alg.com.bd',
};

/** Manual "Direct Deposit" details shown in the payment sheet. */
export const BANK_DETAILS = {
  cityBankAccount: '1223250557001',
  cityBankRouting: '225276851',
  bkashMerchant: '01881934658',
};

export const DEFAULTS = {
  currencySymbol: 'Tk',
  /** China-local courier fallback when a product has no category rate. */
  shippingRate: 750,
  /** BD delivery fallback when the RedX estimate fails. */
  deliveryCharge: 100,
  /** The web search stops paging at 300 results; mirrored so counts match. */
  maxSearchResults: 300,
  /** Card payments carry a 2.5% gateway fee, applied client-side on the web. */
  sslCommerzFeePercent: 2.5,
};

export const CACHE_TTL = {
  /** Home banners/categories/campaigns. */
  home: 10 * 60 * 1000,
  /** Search result pages. */
  search: 5 * 60 * 1000,
};

export default {
  FIREBASE_CONFIG,
  API_BASE,
  ENDPOINTS,
  LEGACY_PRODUCT_API,
  REDX,
  PAYMENT_RETURN_URLS,
  GOOGLE_WEB_CLIENT_ID,
  CONTACT,
  BANK_DETAILS,
  DEFAULTS,
  CACHE_TTL,
};
