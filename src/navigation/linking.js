import { ROUTES } from './routes';

/**
 * Deep links.
 *
 * Paths mirror the website so an existing link — shared by a customer, or sent
 * in an SMS after a payment — opens the matching screen in the app.
 */
export const linking = {
  prefixes: ['alg://', 'https://alg.com.bd', 'https://www.alg.com.bd'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          [ROUTES.TAB_HOME]: {
            screens: {
              [ROUTES.HOME]: '',
              [ROUTES.COLLECTION]: 'collection/:keyword',
              [ROUTES.PRODUCT_DETAIL]: 'product/:id',
              [ROUTES.PRODUCT_1688]: '1688/:id',
              [ROUTES.PRODUCT_TAOBAO]: 'taobao/:id',
            },
          },
          [ROUTES.TAB_CART]: {
            screens: {
              [ROUTES.CART]: 'dashboard/pages/cart',
              [ROUTES.PLACE_ORDER]: 'dashboard/pages/place-order',
            },
          },
          [ROUTES.TAB_ORDERS]: {
            screens: {
              // Both freight flows land on the same dashboard.
              [ROUTES.DASHBOARD]: 'pages/dashboard',
              [ROUTES.MY_ORDERS]: 'pages/dashboard/buy-and-ship-for-me/my-orders',
              [ROUTES.MY_REQUESTS]: 'pages/dashboard/buy-and-ship-for-me/my-request',
              [ROUTES.FORWARDING_PARCELS]:
                'pages/dashboard/buy-and-ship-for-me/my-forwarding-parcel',
              [ROUTES.DELIVERED]: 'pages/dashboard/buy-and-ship-for-me/my-delivered',
            },
          },
          [ROUTES.TAB_ACCOUNT]: {
            screens: {
              [ROUTES.ACCOUNT]: 'account',
              [ROUTES.PROFILE_INFORMATION]: 'pages/dashboard/user/information',
              [ROUTES.PROFILE_SECURITY]: 'pages/dashboard/user/security',
              [ROUTES.WISHLIST]: 'wishlist',
              [ROUTES.NOTICES]: 'pages/notices',
              [ROUTES.NOTICE_DETAIL]: 'pages/notices/:noticeId',
              [ROUTES.TRACK_ORDER]: 'pages/track-order',
              [ROUTES.BUY_FOR_ME]: 'pages/buy-for-me',
              [ROUTES.SHIP_FOR_ME]: 'pages/ship-for-me',
              [ROUTES.REQUEST_PRODUCT]: 'pages/request-for-product',
              [ROUTES.ABOUT_US]: 'pages/about-us',
              [ROUTES.FAQ]: 'pages/faq',
              [ROUTES.PRIVACY]: 'pages/privacy-policy',
              [ROUTES.REFUND]: 'pages/refund-policy',
              // The website's URL carries this typo; keep it so links resolve.
              [ROUTES.TERMS]: 'pages/terms-and-coditions',
              [ROUTES.TAX_AND_SHIPPING]: 'pages/tax-and-Shipping',
              [ROUTES.HOW_TO_ORDER]: 'pages/how-to-order',
              [ROUTES.CONTACT]: 'pages/contact',
            },
          },
        },
      },
      [ROUTES.LOGIN]: 'pages/login',
    },
  },
};

export default linking;
