import { createStore, applyMiddleware, compose } from 'redux';
import { thunk as thunkMiddleware } from 'redux-thunk';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import rootReducer from './src/reducers';

/**
 * The web app serialised the *entire* Redux state into localStorage on every
 * single dispatch. That is far too expensive on AsyncStorage, and most of the
 * state is remote data that is refetched on mount anyway.
 *
 * Only the slices that must survive a cold start are persisted:
 *  - cartList / wishlist / compare  keep the basket visible offline and before
 *    the Firestore snapshot listeners have delivered their first payload
 *  - user  renders the profile header immediately, ahead of onAuthStateChanged
 *
 * Everything else (`data`, `searchedProducts`, `singleProduct`, `orders`,
 * `bookingRequests`, `shipForMeList`, `notices`, `filters`) is server data and
 * is deliberately left out so stale results never outlive a session.
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['cartList', 'wishlist', 'compare', 'user'],
};

const store = createStore(
  persistReducer(persistConfig, rootReducer),
  compose(applyMiddleware(thunkMiddleware)),
);

export const persistor = persistStore(store);
export default store;
