/**
 * Every screen in the app, mapped from the web app's 45 routes.
 *
 * The `webPath` comments record where each screen came from so the two apps can
 * be compared side by side, and so deep links can be built later.
 */

export const ROUTES = {
  // Auth — presented as a modal group over whatever the user was doing
  LOGIN: 'Login', // /pages/login
  REGISTER: 'Register', // /pages/register
  FORGOT_PASSWORD: 'ForgotPassword', // /pages/forget-password
  OTP_VERIFY: 'OtpVerify', // OtpModal

  // Tabs
  TAB_HOME: 'HomeTab',
  TAB_CATEGORY: 'CategoryTab',
  TAB_CART: 'CartTab',
  TAB_ORDERS: 'OrdersTab',
  TAB_ACCOUNT: 'AccountTab',

  // Shopping
  HOME: 'Home', // /
  COLLECTION: 'Collection', // /collection/:id
  SEARCH: 'Search', // header search
  VENDOR_PRODUCTS: 'VendorProducts', // shop listing
  PRODUCT_DETAIL: 'ProductDetail', // /product/:id
  PRODUCT_1688: 'Product1688', // /1688/:id
  PRODUCT_TAOBAO: 'ProductTaobao', // /taobao/:id

  // Categories
  CATEGORY_LIST: 'CategoryList', // header category drawer, level 1
  CATEGORY_SUB: 'CategorySub', // header category drawer, level 2

  // Cart and checkout
  CART: 'Cart', // /dashboard/pages/cart
  PLACE_ORDER: 'PlaceOrder', // /dashboard/pages/place-order
  ORDER_SUCCESS: 'OrderSuccess', // /dashboard/pages/order-success
  ORDER_DETAILS: 'OrderDetails', // /dashboard/pages/orders/:orderId
  LOGISTICS_DETAILS: 'LogisticsDetails', // /dashboard/pages/orderslogistics/:orderId

  // Dashboard — shared by both freight flows, `flow` param selects which
  DASHBOARD: 'Dashboard', // /pages/dashboard
  MY_REQUESTS: 'MyRequests', // .../my-request
  MY_ORDERS: 'MyOrders', // .../my-orders
  FORWARDING_PARCELS: 'ForwardingParcels', // .../my-forwarding-parcel
  DELIVERED: 'Delivered', // .../my-delivered
  TRACKING_DETAILS: 'TrackingDetails', // .../my-request/:orderId
  INVOICE: 'Invoice', // .../invoice/:bookingId

  // Account
  ACCOUNT: 'Account',
  PROFILE_INFORMATION: 'ProfileInformation', // /pages/dashboard/user/information
  PROFILE_SECURITY: 'ProfileSecurity', // /pages/dashboard/user/security
  WISHLIST: 'Wishlist', // /wishlist
  NOTICES: 'Notices', // /pages/notices
  NOTICE_DETAIL: 'NoticeDetail', // /pages/notices/:noticeId
  TRACK_ORDER: 'TrackOrder', // /pages/track-order

  // Freight services
  BUY_FOR_ME: 'BuyForMe', // /pages/buy-for-me
  SHIP_FOR_ME: 'ShipForMe', // /pages/ship-for-me
  REQUEST_PRODUCT: 'RequestProduct', // /pages/request-for-product

  // Static content
  ABOUT_US: 'AboutUs', // /pages/about-us
  FAQ: 'Faq', // /pages/faq
  PRIVACY: 'Privacy', // /pages/privacy-policy
  REFUND: 'Refund', // /pages/refund-policy
  TERMS: 'Terms', // /pages/terms-and-coditions
  TAX_AND_SHIPPING: 'TaxAndShipping', // /pages/tax-and-Shipping
  HOW_TO_ORDER: 'HowToOrder', // /pages/how-to-order
  CONTACT: 'Contact', // /pages/contact

  // Modals
  PAYMENT_SHEET: 'PaymentSheet', // paymentModal.js
  PAYMENT_WEBVIEW: 'PaymentWebView', // bKash / SSLCommerz hosted checkout
  LOGISTICS_MODAL: 'LogisticsModal', // logisticsModal.js
  DISCOUNT_MODAL: 'DiscountModal', // discountModal.js
  GALLERY: 'Gallery', // image-zoom.jsx replacement
};

/** The two freight pipelines the dashboard screens are shared between. */
export const FLOWS = {
  BUY_AND_SHIP: 'buy-and-ship-for-me',
  SHIP_FOR_ME: 'ship-for-me',
};

/** Screens that require a signed-in user; `useAuthGuard` enforces this. */
export const PROTECTED_ROUTES = [
  ROUTES.CART,
  ROUTES.PLACE_ORDER,
  ROUTES.ORDER_SUCCESS,
  ROUTES.ORDER_DETAILS,
  ROUTES.LOGISTICS_DETAILS,
  ROUTES.DASHBOARD,
  ROUTES.MY_REQUESTS,
  ROUTES.MY_ORDERS,
  ROUTES.FORWARDING_PARCELS,
  ROUTES.DELIVERED,
  ROUTES.TRACKING_DETAILS,
  ROUTES.INVOICE,
  ROUTES.PROFILE_INFORMATION,
  ROUTES.PROFILE_SECURITY,
  ROUTES.WISHLIST,
  ROUTES.PAYMENT_SHEET,
  ROUTES.PAYMENT_WEBVIEW,
];

export default ROUTES;
