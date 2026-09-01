/**
 * The migration contract: every helper the web data layer exposed must remain
 * available under the same name, so ported actions and screens keep their
 * original imports. If this test fails, a screen somewhere is about to break.
 */
import * as dataLayer from '../src/firebase/firebase.utils';

// Names exported by the web app's src/firebase/firebase.utils.js.
const WEB_EXPORTS = [
  'auth', 'firestore', 'storage',
  'signInWithGoogle', 'singInWithFacebook',
  'createUserProfileDocument', 'getSingleUser', 'updateUser',
  'removeItemFromCart', 'addCartItemTofirestore',
  'decrementCartItemFromFirestore', 'removeCartItemFromFirestore',
  'removeAllCartItemFromFirestore',
  'addWishlistTofirestore', 'removeFromWishlistFirestore',
  'addToCartAndRemoveWishlistFirestore',
  'getSingleCoupon', 'getSingleNotice', 'getAllPartials', 'get1688Category',
  'getMonthName', 'getCurrency', 'getAllProductsTax', 'getAllHomeCategory',
  'getAllFirestoreProducts', 'getAllFirestoreAliProductsList', 'getSingleProduct',
  'getAllNotices', 'getAllBanners', 'getAllCampaigns', 'getSelectedIntroModal',
  'getAllD2DRates',
  'addToOrdersApi', 'updateOrdersApi', 'getAllOrdersApi', 'getSingleOrderApi',
  'addCartItemsToOrdersFirestore', 'getOrderOrShipmentRequest',
  'setProductRequest', 'getSingleProductRequest', 'getAllBookingsOfSingleUser',
  'updateMultipleProductRequest',
  'setShipForMe', 'updateShipForMe', 'getSingleShipForMe',
  'getAllShipForMeOfSingleUser', 'updateShipmentRequest',
  'uploadShipForMeList', 'updateShipForMeList', 'deleteShipForMeList',
  'getAllShipForMeList',
  'uploadImage', 'uploadImageProduct', 'uploadImageRechargeRequest',
  'uploadPayment', 'uploadPaymentRequest', 'uploadPaymentRequest2',
  'uploadPaymentRequestApi', 'uploadPaymentRequestApi2',
  'uploadShipmentPaymentRequest', 'uploadRefundApply',
  'sendOtp', 'verifyOtp',
];

test('every web data-layer export is still available', () => {
  const missing = WEB_EXPORTS.filter(name => dataLayer[name] === undefined);
  expect(missing).toEqual([]);
});

test('the callable helpers are functions', () => {
  const handles = ['auth', 'firestore', 'storage'];
  WEB_EXPORTS.filter(name => !handles.includes(name)).forEach(name => {
    expect(typeof dataLayer[name]).toBe('function');
  });
});
