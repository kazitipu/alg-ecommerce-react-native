import axios from 'axios';

import * as types from '../constants/ActionTypes';
import { ENDPOINTS } from '../constants/config';
import { notifyInfo, notifySuccess } from '../utils/notify';
import {
  addCartItemTofirestore,
  addToOrdersApi,
  getAllBanners,
  getAllBookingsOfSingleUser,
  getAllCampaigns,
  getAllHomeCategory,
  getAllNotices,
  getAllOrdersApi,
  getCurrency,
  getOrderOrShipmentRequest,
  getSingleOrderApi,
  getSingleProductRequest,
  removeItemFromCart,
  setProductRequest,
  updateCartLocalShipping,
  updateCartSkuQuantity,
  updateOrdersApi,
  updateUser,
  uploadPaymentRequest2,
  uploadRefundApply,
  verifyOtp,
} from '../firebase/firebase.utils';

/**
 * Ported from the web `src/actions/index.js`. Names, signatures and dispatched
 * action types are unchanged so the reducers and ported screens line up; the
 * only substitution is `react-toastify` for `react-native-toast-message`.
 */

// --- Session -----------------------------------------------------------------

export const setCurrentUser = user => ({
  type: 'SET_CURRENT_USER',
  payload: user,
});

export const setReduxCart = cartArray => ({
  type: 'SET_REDUX_CART',
  payload: cartArray,
});

export const setReduxWishlist = wishlistArray => ({
  type: 'SET_REDUX_WISHLIST_ARRAY',
  payload: wishlistArray,
});

export const getCurrencyRedux = () => async dispatch => {
  const currency = await getCurrency();
  dispatch({ type: 'GET_CURRENCY_REDUX', payload: currency });
};

// --- Catalog -----------------------------------------------------------------

export const setSearchedProductsArray = (totalResults, productsArray, totalFound) => ({
  type: 'SET_SEARCHED_PRODUCTS_ARRAY',
  payload: productsArray,
  totalResults,
  totalFound,
});

export const emptySearchedProductsArray = () => ({
  type: 'EMPTY_SEARCHED_PRODUCTS_ARRAY',
});

/** `route` records the source marketplace: "1688" or "taobao". */
export const setSearchedProductDetail = (product, route) => ({
  type: 'SET_SEARCHED_PRODUCT_DETAIL',
  payload: product,
  route,
});

export const getAllProductsFirestore = productsArray => ({
  type: 'FETCH_ALL_PRODUCTS_FROM_FIRESTORE',
  payload: productsArray,
});

export const fetchSingleProduct = productObj => ({
  type: types.FETCH_SINGLE_PRODUCT,
  payload: productObj,
});

export const getAllHomeCategoryRedux = () => async dispatch => {
  const homeCategories = await getAllHomeCategory();
  dispatch({ type: 'GET_ALL_HOME_CATEGORIES', payload: homeCategories });
};

export const getAllBannersRedux = () => async dispatch => {
  const banners = await getAllBanners();
  dispatch({ type: 'GET_ALL_BANNERS', payload: banners });
};

export const getAllCampaignsRedux = () => async dispatch => {
  const campaigns = await getAllCampaigns();
  dispatch({ type: 'GET_ALL_CAMPAIGNS', payload: campaigns });
};

export const getAllNoticesRedux = () => async dispatch => {
  const noticesArray = await getAllNotices();
  dispatch({ type: 'GET_ALL_NOTICES', payload: noticesArray });
};

export const setIntroModal = introModal => async dispatch => {
  dispatch({ type: 'SET_INTRO_MODAL', payload: introModal });
};

// --- Cart --------------------------------------------------------------------

export const addToCart = (currentUser, product) => async dispatch => {
  const cartArray = await addCartItemTofirestore(currentUser, product);
  dispatch({ type: types.ADD_TO_CART, payload: cartArray });
};

