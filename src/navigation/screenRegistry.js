import {
  ForgotPasswordScreen,
  LoginScreen,
  OtpVerifyScreen,
  RegisterScreen,
} from '../screens/auth';
import GalleryScreen from '../screens/product/GalleryScreen';
import ProductDetailScreen from '../screens/product/ProductDetailScreen';
import { CartScreen, WishlistScreen } from '../screens/cart';
import { OrderSuccessScreen, PlaceOrderScreen } from '../screens/checkout';
import { PaymentSheetScreen, PaymentWebViewScreen } from '../screens/payment';
import { BuyForMeScreen, RequestProductScreen } from '../screens/buyforme';
import { ShipForMeScreen } from '../screens/shipforme';
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
 * One entry per screen: its component, header title, and any initial params.
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
});

export const SCREENS = {
  // Phase 5 — auth (built)
  [ROUTES.LOGIN]: { title: 'Sign in', component: LoginScreen },
  [ROUTES.REGISTER]: { title: 'Create account', component: RegisterScreen },
  [ROUTES.FORGOT_PASSWORD]: { title: 'Reset password', component: ForgotPasswordScreen },
  [ROUTES.OTP_VERIFY]: { title: 'Verify your number', component: OtpVerifyScreen },

  // Phase 7 — home (built)
  [ROUTES.HOME]: { title: 'ALG', component: HomeScreen },

  // Phase 8 — browse and search (built)
  [ROUTES.COLLECTION]: { title: 'Products', component: CollectionScreen },
  [ROUTES.SEARCH]: { title: 'Search', component: SearchScreen },
  // The shop listing is the same grid, driven by a vendorId param.
  [ROUTES.VENDOR_PRODUCTS]: { title: 'Shop', component: CollectionScreen },
  [ROUTES.CATEGORY_LIST]: { title: 'Categories', component: CategoryListScreen },
  [ROUTES.CATEGORY_SUB]: { title: 'Category', component: CategorySubScreen },

  // Phase 9 — product detail (built)
  // All three routes render the same screen; the 1688 and Taobao entry points
  // pass a `source` param so it reads from the legacy detail proxy instead.
  [ROUTES.PRODUCT_DETAIL]: { title: 'Product', component: ProductDetailScreen },
  [ROUTES.PRODUCT_1688]: { title: 'Product', component: ProductDetailScreen },
  [ROUTES.PRODUCT_TAOBAO]: { title: 'Product', component: ProductDetailScreen },
  [ROUTES.GALLERY]: { title: 'Photos', component: GalleryScreen },

  // Phase 10 — cart and wishlist (built)
  [ROUTES.CART]: { title: 'My cart', component: CartScreen },
  [ROUTES.WISHLIST]: { title: 'Wishlist', component: WishlistScreen },

  // Phase 11 — checkout (order details / logistics still pending)
  [ROUTES.PLACE_ORDER]: { title: 'Place order', component: PlaceOrderScreen },
  [ROUTES.ORDER_SUCCESS]: { title: 'Order placed', component: OrderSuccessScreen },
  // The web's order-details and logistics pages were hardcoded mockups with
  // fake data; the real, data-backed view is the tracking screen, so both
  // routes resolve there rather than reproducing the mockups.
  [ROUTES.ORDER_DETAILS]: { title: 'Order details', component: TrackingDetailsScreen },
  [ROUTES.LOGISTICS_DETAILS]: { title: 'Logistics', component: TrackingDetailsScreen },

  // Phase 12 — payments (built; discount modal folded into the payment sheet)
  [ROUTES.PAYMENT_SHEET]: { title: 'Payment', component: PaymentSheetScreen },
  [ROUTES.PAYMENT_WEBVIEW]: { title: 'Complete payment', component: PaymentWebViewScreen },
  // Advance-payment discounts are chosen inside the payment sheet itself.
  [ROUTES.DISCOUNT_MODAL]: { title: 'Discount', component: PaymentSheetScreen },

  // Phase 13 — freight services (built)
  [ROUTES.BUY_FOR_ME]: { title: 'Buy for me', component: BuyForMeScreen },
  [ROUTES.SHIP_FOR_ME]: { title: 'Ship for me', component: ShipForMeScreen },
  [ROUTES.REQUEST_PRODUCT]: { title: 'Request a product', component: RequestProductScreen },

  // Phases 14 and 15 — dashboard (built)
  // Both freight flows and all four stage tabs live on one screen, switched by
  // segmented controls, rather than the web's two duplicated route trees. The
  // per-bucket route names stay registered so deep links keep working.
  [ROUTES.DASHBOARD]: { title: 'My orders', component: DashboardScreen },
  [ROUTES.MY_REQUESTS]: { title: 'My requests', component: DashboardScreen },
  [ROUTES.MY_ORDERS]: { title: 'My orders', component: DashboardScreen },
  [ROUTES.FORWARDING_PARCELS]: { title: 'Forwarding parcels', component: DashboardScreen },
  [ROUTES.DELIVERED]: { title: 'Delivered', component: DashboardScreen },
  [ROUTES.TRACKING_DETAILS]: { title: 'Tracking', component: TrackingDetailsScreen },
  [ROUTES.LOGISTICS_MODAL]: { title: 'Logistics', component: TrackingDetailsScreen },

  // Phase 16 — invoices (built)
  [ROUTES.INVOICE]: { title: 'Invoice', component: InvoiceScreen },

  // Phase 17 — profile, notices, tracking, static pages (built)
  [ROUTES.ACCOUNT]: { title: 'My account', component: AccountScreen },
  [ROUTES.PROFILE_INFORMATION]: { title: 'My information', component: ProfileInformationScreen },
  [ROUTES.PROFILE_SECURITY]: { title: 'Security', component: ProfileSecurityScreen },
  [ROUTES.NOTICES]: { title: 'Notices', component: NoticesScreen },
  [ROUTES.NOTICE_DETAIL]: { title: 'Notice', component: NoticeDetailScreen },
  [ROUTES.TRACK_ORDER]: { title: 'Track order', component: TrackOrderScreen },
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
