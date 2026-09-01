/**
 * Data layer entry point — the React Native port of the web app's 1554-line
 * `src/firebase/firebase.utils.js`.
 *
 * Every export the web module had is re-exported here under the same name and
 * signature, so ported actions and screens keep working with their original
 * imports. The implementations are split by domain into sibling modules rather
 * than living in one file.
 *
 * Differences from the web module, all forced by the platform or by a real bug:
 *  - `snapshot.exists` is a *method* in the native SDK, not a property
 *  - uploads take `{ uri, fileName }` from the image picker, not a browser `File`
 *  - `signInWithPopup` does not exist; Google goes through the native SDK and
 *    Facebook is not wired up yet
 *  - payment follow-up writes are properly awaited (the web used
 *    `await array.map(async ...)`, which awaits nothing)
 *  - `alert()` becomes a toast via `utils/notify`
 */

export { app as default, auth, db, firestore, storage } from './app';

export {
  auth as firebaseAuth,
  logout,
  registerWithEmail,
  sendResetPasswordEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithToken,
  singInWithFacebook,
} from './auth';

export { createUserProfileDocument, getSingleUser, updateUser } from './users';

export {
  addCartItemTofirestore,
  decrementCartItemFromFirestore,
  removeAllCartItemFromFirestore,
  removeCartItemFromFirestore,
  removeItemFromCart,
  updateCartSkuQuantity,
} from './cart';

export {
  addToCartAndRemoveWishlistFirestore,
  addWishlistTofirestore,
  removeFromWishlistFirestore,
} from './wishlist';

export {
  get1688Category,
  getAllBanners,
  getAllCampaigns,
  getAllD2DRates,
  getAllFirestoreAliProductsList,
  getAllFirestoreProducts,
  getAllHomeCategory,
  getAllNotices,
  getAllPartials,
  getAllProductsTax,
  getCurrency,
  getSelectedIntroModal,
  getSingleCoupon,
  getSingleNotice,
  getSingleProduct,
} from './catalog';

export {
  addCartItemsToOrdersFirestore,
  addToOrdersApi,
  getAllOrdersApi,
  getOrderOrShipmentRequest,
  getSingleOrderApi,
  updateOrdersApi,
} from './orders';

export {
  deleteShipForMeList,
  getAllBookingsOfSingleUser,
  getAllShipForMeList,
  getAllShipForMeOfSingleUser,
  getSingleProductRequest,
  getSingleShipForMe,
  setProductRequest,
  setShipForMe,
  updateMultipleProductRequest,
  updateShipForMe,
  updateShipForMeList,
  updateShipmentRequest,
  uploadShipForMeList,
} from './freight';

export {
  uploadPayment,
  uploadPaymentRequest,
  uploadPaymentRequest2,
  uploadPaymentRequestApi,
  uploadPaymentRequestApi2,
  uploadRefundApply,
  uploadShipmentPaymentRequest,
} from './payments';

export {
  uploadImage,
  uploadImageProduct,
  uploadImageRechargeRequest,
} from './uploads';

export { sendOtp, verifyOtp } from './otp';

export { getMonthName } from '../utils/ids';