export const removeItemFromCartRedux = (currentUser, item) => async dispatch => {
  const cartArray = await removeItemFromCart(currentUser, item);
  dispatch({ type: 'REMOVE_FROM_CART_API', payload: cartArray });
};

/** Changes one SKU's quantity in the stored cart and re-prices its line. */
export const updateCartQuantityRedux = payload => async dispatch => {
  const cartArray = await updateCartSkuQuantity(payload.currentUser, payload);
  if (cartArray) dispatch({ type: 'SET_REDUX_CART', payload: cartArray });
};

/** Stores a recalculated China local courier charge on a cart entry. */
export const updateCartLocalShippingRedux = (currentUser, itemId, localShipping) => async dispatch => {
  const cartArray = await updateCartLocalShipping(currentUser, itemId, localShipping);
  if (cartArray) dispatch({ type: 'SET_REDUX_CART', payload: cartArray });
};

export const addToPendingOrdersRedux = pendingOrders => async dispatch => {
  dispatch({ type: 'ADD_TO_PENDING_ORDERS', payload: pendingOrders });
};

export const addToCartUnsafe = product => ({
  type: types.ADD_TO_CART,
  product,
});

export const addToCartAndRemoveWishlist = (product, qty) => dispatch => {
  notifySuccess('Item added to cart');
  dispatch(addToCartUnsafe(product, qty));
};

export const removeFromCart = product => dispatch => {
  notifyInfo('Item removed from cart');
  dispatch({ type: types.REMOVE_FROM_CART, product });
};

export const removeCart = () => ({ type: 'REMOVE_CART' });

export const incrementQty = (product, qty) => dispatch => {
  notifySuccess('Item added to cart');
  dispatch(addToCartUnsafe(product, qty));
};

export const decrementQty = product => dispatch => {
  notifyInfo('Quantity reduced');
  dispatch({ type: types.DECREMENT_QTY, product });
};

// --- Wishlist and compare ----------------------------------------------------

export const addToWishlistUnsafe = product => ({
  type: types.ADD_TO_WISHLIST,
  product,
});

export const addToWishlist = product => dispatch => {
  notifySuccess('Item added to wishlist');
  dispatch(addToWishlistUnsafe(product));
};

export const removeFromWishlist = productId => dispatch => {
  dispatch({ type: types.REMOVE_FROM_WISHLIST, product_id: productId });
};

export const addToCompareUnsafe = product => ({
  type: types.ADD_TO_COMPARE,
  product,
});

export const addToCompare = product => dispatch => {
  notifySuccess('Item added to compare');
  dispatch(addToCompareUnsafe(product));
};

export const removeFromCompare = product => ({
  type: types.REMOVE_FROM_COMPARE,
  product,
});

// --- Filters -----------------------------------------------------------------

export const filterBrand = brand => ({ type: types.FILTER_BRAND, brand });
export const filterColor = color => ({ type: types.FILTER_COLOR, color });
export const filterPrice = value => ({ type: types.FILTER_PRICE, value });
export const filterSort = sortBy => ({ type: types.SORT_BY, sort_by: sortBy });
export const changeCurrency = symbol => ({ type: types.CHANGE_CURRENCY, symbol });

export const setImgUrl = imgUrl => ({ type: 'SET_IMG_URL', payload: imgUrl });

// --- Orders ------------------------------------------------------------------

export const setOrderObj = orderObj => ({
  type: 'SET_ORDER_OBJECT',
  payload: orderObj,
});

export const addToOrdersApiRedux = (currentUser, orders) => async dispatch => {
  const ordersArray = await addToOrdersApi(currentUser, orders);
  dispatch({ type: 'ADD_TO_ORDERS_API', payload: ordersArray });
  // The orders actually stored, so the caller can tell a failed save apart.
  return ordersArray;
};

export const updateOrdersApiRedux = (currentUser, orders) => async dispatch => {
  const ordersArray = await updateOrdersApi(currentUser, orders);
  dispatch({ type: 'UPDATE_ORDERS_API', payload: ordersArray });
};

