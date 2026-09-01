import { combineReducers } from 'redux';

import setCurrentUserReducer from './currentUser';
import setBookingRequestReducer from './bookingRequest';
import productReducer from './products';
import cartReducer from './cart';
import filtersReducer from './filters';
import wishlistReducer from './wishlist';
import compareReducer from './compare';
import setOrderReducer from './orders';
import searchedProductsArrayReducer from './searchedProducts';
import searchedProductReducer from './searchedProductDetail';
import shipForMeListReducer from './shipForMeList';
import setNoticesReducer from './notices';

/** Key names match the web app so ported screens read the same paths. */
const rootReducer = combineReducers({
  user: setCurrentUserReducer,
  bookingRequests: setBookingRequestReducer,
  data: productReducer,
  cartList: cartReducer,
  filters: filtersReducer,
  wishlist: wishlistReducer,
  compare: compareReducer,
  orders: setOrderReducer,
  searchedProducts: searchedProductsArrayReducer,
  singleProduct: searchedProductReducer,
  shipForMeList: shipForMeListReducer,
  notices: setNoticesReducer,
});

export default rootReducer;
