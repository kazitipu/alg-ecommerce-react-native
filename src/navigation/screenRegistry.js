import {
  ForgotPasswordScreen,
  LoginScreen,
  OtpVerifyScreen,
  PhoneLoginScreen,
  RegisterScreen,
} from '../screens/auth';
import GalleryScreen from '../screens/product/GalleryScreen';
import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import { CartScreen, WishlistScreen } from '../screens/cart';
import { OrderSuccessScreen, PlaceOrderScreen } from '../screens/checkout';
import { PayNowOfferScreen, PaymentSheetScreen, PaymentWebViewScreen } from '../screens/payment';
import { BuyForMeScreen, RequestProductScreen } from '../screens/buyforme';
import { DashboardScreen, TrackingDetailsScreen } from '../screens/dashboard';
import { InvoiceScreen } from '../screens/invoice';
import {
  AccountScreen,
  ProfileInformationScreen,
  ProfileSecurityScreen,
} from '../screens/profile';
import { NoticeDetailScreen, NoticesScreen } from '../screens/notices';
import { TrackOrderScreen } from '../screens/tracking';
import { StaticPageScreen } from '../screens/static';
import { STATIC_PAGES } from '../constants/staticPages';
import HomeScreen from '../screens/home/HomeScreen';
import {
  CategoryListScreen,
  CategorySubScreen,
  CollectionScreen,
  SearchScreen,
} from '../screens/collection';
import { ROUTES } from './routes';

/**
 * One entry per screen: its component, header title, any initial params, and
 * any extra navigator `options` (e.g. hiding the header for custom-header screens).
 *
 * Keeping this as data rather than ~50 hand-written `<Stack.Screen>` elements
 * means the navigators never need editing — a screen is added or swapped here
 * and every stack that lists its route picks it up.
 */
/** All eight policy/help pages share one renderer, selected by `page`. */
const staticPage = key => ({
  title: STATIC_PAGES[key].title,
  component: StaticPageScreen,
  initialParams: { page: key },
  // The page draws its own header.
  options: { headerShown: false },
});