export const updateSingleOrderApiRedux = order => async dispatch => {
  dispatch({ type: 'UPDATE_SINGLE_ORDER_API', payload: order });
};

export const getSingleOrderApiRedux = bookingId => async dispatch => {
  const orderObj = await getSingleOrderApi(bookingId);
  dispatch({ type: 'GET_SINGLE_ORDER_API', payload: orderObj });
};

export const getAllOrdersApiRedux = userId => async dispatch => {
  const ordersApiArray = await getAllOrdersApi(userId);
  dispatch({ type: 'GET_ALL_ORDERS_API_OF_SINGLE_USER', payload: ordersApiArray });
};

export const getOrderTrackingResultRedux = trackingNo => async dispatch => {
  const resultObj = await getOrderOrShipmentRequest(trackingNo);
  dispatch({ type: 'GET_ORDER_TRACKING_RESULT', payload: resultObj });
};

// --- Buy & Ship for me -------------------------------------------------------

export const setBookingRequestRedux = bookingObj => async dispatch => {
  const result = await axios.post(ENDPOINTS.setBooking, { ...bookingObj });
  dispatch({ type: 'SET_BOOKING_REQUEST', payload: result.data });
};

export const setProductRequestRedux = bookingObj => async dispatch => {
  const uploadedBookingObj = await setProductRequest(bookingObj);
  if (uploadedBookingObj) dispatch({ type: 'SET_PRODUCT_REQUEST', payload: uploadedBookingObj });
  return uploadedBookingObj;
};

export const getSingleProductRequestRedux = bookingId => async dispatch => {
  const orderObj = await getSingleProductRequest(bookingId);
  dispatch({ type: 'GET_SINGLE_PRODUCT_REQUEST', payload: orderObj });
};

export const getAllBookingsOfSingleUserRedux = userId => async dispatch => {
  const bookingsArray = await getAllBookingsOfSingleUser(userId);
  dispatch({ type: 'GET_ALL_BOOKINGS_OF_SINGLE_USER', payload: bookingsArray });
};

// --- Payments and refunds ----------------------------------------------------

export const uploadPaymentRequestRedux2 = paymentObject => async dispatch => {
  const paymentObj = await uploadPaymentRequest2(paymentObject);
  dispatch({ type: 'UPDATE_BOOKINGS_OF_SINGLE_USER', payload: paymentObj });
};

export const uploadRefundApplyRedux = refundObject => async dispatch => {
  const refund = await uploadRefundApply(refundObject);
  dispatch({
    type: refundObject.productRequest
      ? 'UPLOAD_REFUND_APPLY_PRODUCT_REQUEST'
      : 'UPLOAD_REFUND_APPLY',
    payload: refund,
  });
  // The updated order (undefined when the request could not be filed).
  return refund;
};

// --- Profile photo -----------------------------------------------------------

/**
 * Saves (or, with `photoURL: ''`, removes) the profile photo on `users/{id}`
 * and in the signed-in user, so every avatar in the app updates at once.
 */
export const updateProfilePhotoRedux = (currentUser, photoURL) => async dispatch => {
  if (!currentUser?.id) return undefined;
  await updateUser({ id: currentUser.id, photoURL });
  const next = { ...currentUser, photoURL };
  dispatch({ type: 'SET_CURRENT_USER', payload: next });
  return next;
};

// --- Phone OTP ---------------------------------------------------------------

/** Stores the number so the verify screen knows which one to confirm. */
export const sendOtpRedux = number => async dispatch => {
  dispatch({ type: 'SET_NUMBER', payload: number });
};

export const verifyOtpRedux = (number, otp) => async dispatch => {
  // `verifyOtp` reports its own failures (expired, wrong code, network).
  const userObj = await verifyOtp(number, otp);
  if (!userObj) return undefined;
  dispatch({ type: 'SET_CURRENT_USER', payload: userObj });
  return userObj;
};
