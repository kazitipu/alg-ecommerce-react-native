/**
 * Action creators must keep the names and the dispatched `type` strings the web
 * app used, because the ported reducers and screens are matched to them.
 */
import * as actions from '../src/actions';
import * as types from '../src/constants/ActionTypes';
import rootReducer from '../src/reducers';
import { createStore } from 'redux';

const WEB_ACTIONS = [
  'setCurrentUser', 'setReduxCart', 'setReduxWishlist', 'getCurrencyRedux',
  'setSearchedProductsArray', 'emptySearchedProductsArray', 'setSearchedProductDetail',
  'getAllProductsFirestore', 'fetchSingleProduct', 'getAllHomeCategoryRedux',
  'getAllBannersRedux', 'getAllCampaignsRedux', 'getAllNoticesRedux', 'setIntroModal',
  'addToCart', 'removeItemFromCartRedux', 'addToPendingOrdersRedux', 'addToCartUnsafe',
  'addToCartAndRemoveWishlist', 'removeFromCart', 'removeCart', 'incrementQty', 'decrementQty',
  'addToWishlist', 'addToWishlistUnsafe', 'removeFromWishlist',
  'addToCompare', 'addToCompareUnsafe', 'removeFromCompare',
  'filterBrand', 'filterColor', 'filterPrice', 'filterSort', 'changeCurrency', 'setImgUrl',
  'setOrderObj', 'addToOrdersApiRedux', 'updateOrdersApiRedux', 'updateSingleOrderApiRedux',
  'getSingleOrderApiRedux', 'getAllOrdersApiRedux', 'getOrderTrackingResultRedux',
  'setBookingRequestRedux', 'setProductRequestRedux', 'getSingleProductRequestRedux',
  'getAllBookingsOfSingleUserRedux',
  'setShipForMeRedux', 'updateShipForMeRedux', 'getSingleShipForMeRedux',
  'getAllShipForMeOfSingleUserRedux', 'updateShipmentRequestRedux',
  'getAllShipForMeListRedux', 'uploadShipForMeListRedux', 'updateShipForMeListRedux',
  'deleteShipForMeListRedux', 'getAllD2DRatesRedux',
  'uploadPaymentRequestRedux2', 'uploadShipmentPaymentRequestRedux', 'uploadRefundApplyRedux',
  'sendOtpRedux', 'verifyOtpRedux',
];

test('every web action creator is still exported', () => {
  const missing = WEB_ACTIONS.filter(name => typeof actions[name] !== 'function');
  expect(missing).toEqual([]);
});

test('pure creators emit the action shapes the reducers expect', () => {
  expect(actions.setCurrentUser({ id: 'u1' })).toEqual({
    type: 'SET_CURRENT_USER',
    payload: { id: 'u1' },
  });

  expect(actions.setSearchedProductDetail({ num_iid: '7' }, '1688')).toEqual({
    type: 'SET_SEARCHED_PRODUCT_DETAIL',
    payload: { num_iid: '7' },
    route: '1688',
  });

  expect(actions.setSearchedProductsArray(120, [{ id: 'p' }], 900)).toEqual({
    type: 'SET_SEARCHED_PRODUCTS_ARRAY',
    payload: [{ id: 'p' }],
    totalResults: 120,
    totalFound: 900,
  });

  // The web app named this field `sort_by`; reducers still read that key.
  expect(actions.filterSort('HighToLow')).toEqual({
    type: types.SORT_BY,
    sort_by: 'HighToLow',
  });

  expect(actions.removeFromWishlist('p9')).toBeInstanceOf(Function);
});

test('search results accumulate then clear, end to end', () => {
  const store = createStore(rootReducer);

  store.dispatch(actions.setSearchedProductsArray(2, [{ id: 'a' }, { id: 'b' }], 50));
  store.dispatch(actions.setSearchedProductsArray(4, [{ id: 'c' }], 50));

  let state = store.getState().searchedProducts;
  expect(state.products.map(p => p.id)).toEqual(['a', 'b', 'c']);
  expect(state.totalResults).toBe(4);
  expect(state.totalFound).toBe(50);

  store.dispatch(actions.emptySearchedProductsArray());
  state = store.getState().searchedProducts;
  expect(state.products).toEqual([]);
  expect(state.totalResults).toBe(0);
});