export const SCREENS = {
  // Phase 5 — auth (built)
  [ROUTES.LOGIN]: { title: 'Sign in', component: LoginScreen, options: { headerShown: false } },
  [ROUTES.REGISTER]: { title: 'Create account', component: RegisterScreen },
  [ROUTES.FORGOT_PASSWORD]: { title: 'Reset password', component: ForgotPasswordScreen },
  [ROUTES.PHONE_LOGIN]: { title: 'Sign in with Phone', component: PhoneLoginScreen, options: { headerShown: false } },
  [ROUTES.OTP_VERIFY]: { title: 'Verify your number', component: OtpVerifyScreen },

  // Phase 7 — home (built)
  // Home, the product list and product detail draw their own headers.
  [ROUTES.HOME]: { title: 'ALG', component: HomeScreen, options: { headerShown: false } },

  // Phase 8 — browse and search (built)
  [ROUTES.COLLECTION]: {
    title: 'Products',
    component: CollectionScreen,
    options: { headerShown: false },
  },
  [ROUTES.SEARCH]: { title: 'Search', component: SearchScreen },
  // The shop listing is the same grid, driven by a vendorId param.
  [ROUTES.VENDOR_PRODUCTS]: { title: 'Shop', component: CollectionScreen, options: { headerShown: false } },
  [ROUTES.CATEGORY_LIST]: { title: 'Categories', component: CategoryListScreen, options: { headerShown: false } },
  [ROUTES.CATEGORY_SUB]: { title: 'Category', component: CategorySubScreen, options: { headerShown: false } },

  // Phase 9 — product detail (built)
  // All three routes render the same screen; the 1688 and Taobao entry points
  // pass a `source` param so it reads from the legacy detail proxy instead.
  [ROUTES.PRODUCT_DETAIL]: {
    title: 'Product',
    component: ProductDetailScreen,
    options: { headerShown: false },
  },
  [ROUTES.PRODUCT_1688]: {
    title: 'Product',
    component: ProductDetailScreen,
    options: { headerShown: false },
  },
  [ROUTES.PRODUCT_TAOBAO]: {
    title: 'Product',
    component: ProductDetailScreen,
    options: { headerShown: false },
  },
  [ROUTES.GALLERY]: { title: 'Photos', component: GalleryScreen },

  // Phase 10 — cart and wishlist (built)
  [ROUTES.CART]: { title: 'My cart', component: CartScreen, options: { headerShown: false } },
  [ROUTES.WISHLIST]: { title: 'Wishlist', component: WishlistScreen, options: { headerShown: false } },

  // Phase 11 — checkout (order details / logistics still pending)
  [ROUTES.PLACE_ORDER]: { title: 'Place order', component: PlaceOrderScreen, options: { headerShown: false } },
  [ROUTES.ORDER_SUCCESS]: { title: 'Order placed', component: OrderSuccessScreen, options: { headerShown: false } },
  // The web's order-details and logistics pages were hardcoded mockups with
  // fake data; the real, data-backed view is the tracking screen, so both
  // routes resolve there rather than reproducing the mockups.
  [ROUTES.ORDER_DETAILS]: { title: 'Order details', component: TrackingDetailsScreen, options: { headerShown: false } },
  [ROUTES.LOGISTICS_DETAILS]: { title: 'Logistics', component: TrackingDetailsScreen, options: { headerShown: false } },

  // Phase 12 — payments (built; discount modal folded into the payment sheet)
  [ROUTES.PAYMENT_SHEET]: { title: 'Payment', component: PaymentSheetScreen, options: { headerShown: false } },
  [ROUTES.PAYMENT_WEBVIEW]: { title: 'Complete payment', component: PaymentWebViewScreen, options: { headerShown: false } },
  // Advance-payment discounts are chosen inside the payment sheet itself.
  [ROUTES.DISCOUNT_MODAL]: { title: 'Pay now offer', component: PayNowOfferScreen, options: { headerShown: false } },

  // Phase 13 — freight services (built)
  [ROUTES.BUY_FOR_ME]: { title: 'Buy for me', component: BuyForMeScreen, options: { headerShown: false } },
  [ROUTES.REQUEST_PRODUCT]: { title: 'Request a product', component: RequestProductScreen, options: { headerShown: false } },

  // Phases 14 and 15 — dashboard (built)
  // Both freight flows and all four stage tabs live on one screen, switched by
  // segmented controls, rather than the web's two duplicated route trees. The
  // per-bucket route names stay registered so deep links keep working.
  [ROUTES.DASHBOARD]: { title: 'My orders', component: DashboardScreen, options: { headerShown: false } },
  [ROUTES.MY_REQUESTS]: { title: 'My requests', component: DashboardScreen, options: { headerShown: false } },
  [ROUTES.MY_ORDERS]: { title: 'My orders', component: DashboardScreen, options: { headerShown: false } },
  [ROUTES.FORWARDING_PARCELS]: { title: 'Forwarding parcels', component: DashboardScreen, options: { headerShown: false } },
  [ROUTES.DELIVERED]: { title: 'Delivered', component: DashboardScreen, options: { headerShown: false } },
  [ROUTES.TRACKING_DETAILS]: { title: 'Tracking', component: TrackingDetailsScreen, options: { headerShown: false } },
  [ROUTES.LOGISTICS_MODAL]: { title: 'Logistics', component: TrackingDetailsScreen, options: { headerShown: false } },

  // Phase 16 — invoices (built)
  [ROUTES.INVOICE]: { title: 'Invoice', component: InvoiceScreen, options: { headerShown: false } },

  // Phase 17 — profile, notices, tracking, static pages (built)
  [ROUTES.ACCOUNT]: { title: 'My account', component: AccountScreen, options: { headerShown: false } },
  [ROUTES.PROFILE_INFORMATION]: { title: 'My information', component: ProfileInformationScreen, options: { headerShown: false } },
  [ROUTES.PROFILE_SECURITY]: { title: 'Security', component: ProfileSecurityScreen, options: { headerShown: false } },
  [ROUTES.NOTICES]: { title: 'Notices', component: NoticesScreen, options: { headerShown: false } },
  [ROUTES.NOTICE_DETAIL]: { title: 'Notice', component: NoticeDetailScreen, options: { headerShown: false } },
  [ROUTES.TRACK_ORDER]: { title: 'Track order', component: TrackOrderScreen, options: { headerShown: false } },
  [ROUTES.ABOUT_US]: staticPage('ABOUT_US'),
  [ROUTES.FAQ]: staticPage('FAQ'),
  [ROUTES.PRIVACY]: staticPage('PRIVACY'),
  [ROUTES.REFUND]: staticPage('REFUND'),
  [ROUTES.TERMS]: staticPage('TERMS'),
  [ROUTES.TAX_AND_SHIPPING]: staticPage('TAX_AND_SHIPPING'),
  [ROUTES.HOW_TO_ORDER]: staticPage('HOW_TO_ORDER'),
  [ROUTES.CONTACT]: staticPage('CONTACT'),
};

export default SCREENS;
