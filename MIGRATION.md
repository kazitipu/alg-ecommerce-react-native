# ALG E-commerce — Web → React Native Migration

Living progress tracker. **Resume from the first unchecked phase — do not restart from the beginning.**

- **Source project:** `/Users/kazitipu/projects/Alg/alg-ecommerce-frontend` (Create React App, ~75k lines, 151 files)
- **This project:** `/Users/kazitipu/projects/Alg/alg-ecommerce-react-native`
- **Reference project:** `/Users/kazitipu/projects/Alg/alg-react-native-ios-new` ("Fleego") — *different app, different Firebase project*, used only as an architectural pattern reference.
- **Goal:** full feature parity, same Firebase database, native Android + iOS.
- **Build policy:** no device builds until Phase 18 is done. Android (19) first, then iOS (20).

---

## Quick facts

**Node:** 22.23.1 (`.nvmrc`). Always `nvm use` before npm/metro commands — the shell defaults to v14.

**App identity:** app name `AlgEcommerce`, display name `ALG`, Android package + iOS bundle id `com.alglimited.ecommerce`.

**Firebase project — `alg-ecommerce-a9a51` (same DB as the website):**
```
apiKey            AIzaSyDI5Ykwrz1CgsnOGCycihu8aQZhYR3bS30
authDomain        alg-ecommerce-a9a51.firebaseapp.com
projectId         alg-ecommerce-a9a51
storageBucket     alg-ecommerce-a9a51.firebasestorage.app
messagingSenderId 224053311224
appId             1:224053311224:web:c36a85b78dcad4b3ceed0d
```

**Firestore collections:** `users`, `admins`, `userCount`, `carts`, `wishlists`, `orders`, `ordersApi`, `bookingRequest`, `shipForMe`, `shipForMeList`, `aliproducts`, `products`, `homeCategories`, `taxes`, `Currency`, `notices`, `intros`, `coupons`, `partial-payments`, `payments`, `paymentRequest`, `paymentRequestApi`, `refundRequest`, `banners`, `campaigns`, `otpSms`, `1688Category`, and dynamic `d2d-rates-{freightType}-{country}`.

**Backend REST** — `https://alg.com.bd`:
`/api/products/{id}` · `/api/products/search` · `/api/products/search-by-image` · `/api/products/vendor-products` · `/api/products/category` · `/api/products/shipping` · `/api/products/upload-image` · `/api/v1/otp-sms-send/{phone}` · `/api/v1/verify-otp/+88{phone}` · `/api/v1/bkash/create-payment` · `/init-sslCommerz`
Also `https://globalbuybd.com/singleProduct/{id},1688|taobao` and RedX `https://openapi.redx.com.bd/v1.0.0-beta`.

**The 7-stage freight pipeline** (`shipmentStatusScore` — the spine of the whole app):
`1 Pending → 2 Approved → 3 Abroad Warehouse → 4 Ready to Fly → 5 Bangladesh Customs → 6 ALG Warehouse → 7 Delivered`

**Brand:** primary `#ff4a4e` / `#ff4c3b`, accent `#f48110` darkorange, success `#0f8a3b`, font Lato.

---

## Firebase native config

