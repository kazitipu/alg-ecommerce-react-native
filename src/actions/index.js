import axios from 'axios';

import * as types from '../constants/ActionTypes';
import { ENDPOINTS } from '../constants/config';
import { notifyError, notifyInfo, notifySuccess } from '../utils/notify';
import {
  addCartItemTofirestore,
  addToOrdersApi,
  deleteShipForMeList,
  getAllBanners,
  getAllBookingsOfSingleUser,
  getAllCampaigns,
  getAllD2DRates,
  getAllHomeCategory,
  getAllNotices,
  getAllOrdersApi,
  getAllShipForMeList,
  getAllShipForMeOfSingleUser,
  getCurrency,
  getOrderOrShipmentRequest,
  getSingleOrderApi,
  getSingleProductRequest,
  getSingleShipForMe,
  removeItemFromCart,
  setProductRequest,
  updateCartSkuQuantity,
  setShipForMe,
  updateOrdersApi,
  updateShipForMe,
  updateShipForMeList,
  updateShipmentRequest,
  uploadPaymentRequest2,
  uploadRefundApply,
  uploadShipForMeList,
  uploadShipmentPaymentRequest,
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
  dispatch({ type: 'SET_PRODUCT_REQUEST', payload: uploadedBookingObj });
};

export const getSingleProductRequestRedux = bookingId => async dispatch => {
  const orderObj = await getSingleProductRequest(bookingId);
  dispatch({ type: 'GET_SINGLE_PRODUCT_REQUEST', payload: orderObj });
};

export const getAllBookingsOfSingleUserRedux = userId => async dispatch => {
  const bookingsArray = await getAllBookingsOfSingleUser(userId);
  dispatch({ type: 'GET_ALL_BOOKINGS_OF_SINGLE_USER', payload: bookingsArray });
};

// --- Ship for me -------------------------------------------------------------

export const setShipForMeRedux = bookingObj => async dispatch => {
  const uploadedBookingObj = await setShipForMe(bookingObj);
  dispatch({ type: 'SET_SHIP_FOR_ME', payload: uploadedBookingObj });
};

export const updateShipForMeRedux = bookingObj => async dispatch => {
  const uploadedBookingObj = await updateShipForMe(bookingObj);
  dispatch({ type: 'UPDATE_SHIP_FOR_ME', payload: uploadedBookingObj });
};

export const getSingleShipForMeRedux = bookingId => async dispatch => {
  const shipForMeObj = await getSingleShipForMe(bookingId);
  dispatch({ type: 'GET_SINGLE_SHIP_FOR_ME', payload: shipForMeObj });
};

export const getAllShipForMeOfSingleUserRedux = userId => async dispatch => {
  const bookingsArray = await getAllShipForMeOfSingleUser(userId);
  dispatch({ type: 'GET_ALL_SHIP_FOR_ME_OF_SINGLE_USER', payload: bookingsArray });
};

export const updateShipmentRequestRedux = requestObj => async dispatch => {
  const updatedRequest = await updateShipmentRequest(requestObj);
  dispatch({ type: 'UPDATE_SHIPMENT_REQUEST', payload: updatedRequest });
};

// --- Ship-for-me draft list --------------------------------------------------

export const getAllShipForMeListRedux = userId => async dispatch => {
  const shipForMesArray = await getAllShipForMeList(userId);
  dispatch({ type: 'GET_ALL_SHIP_FOR_ME_LIST', payload: shipForMesArray });
};

export const uploadShipForMeListRedux = shipForMeObj => async dispatch => {
  const shipObj = await uploadShipForMeList(shipForMeObj);
  dispatch({ type: 'UPLOAD_SHIP_FOR_ME_LIST', payload: shipObj });
};

export const updateShipForMeListRedux = shipForMeObj => async dispatch => {
  const updatedShipForMe = await updateShipForMeList(shipForMeObj);
  dispatch({ type: 'UPDATE_SHIP_FOR_ME_LIST', payload: updatedShipForMe });
};

export const deleteShipForMeListRedux = shipForMeObj => async dispatch => {
  await deleteShipForMeList(shipForMeObj);
  dispatch({ type: 'DELETE_SHIP_FOR_ME_LIST', payload: shipForMeObj });
};

// --- Freight rates -----------------------------------------------------------

export const getAllD2DRatesRedux = (freightType, country) => async dispatch => {
  const d2dRates = await getAllD2DRates(freightType, country);
  dispatch({ type: 'GET_ALL_D2D_RATES', payload: d2dRates });
};

// --- Payments and refunds ----------------------------------------------------

export const uploadPaymentRequestRedux2 = paymentObject => async dispatch => {
  const paymentObj = await uploadPaymentRequest2(paymentObject);
  dispatch({ type: 'UPDATE_BOOKINGS_OF_SINGLE_USER', payload: paymentObj });
};

export const uploadShipmentPaymentRequestRedux = paymentObject => async dispatch => {
  const paymentObj = await uploadShipmentPaymentRequest(paymentObject);
  // The reducer updates one booking, so only the first entry is dispatched.
  if (!paymentObj?.productRequestArray?.length) return;
  dispatch({
    type: 'UPDATE_SHIPMENT_PAYMENT_REQUEST',
    payload: paymentObj.productRequestArray[0],
  });
};

export const uploadRefundApplyRedux = refundObject => async dispatch => {
  const refund = await uploadRefundApply(refundObject);
  dispatch({
    type: refundObject.productRequest
      ? 'UPLOAD_REFUND_APPLY_PRODUCT_REQUEST'
      : 'UPLOAD_REFUND_APPLY',
    payload: refund,
  });
};

// --- Phone OTP ---------------------------------------------------------------

/** Stores the number so the verify screen knows which one to confirm. */
export const sendOtpRedux = number => async dispatch => {
  dispatch({ type: 'SET_NUMBER', payload: number });
};

export const verifyOtpRedux = (number, otp) => async dispatch => {
  const userObj = await verifyOtp(number, otp);
  if (!userObj) {
    notifyError('Could not verify that code.');
    return undefined;
  }
  dispatch({ type: 'SET_CURRENT_USER', payload: userObj });
  return userObj;
};