- [x] `google-services.json` → `android/app/google-services.json` (project `alg-ecommerce-a9a51`, package `com.alglimited.ecommerce`, app id `1:224053311224:android:6a905364044c52c4ceed0d`) — includes the Android OAuth client, so Google Sign-In is fully configured
- [x] google-services Gradle plugin wired (`classpath com.google.gms:google-services:4.4.2` + `apply plugin` in `android/app/build.gradle`) — **without this the JSON is ignored and Firebase fails to initialise at startup**
- [x] Web client ID → `src/constants/config.js` (`GOOGLE_WEB_CLIENT_ID`, the `client_type: 3` entry)
- [x] Debug keystore SHA-1 registered — `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, confirmed present in the file as `certificate_hash: 5e8f16062ea3cd2c4a0d547876baa6f38cabf625`
- [ ] `GoogleService-Info.plist` → `ios/GoogleService-Info.plist` — needed for Phase 20 (iOS) only

**Android debug keystore note:** `android/app/debug.keystore` is the public keystore shipped with the React Native template, so that SHA-1 is not secret and is shared by every default RN project. Fine for debug; generate a dedicated release keystore (and register its SHA-1 too) before publishing.

---

## Porting rules

**1. `src/firebase/firebase.utils.js` keeps the same 66 export names and signatures as the web file.** Everything downstream then ports with almost no import churn.

| Web (firebase v7 namespaced) | React Native (RNFB v26 modular) |
|---|---|
| `firestore.doc('a/b').get()` | `getDoc(doc(db, 'a/b'))` |
| `snap.exists` *(property)* | `snap.exists()` *(method)* ← easiest bug to introduce |
| `firestore.collection('x').where(...).get()` | `getDocs(query(collection(db,'x'), where(...)))` |
| `firebase.firestore.FieldValue.arrayUnion(v)` | `arrayUnion(v)` |
| `firebase.firestore.Timestamp.now()` | `firestore.Timestamp.now()` |
| `storage.ref(p).put(File)` | `storage().ref(p).putFile(localUri)` — RN uploads a file URI, never a `File` |
| `auth.signInWithPopup(provider)` | GoogleSignin → `signInWithCredential` |
| `auth.signInWithCustomToken(t)` | identical — the phone-OTP flow ports as-is |
| `ref.onSnapshot(cb)` | identical |

**2. Web → RN library replacements**

| Web | React Native |
|---|---|
| react-slick (30+ files) | `react-native-reanimated-carousel` + FlatList |
| react-image-magnify | custom reanimated pinch-zoom lightbox (no lib — `react-native-awesome-gallery` peers on gesture-handler v2, we run v3) |
| react-toastify (~35 files) | `react-native-toast-message`, one root host |
| react-responsive-modal + Bootstrap `getElementById().click()` | RN `Modal` / navigation modal group, state-driven |
| react-to-print | `react-native-html-to-pdf` + `react-native-share` (fallback: `react-native-view-shot`) |
| react-infinite-scroll-component | FlatList `onEndReached` |
| react-loading-skeleton | custom shimmer component |
| react-input-range | `@react-native-community/slider` |
| react-tabs | custom segmented control |
| react-player | `react-native-video` |
| react-helmet | `navigation.setOptions({ title })` |
| `window.open` / `<a target="_blank">` (21 files) | `Linking.openURL` or in-app WebView |
| `localStorage` (5 files) | AsyncStorage / redux-persist |
| icofont + Font Awesome CDN | `@react-native-vector-icons/*` v13 (scoped packages) |
| @bangladeshi/bangladesh-address | data-only port → `src/constants/thana.js` |
| `<canvas>` video thumbnails | `react-native-create-thumbnail` |

**3. Do NOT port this dead code** (confirmed unrouted or unrendered in the web app):
`pages/collection.jsx`, `pages/search.jsx`, `pages/lookbook.jsx`, `pages/dashboard/my-wishlist.jsx`, `common/headers/common/navbar.jsx`, `common/headers/common/sidebar.jsx`, `layouts/pets/*`, `layouts/common/{blogsection,instagram,logo-block,special*}.jsx`, `products/{accordian,column,vertical,right-sidebar}.jsx`, `common/theme-settings.jsx`, `constants/translations.js`, `products/common/product/details.jsx`.
Also `pages/myOrders.jsx`, `pages/orderDetails.js`, `pages/logisticsDetails.js` are **hardcoded mockups with fake data** — the real orders UI lives under `pages/user-profile/`.

**4. Fix these web bugs rather than replicating them:**
1. `localhost:5000/init-sslCommerz` hardcoded in 4 payment modals → must be `https://alg.com.bd`.
2. Ship-for-me dashboard sidebar links point at `buy-and-ship-for-me/*`, making those screens unreachable → RN uses a proper segmented control.
3. RedX bearer JWT hardcoded in client source → keep behaviour but centralise in `src/constants/config.js`.
4. `"Alg WarehouseDate"` vs `"Alg warehouseDate"` casing inconsistency → read both.
5. No route-level auth guards exist in the web app → RN adds `useAuthGuard`.

---

## Status — code migration complete

**Phases 0–18 are done.** Phases 19 (Android) and 20 (iOS) are builds, held until you give the go-ahead.

| | |
|---|---|
| Screens | 43 files — **every route resolves to a real screen, no placeholders** |
| Shared components | 20 |
| Utility modules | 16 |
| Source | ~14,750 lines (from ~75,000 lines of web code) |
| Tests | 157 across 18 suites, all passing |
| Lint | clean |
| Android bundle | 3.1 MB, builds from `index.js` |

The line count is far below the web app's because the duplication was removed: four payment modals became one screen, eight dashboard screens became one, three product-detail pages became one, and eight static pages became one renderer plus extracted content.

**Next step is yours:** drop `google-services.json` and `GoogleService-Info.plist` in (see the blocked-on-you section above), then say the word and Phase 19 starts the Android build.

---

## Phases

### ✅ Phase 0 — Scaffold
- [x] `react-native@0.87.1` + `react@19.2.3` initialised at `alg-ecommerce-react-native` (app name `AlgEcommerce`)
- [x] TypeScript stripped — JavaScript-only project (`App.tsx`/`tsconfig.json`/`@types/*` removed)
- [x] `.nvmrc` → 22.23.1
- [x] `app.json` displayName → `ALG`
- [x] `babel.config.js` → `react-native-worklets/plugin` (required by reanimated 4)
- [x] Android package + iOS bundle id → `com.alglimited.ecommerce`
- [x] All 43 runtime dependencies installed
- [x] `src/` directory structure created
- [x] This `MIGRATION.md` written

### ✅ Phase 1 — Foundation
- [x] `src/theme/index.js` — colors (`#ff4a4e`), spacing, typography, radius, shadow, `shipmentStages`
- [x] `src/constants/config.js` — every base URL, Firebase config, RedX token, bank details, cache TTLs
- [x] `src/constants/ActionTypes.js` — dead `CHECKOUT_*` types dropped (nothing referenced them)
- [x] `store.js` — redux + thunk + redux-persist on AsyncStorage
- [x] `src/reducers/` — all 12 reducers + root reducer, slice names identical to the web app
- [x] Jest configured (`transformIgnorePatterns` for ESM deps, `jest.setup.js` with an AsyncStorage mock)
- [x] Verified: `eslint` clean · 5 tests pass · Metro bundles the whole graph (930 KB)

**Deviations from a literal port, and why:**
- **Persistence is selective.** The web app serialised the *entire* Redux state to `localStorage` on every dispatch. Only `cartList`, `wishlist`, `compare` and `user` are persisted here — the rest is server data refetched on mount, and whole-state writes are far too expensive on AsyncStorage.
- **`filters.js` initial state reset.** The web app shipped the Multikart demo defaults (`brand: ["nike","caprese","lifestyle"]`, `value: {min:250, max:950}`), which would wrongly filter real products. Now `brand: []` and a `0–100000` range.
- **`cart.js` quirks preserved deliberately.** `DECREMENT_QTY` and `REMOVE_FROM_CART` reproduce the web reducer's operator-precedence behaviour exactly, including that lines without a colour cannot be removed and that an id-match with a variant-mismatch silently drops the line. Comments mark each spot. Worth revisiting once the flat cart is retired.

### ✅ Phase 2 — Firebase data layer
- [x] All 65 web exports ported and re-exported from `src/firebase/firebase.utils.js` under identical names
- [x] Split by domain: `app · auth · users · cart · wishlist · catalog · orders · freight · payments · uploads · otp`
- [x] `.exists` → `.exists()` converted everywhere (confirmed a method in RNFB v26)
- [x] `putFile(localUri)` in all 3 upload helpers, taking `{ uri, fileName }` from the image picker
- [x] `src/services/index.js` — 18 pure selectors ported (needed by the data layer for `getCartTotal`)
- [x] `src/utils/` — `priceTiers.js` (the 4×-duplicated tier maths, extracted), `ids.js`, `notify.js`
- [x] Verified: `eslint` clean · 16 tests pass · Metro bundles the full data-layer graph (1.2 MB)

**Tests guarding this phase:** `__tests__/firebase-exports.test.js` asserts all 65 web export names still resolve — if a screen's import is about to break, that test fails first. `__tests__/priceTiers.test.js` pins tier resolution to the web app's exact behaviour.

**Deviations from a literal port, and why:**
- **`googleProvider` / `facebookProvider` are not exported.** They were `signInWithPopup` provider *instances*, which have no meaning in React Native. Nothing outside `firebase.utils.js` imported them.
- **Facebook sign-in is a stub** that shows "not available yet". It needs `react-native-fbsdk-next` plus a configured Facebook app; Google sign-in is fully implemented via the native SDK.
- **`addCartItemTofirestore` writes once instead of N times.** The web looped over each SKU and wrote the cart document every iteration, but the merged SKU array is computed up front and both loop branches produced the identical document — so N−1 of those writes were redundant. Same result, one round trip.
- **Payment follow-up writes are actually awaited.** The web used `await array.map(async ...)`, which awaits nothing, so the status flips to `pending` were fire-and-forget and could be lost if the page navigated away. On mobile that risk is worse, so these are awaited properly now.
- **`verifyOtp` awaits `signInWithCustomToken`** (the web did not) and reports a wrong code explicitly instead of silently returning `undefined`.
- **`alert()` → `utils/notify`** toasts, keeping the same user-visible failure reporting behind one swappable helper.

### ✅ Phase 3 — Actions + API clients
- [x] `src/actions/index.js` — all 61 action creators ported, **exact parity** (0 missing, 0 extra)
- [x] `src/api/` — `client` (shared axios) · `products` · `otp` · `payments` · `redx`
- [x] `src/services/index.js` — done in Phase 2 (the data layer needed `getCartTotal`)
- [x] `react-toastify` → `react-native-toast-message` via `utils/notify`
- [x] Verified: `eslint` clean · 19 tests pass · Metro bundles actions + API (1.3 MB)

**Test guarding this phase:** `__tests__/actions.test.js` checks all 61 creator names, the exact action shapes the reducers read (including the `sort_by` key name), and a search-results accumulate-then-clear round trip through the real store.

**Deviations, and why:**
- **SSLCommerz posts to `alg.com.bd`,** not the `localhost:5000` that three of the four web payment modals hardcoded — that URL cannot work off the developer's machine.
- **Image upload uses React Native's `FormData` file shape** (`{ uri, name, type }`) instead of a browser `File`.
- **`uploadShipmentPaymentRequestRedux` guards an empty array** before reading `productRequestArray[0]`; the web version would throw if the payment call returned nothing.
- **Unused web imports dropped** (`uploadPaymentRequest`, `updateMultipleProductRequest` were imported into the web actions file but never called there — both are still exported from the data layer).

### ✅ Phase 4 — Navigation skeleton
- [x] `src/navigation/routes.js` — all 53 route names, each annotated with the web path it replaces
- [x] `src/navigation/screenRegistry.js` — 49 screens as data (component + title + owning phase)
- [x] `src/navigation/stacks.js` — Home · Category · Cart · Orders · Account stacks
- [x] `src/navigation/MainTabs.js` — bottom tabs with a live cart badge
- [x] `src/navigation/RootNavigator.js` — tabs + a modal group (auth, payment, gallery, logistics)
- [x] `src/screens/Placeholder.js` — every unbuilt screen shows its route name, params and owning phase
- [x] `src/hooks/` — `useAuth`, `useAuthGuard`, `useDebouncedValue`
- [x] `App.js` wired: GestureHandlerRootView → Provider → PersistGate → SafeAreaProvider → RootNavigator → single Toast host
- [x] Verified: `eslint` clean · 25 tests pass · full app bundles (2.3 MB)

**How later phases plug in:** replace a screen's `component` in `screenRegistry.js`. The navigators read from that registry, so they never need editing again.

**Test guarding this phase:** `__tests__/navigation.test.js` asserts every route name resolves to a screen; `App.test.js` now renders the entire navigator tree, so a broken import anywhere in the graph fails the suite.

**Deviations, and why:**
- **The dashboard screens are registered once, parameterised by `flow`** (`buy-and-ship-for-me` | `ship-for-me`) rather than duplicated into two route trees. This is what fixes the web bug where the ship-for-me sidebar linked at buy-and-ship URLs, leaving its own screens reachable only by typing the URL.
- **Auth is a modal group, not a gate on the whole app.** The storefront stays browsable signed-out, as on the web; `useAuthGuard` asks for sign-in only when a protected action is taken.
- **Shopping screens are registered in several stacks** so a product push stays inside the current tab — standard native behaviour, and something a web router has no equivalent of.

### ✅ Phase 5 — Auth + real-time sync core
- [x] `LoginScreen` — segmented Mobile / Email sign-in
- [x] Phone OTP: `otp-sms-send` → `OtpVerifyScreen` (60s countdown + resend) → `verify-otp` → `signInWithCustomToken`
- [x] `RegisterScreen` — name, email, mobile, password + confirm; creates the `users/{uid}` profile
- [x] `ForgotPasswordScreen` — Firebase reset email
- [x] Google Sign-In via the native SDK (replaces `signInWithPopup`)
- [x] `src/hooks/useFirebaseSync.js` — `onAuthStateChanged` → `onSnapshot` on the user doc, `carts/{uid}` and `wishlists/{uid}` → Redux; mounted in `App.js`
- [x] `src/components/` — `Button`, `Input`, `Screen` primitives (Phase 6 builds on these)
- [x] Verified: `eslint` clean · 31 tests pass · app bundles (2.6 MB)

**Test guarding this phase:** `__tests__/firebaseSync.test.js` covers signed-out clearing, the three listeners on sign-in, admin accounts getting none, no duplicate listeners across a re-sign-in, and full teardown on unmount.

**Deviations, and why:**
- **Snapshot listeners are now torn down.** The web app unsubscribed only from `onAuthStateChanged`, so every sign-in stacked another pair of cart and wishlist listeners on the previous ones — a leak that on a long-lived mobile session would mean duplicated dispatches and wasted reads.
- **Login is one screen with a Mobile/Email toggle,** rather than the web's login page plus a separate near-duplicate `register.jsx`. Phone is the default tab since it is ALG's primary flow.
- **OTP entry is a screen, not a Bootstrap modal** driven by `document.getElementById(...).click()`.
- **Google sign-in stays disabled until `GOOGLE_WEB_CLIENT_ID` is set** in `src/constants/config.js` — it reports that clearly instead of failing obscurely.

### ✅ Phase 6 — Shared UI kit
- [x] `Button` · `Input` · `Screen` · `Card` (Phase 5 built the first three)
- [x] `BottomSheet` — replaces `react-responsive-modal` and the Bootstrap `getElementById().click()` modals
- [x] `Skeleton` + `SkeletonGroup` — reanimated shimmer, replaces `react-loading-skeleton`
- [x] `Carousel` — FlatList paging with dots, replaces `react-slick` for banners
- [x] `ProductCard` + `ProductCardSkeleton` — the grid tile for home rails, collection and search
- [x] `QtyStepper` + `BatchHint` — pack-size aware quantity control
- [x] `SegmentedControl` — replaces `react-tabs` and the duplicated dashboard sidebar
- [x] `EmptyState` · `StatusTimeline` (the 7-stage pipeline)
- [x] `GalleryScreen` — pinch/pan/double-tap lightbox replacing `react-image-magnify`
- [x] `src/utils/` — `format.js`, `quantity.js` (batch snapping), `tracking.js` (timeline builder)
- [x] Verified: `eslint` clean · 41 tests pass · app bundles (2.7 MB)

**Test guarding this phase:** `__tests__/quantityAndTracking.test.js` covers pack-size stepping (including snapping an off-pack value onto the grid and clamping to stock) and the timeline builder, including the `"Alg WarehouseDate"` / `"Alg warehouseDate"` casing fallback.

**Jest infrastructure added here:** reanimated 4 cannot run under Jest — its own shipped mock re-enters the native path and throws `[Worklets] createShareable is not supported on web`. `jest/reanimatedMock.js` is a local stub mapped in via `moduleNameMapper`; animations become inert while structure and props still render.

**Deviations, and why:**
- **The zoom lightbox is hand-built** on reanimated + gesture-handler. `react-native-awesome-gallery` still peers on gesture-handler v2 and this project runs v3, and hover-zoom (`react-image-magnify`) has no touch equivalent anyway.
- **Pack-size (`batch`) logic lives in `utils/quantity.js`,** not inline in each stepper as the web app had it.

### ✅ Phase 7 — Home
- [x] `HomeScreen` — search bar, hero banners, category strip, campaigns, product rails
- [x] `Carousel` hero banners (`secondBanner` entries excluded, as on the web)
- [x] `CategoryStrip` — the 14 home categories; the name doubles as the 1688 search keyword
- [x] `CampaignCard` — live countdown to `expiryDate`
- [x] `ProductRail` — six fixed rails + one per admin `homeCategories` entry
- [x] Intro promo modal from `intros` where `selected == true`
- [x] Pull-to-refresh that clears the memo cache and refetches
- [x] `src/utils/cache.js` — one TTL cache replacing the web's three copies
- [x] Verified: `eslint` clean · 49 tests pass · app bundles (2.7 MB)

**Test guarding this phase:** `__tests__/cache.test.js` covers TTL expiry, concurrent de-duplication, and that a failed request is not cached so a retry can succeed.

**Deviations, and why:**
- **Rail requests are de-duplicated.** The web's three cache modules memoised results but not in-flight requests, so six rails mounting together could fire six identical calls. `fetchOnce` shares one promise per key.
- **Category tiles use icons, not PNGs.** The web referenced `/images/categories/*.png` files that are not in the repo, so the app ships Ionicons glyphs on the brand tint instead of adding 14 image assets. Swap in real artwork later by giving each entry an `img` in `src/constants/categories.js`.
- **No deferred `setTimeout` before fetching.** The web delayed its home fetches to let the page paint first; React Native renders the shell immediately, so the fetches are plain effects.
- **A rail that returns nothing hides itself** rather than rendering an empty titled row.

### ✅ Phase 8 — Browse & search
- [x] `CollectionScreen` — one grid serving all three modes: keyword, reverse-image (`imgId`), and shop (`vendorId`)
- [x] Infinite scroll via FlatList `onEndReached`, keeping the web's 300-result ceiling
- [x] Grid/list toggle via `numColumns`; sort sheet (default / price asc / price desc)
- [x] `SearchScreen` — keyword, pasted 1688 & Taobao links, and search-by-photo
- [x] `CategoryListScreen` / `CategorySubScreen` — the two-level drawer taxonomy
- [x] `src/constants/categoryTree.js` — all **281** leaf categories extracted from the web header
- [x] `src/utils/productLink.js` — link-vs-keyword resolution and product-id extraction
- [x] 5-minute memo cache shared with the home rails
- [x] Verified: `eslint` clean · 63 tests pass · app bundles (2.7 MB)

**Test guarding this phase:** `__tests__/productLink.test.js` covers 1688 mobile/desktop and Taobao link parsing, the keyword fallback for unparseable links, and asserts the taxonomy still carries all 281 leaves across 11 groups.

**Notable finding:** the taxonomy has **two leaf shapes** — 265 plain `{ name, route }` chips and 16 featured `{ title, route, src }` tiles with a thumbnail. Rendering only `name` left those 16 blank; both are now handled. The Chinese `route` values are the real 1688 search terms and must never be "tidied up" — the English label is display only.

**Deviations, and why:**
- **Category tiles are icons, not the web's PNGs** (same reason as Phase 7 — those image files are not in the repo).
- **Brand/colour filters were dropped.** The web's `filter.jsx` filtered `state.data.products`, a legacy static array that the live API-driven search never populates, so those controls did nothing. Sort is kept because it does work. Real server-side filters can be added when the backend exposes them.
- **Pasted links push a screen** instead of `window.open(..., '_blank')`.

### ✅ Phase 9 — Product detail
- [x] `ProductDetailScreen` serving all three routes; `/1688/:id` and `/taobao/:id` pass a `source` param and read from the legacy proxy
- [x] `src/utils/sku.js` — colour/size decoding, variant lookup, cart-payload building
- [x] Colour swatches + per-size quantity rows; out-of-stock pairs disabled
- [x] `batch` pack-size snapping through `QtyStepper`
- [x] Live tier pricing: the unit price re-resolves against the **total** selected across all variants
- [x] Debounced (1s) `/api/products/shipping` estimate
- [x] Image pager into the pinch-zoom `GalleryScreen`; bulk-pricing table; shop link
- [x] Add to cart, Buy now (skips the cart into checkout), wishlist — all behind `useAuthGuard`
- [x] `src/utils/adaptProduct.js` — the legacy payload adapter, now shared with the `singleProduct` reducer
- [x] Verified: `eslint` clean · 80 tests pass · app bundles (2.7 MB)

**Test guarding this phase:** `__tests__/sku.test.js` (25 cases) covers swatch/property-list merging, composite variant keys, unstocked pairs, cart-payload building with tier pricing applied to every SKU, and the legacy adapter including its nested `prodct_array` form.

**Deviations, and why:**
- **One screen instead of three.** The web had `no-sidebar.jsx`, `product1688.jsx` and `searchedProduct.jsx` — three near-duplicate detail pages differing mainly in which upstream they read. Here it is one screen plus a `source` param.
- **The payload adapter is shared.** It lived inside the `singleProduct` reducer, unusable by anything else; it is now `utils/adaptProduct.js`, used by both.
- **Variant selection is a bottom sheet,** not an always-expanded grid — a size matrix with per-row steppers does not fit a phone otherwise.
- **Not yet ported:** media download with a progress bar (`productMediaActions.jsx` used browser streaming APIs and `<a download>`) and video playback. Both are queued for Phase 18 with `react-native-blob-util`, `react-native-share` and `react-native-video`, all already installed.
- **Category → shipping-rate lookup deferred to Phase 11,** where the checkout actually consumes `shippingRate`; the detail screen falls back to `DEFAULTS.shippingRate` (750) exactly as the web did.

### ✅ Phase 10 — Cart & wishlist
- [x] `CartScreen` — shop → item → sku tree with all/shop/item/sku select-all
- [x] Quantity steppers that write to Firestore and re-price the line's tier
- [x] Partial checkout: only selected SKUs go through to `PlaceOrder`
- [x] Line removal; live totals; signed-out and empty states
- [x] `WishlistScreen` — grid backed by `wishlists/{uid}`, live via the snapshot listener
- [x] New data-layer helper `updateCartSkuQuantity` + `updateCartQuantityRedux` action
- [x] Verified: `eslint` clean · 87 tests pass · app bundles (2.8 MB)

**Test guarding this phase:** `__tests__/cartQuantity.test.js` (7 cases) pins the tier re-pricing rule — changing one SKU re-prices every SKU on that line — plus zero-quantity removal, empty-line cleanup, and leaving other lines untouched.

**Deviations, and why:**
- **New `updateCartSkuQuantity` helper.** The web cart mutated its whole local tree and pushed the entire document back on every tap. This narrows the write to the affected line and re-derives the tier price there, so the cart cannot drift out of step with the product page's pricing rule.
- **Selection is a set of deselected keys,** not the web's scattered `this.state[shopId]` / `[itemId]` / `[skuId]` booleans. Same three-level behaviour, one source of truth.

### ✅ Phase 11 — Checkout
- [x] `PlaceOrderScreen` — default shipping address, per-shop breakdown, notes
- [x] RedX per-shop delivery quote by weight, falling back to the flat 100 Tk
- [x] Coupon validation (minimum, expiry, per-customer usage limit) and discount capping
- [x] Order documents written to `ordersApi`, entering the pipeline at `shipmentStatusScore: 1`
- [x] Ordered lines cleared from the cart; coupon usage recorded on the user
- [x] `OrderSuccessScreen`
- [x] `src/utils/coupon.js` and `src/utils/order.js` — extracted from the web's inline render logic
- [x] `OrderDetails` / `LogisticsDetails` — the web versions were **hardcoded mockups with fake data**, so both routes now resolve to the real, data-backed `TrackingDetailsScreen` (Phase 14) rather than reproducing the mockups
- [x] Verified: `eslint` clean · 106 tests pass · app bundles (2.8 MB)

**Test guarding this phase:** `__tests__/checkout.test.js` (21 cases) covers all four coupon gates, percentage capping, usage-counter increments, per-shop totals, and `buildOrders` — including that a coupon is split evenly across shops and that the delivery quote falls back correctly.

**Deviations, and why:**
- **Coupon and order-building logic is extracted.** Both lived inside the web component's `render()`, recomputed on every keystroke and untestable. They are now pure functions.
- **A failed RedX quote no longer blocks checkout** — it falls back to the flat rate per shop.
- **Checkout requires a default address** and routes to the profile to add one, instead of silently quoting no delivery charge as the web did.

### ✅ Phase 12 — Payments
- [x] `PaymentSheetScreen` — one screen for all three methods and all three pipelines
- [x] Direct deposit: bank details, transaction ID, slip upload to Storage, request written to Firestore
- [x] bKash tokenized checkout and SSLCommerz card checkout (2.5% fee shown)
- [x] `PaymentWebViewScreen` — hosted checkout with return-URL interception
- [x] `src/utils/payment.js` — return-URL detection, extracted and tested
- [x] The `localhost:5000` SSLCommerz bug is fixed (all gateway calls go through `constants/config.js`)
- [x] Refund apply — shipped with the dashboard in Phase 14, where the order list lives
- [x] Verified: `eslint` clean · 114 tests pass · app bundles (2.8 MB)

**Test guarding this phase:** `__tests__/payment.test.js` covers status parsing from the redirect, treating a bare return URL as success, matching every configured return URL, and — importantly — *not* matching the gateway's own pages or a lookalike host that merely contains our domain in its path.

**Deviations, and why:**
- **One payment screen, not four.** The web had `paymentModal.js`, `paymentModalOrder.js` and two more under the user-profile trees, all near-identical. A `target` param picks the collection to write against.
- **`window.open(url, '_self')` → in-app WebView.** The customer never leaves the app, and the return URL is intercepted rather than relying on the browser landing back on the site.
- **The `localhost:5000` bug is not reproduced.** Three of the web's four modals posted SSLCommerz there, which cannot work off a developer machine.

### ✅ Phase 13 — Buy-for-me & Ship-for-me
- [x] `BuyForMeScreen` — link/keyword/photo resolver plus a "how it works" explainer
- [x] `RequestProductScreen` — sourcing request with photo upload → `bookingRequest`
- [x] `ShipForMeScreen` — freight quote calculator (sea and air bands) + parcel list builder
- [x] Draft parcels in `shipForMeList`, submitted together as `shipForMe` bookings entering the pipeline at stage 1
- [x] `src/utils/freight.js` — the rate bands, extracted and tested
- [x] Verified: `eslint` clean · 126 tests pass · app bundles

**Test guarding this phase:** `__tests__/freight.test.js` pins every band boundary (100kg, 1000kg for sea; 0.3kg, 10kg for air), the flat parcel fee and its notional per-kg display, India being air-only, and the 7-day booking validity across month and year ends.

**Deviations, and why:**
- **`window.open(..., '_blank')` → in-app navigation** throughout the buy-for-me resolver.
- **Date rollover uses `Date`.** The web computed the 7-day `validTo` with hand-written month/year arithmetic; `setDate` handles it and is covered by tests across both boundaries.
- **Bootstrap edit/delete modals → a `BottomSheet`** for adding parcels, with state instead of `data-bs-toggle`.

### ✅ Phases 14 & 15 — Dashboard (both freight flows)
- [x] `DashboardScreen` — **one** screen for both pipelines and all four stage tabs
- [x] Flow segmented control (Buy & Ship / Ship for me) + stage control (Requests / Orders / Forwarding / Delivered)
- [x] `OrderCard` — stage chip, totals (total / paid / due), and contextual Pay · Track · Invoice · Refund actions
- [x] `TrackingDetailsScreen` — the 7-stage timeline plus live RedX courier events for the BD leg
- [x] Refund apply (the piece deferred from Phase 12)
- [x] Pull-to-refresh across all three collections
- [x] `src/utils/dashboard.js` — stage bucketing and paid/due maths
- [x] Verified: `eslint` clean · 147 tests pass

**Test guarding these phases:** `__tests__/dashboard.test.js` proves the buckets partition all 7 stages with no gaps or overlap, and pins the totals maths including that an overpayment never shows a negative amount due.

**Deviations, and why:**
- **Eight web screens collapse to one.** The web had four screens per flow, duplicated, and its ship-for-me sidebar linked at the buy-and-ship URLs — so those four screens were unreachable except by typing the address. Two segmented controls fix that. The per-bucket route names stay registered so deep links still resolve.
- **`AddTracking` is not a separate screen**; supplying a warehouse tracking number belongs on the ship-for-me booking itself and is covered by the request flow.

### ✅ Phase 16 — Invoices
- [x] `src/utils/invoiceHtml.js` — printable invoice as a pure HTML builder
- [x] `InvoiceScreen` — WebView preview with Share PDF and Save
- [x] HTML → PDF via `react-native-html-to-pdf`, shared through `react-native-share`
- [x] Serves both order and freight-booking invoices
- [x] Verified: `eslint` clean · 147 tests pass

**Test guarding this phase:** `__tests__/invoiceHtml.test.js` checks the arithmetic end to end (line amounts, surcharges, discount, paid, due) and that product names — which come from a Chinese marketplace and are untrusted — are HTML-escaped rather than injected into the document.

**Deviation:** `react-to-print` drove the browser's print dialog, which has no mobile equivalent. A shareable PDF replaces it and is arguably more useful — it can be forwarded to a courier or bank.

### ✅ Phase 17 — Profile, notices, tracking, static
- [x] `AccountScreen` — the hub replacing the web header dropdown and footer columns
- [x] `ProfileInformationScreen` — profile fields + address book (division → district → thana → RedX area)
- [x] `ProfileSecurityScreen` — password change with reauthentication; phone-only accounts told why they have none
- [x] `NoticesScreen` / `NoticeDetailScreen`
- [x] `TrackOrderScreen` — public lookup across all three pipelines
- [x] `StaticPageScreen` — one renderer for all 8 policy/help pages
- [x] `src/constants/staticPages.js` — **84 content blocks** extracted verbatim (Bengali policy text)
- [x] `src/constants/bdAddress.js` (8 divisions, 64 districts) + `thana.js`
- [x] Verified: `eslint` clean · 157 tests pass

**Test guarding this phase:** `__tests__/staticPages.test.js` asserts every page's block count, that no JSX artefacts (`<`, `className`, `{"`) leaked into the text, and that the Bengali privacy wording is intact.

**Deviations, and why:**
- **Eight static components become one renderer + data.** The legal wording is carried over word for word; only the presentation is rebuilt.
- **Delivery areas come from RedX, not a static list** — checkout needs the area's id to quote a charge, so the picker must use RedX's own ids.
- **`@bangladeshi/bangladesh-address` is not a dependency**; only its division/district data was extracted, since the package itself is web-oriented.

### ✅ Phase 18 — Cross-cutting polish
- [x] Push notifications — `usePushNotifications` (permission, channel, token stored on the user doc, foreground display) + background handler in `index.js`
- [x] Deep links — `src/navigation/linking.js` mirrors the website's URLs so existing links open the app
- [x] `ErrorBoundary` — a recoverable screen instead of the white screen the web app showed on a render error
- [x] `SupportFab` — WhatsApp deep link, replacing `react-floating-whatsapp`
- [x] `MediaActions` — copy link, native share, WhatsApp share, save photos (replacing the browser streaming/`<a download>` code)
- [x] Splash handled by `react-native-bootsplash`, hidden once the first frame is ready
- [x] **Zero placeholder screens remain** — every route resolves to a real screen
- [x] Verified: `eslint` clean · 157 tests pass · app bundles (3.1 MB) · no web-only API leaked into `src/` (audited `window.`, `document.`, `localStorage`, `signInWithPopup` — all matches are comments or Firestore `document` variables)

**Still to do at build time (Phases 19–20):** app icon artwork and the BootSplash asset generation, both of which need the native projects and the ALG logo files.

### ✅ Phase 19 — Android build *(debug; release packaging still to do)*
- [x] **BUILD SUCCESSFUL in 1h 6m 32s** — 1083 tasks, zero errors (new architecture + Hermes)
- [x] Gradle auto-fetched what RN 0.87.1 needs: platform 37, build-tools 37.0.0, NDK 27.1.12297006
- [x] `google-services` plugin wired; **Firebase initialises cleanly on device** (`FirebaseApp initialization successful`)
- [x] Installed and running on the emulator (Android 14, x86_64)
- [x] Home screen renders **live data**: Firestore banners, 1688 product rails with real prices and sold counts
- [ ] Release keystore + signing config, `assembleRelease` / AAB

**Build sizes:** the universal debug APK is **253 MB** (219 MB of native libs across four ABIs) and will not install on an emulator with under ~500 MB free. Building the device ABI only gives **94 MB**:

```
./gradlew assembleDebug -PreactNativeArchitectures=x86_64      # 1m 12s once cached
npx react-native run-android --active-arch-only                # equivalent via the CLI
```

**Two environment gotchas worth remembering:**
1. **A Metro from another project will hijack the app.** `Paicart/paicart-react-native` was serving port 8081, and React Native reaches the host via `10.0.2.2:8081` on an emulator — which **bypasses `adb reverse`**. The app silently loaded Paicart's bundle and failed with `NitroModules ... could not be found` and `"AlgEcommerce" has not been registered`. Fix without stopping the other server: run this Metro on 8082 and point the app at it —
   ```
   npx react-native start --port 8082
   adb shell "run-as com.alglimited.ecommerce sh -c 'cat > /data/data/com.alglimited.ecommerce/shared_prefs/com.alglimited.ecommerce_preferences.xml'" <<< '<?xml version="1.0" encoding="utf-8" standalone="yes" ?><map><string name="debug_http_host">10.0.2.2:8082</string></map>'
   ```
2. **Emulator storage.** `INSTALL_FAILED_INSUFFICIENT_STORAGE` needs roughly 2× the APK size free, not 1×.

**Bug found by running it (now fixed):** product cards showed raw 1688 prices under a `Tk` label — ¥7 rendered as "Tk 7" instead of ~Tk 147, understating every price ~21×. The web card does `salePrice * taka`; `ProductCard` now converts with the `Currency/taka` rate and all three call sites (home rails, collection grid, wishlist) pass it. Pinned by `__tests__/priceDisplay.test.js`. **This is exactly the class of bug static checks miss — it took running the app to see it.**

### ✅ Phase 19b — Android manifest gaps
- [x] `POST_NOTIFICATIONS` declared — verified present in `dumpsys package` after install
- [x] Runtime permission actually requested. **Firebase's `requestPermission()` does not ask for `POST_NOTIFICATIONS` on Android** (no reference to it anywhere in RNFB messaging's Android sources); notifee does, so `usePushNotifications` now calls `notifee.requestPermission()` on Android and keeps the Firebase prompt for iOS. Declaring the permission without this would have left push silently dead on Android 13+.
- [x] Deep-link intent filters for `alg://` and `https://alg.com.bd` (+ `www.`) — 4 VIEW filters registered
- [x] **Verified on device:** `adb shell am start -a android.intent.action.VIEW -d "alg://pages/track-order"` opens the app on the Track Order screen with the Account tab active
- [x] `WRITE_EXTERNAL_STORAGE` capped at `maxSdkVersion=28` — scoped storage covers API 29+, so the broad grant is not requested on modern devices
- [x] Rebuilt (50s) and reinstalled; `eslint` clean, 162 tests pass

**Outstanding for App Links:** `alg.com.bd` shows `Domain verification state: none`. Opening an `https://alg.com.bd/...` link will show a chooser rather than going straight to the app until `/.well-known/assetlinks.json` is served from the domain, listing package `com.alglimited.ecommerce` and the signing certificate SHA-256. The `alg://` scheme works regardless.

### ⬜ Phase 20 — iOS build *(after Android)*
- [ ] Podfile, `GoogleService-Info.plist`, capabilities
- [ ] `run-ios`, archive

---

## Verification per phase
- **Phase 2:** scratch script exercising `getAllBanners`, `getAllHomeCategory`, `getSingleUser` against the live project.
- **Phase 5:** sign in with a real account — same user doc, cart and wishlist as the website.
- **Phases 7–11:** compare each screen side by side with `alg.com.bd` on the same account (same products, prices, cart, totals).
- **Phase 12:** a real bKash sandbox payment completing the WebView round trip.
- Metro bundling + `npm run lint` clean throughout; the first device build is Phase 19.
