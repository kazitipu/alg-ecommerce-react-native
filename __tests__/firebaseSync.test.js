/**
 * The sync hook is the app's reactive backbone: it mirrors the signed-in user,
 * their cart and their wishlist from Firestore into Redux, which is what keeps
 * the app and the website showing the same basket.
 *
 * The web version leaked listeners — it unsubscribed only from
 * `onAuthStateChanged`, so each sign-in stacked another pair of cart and
 * wishlist listeners on top of the last. These tests pin the teardown.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { thunk as thunkMiddleware } from 'redux-thunk';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';

import rootReducer from '../src/reducers';
import useFirebaseSync from '../src/hooks/useFirebaseSync';
import { createUserProfileDocument } from '../src/firebase/users';

// The hook also fetches the currency rate on mount; stub it so the test output
// is not filled with warnings from an unmocked Firestore read.
jest.mock('../src/firebase/catalog', () => ({
  __esModule: true,
  getCurrency: jest.fn().mockResolvedValue({ taka: 17.5 }),
}));

jest.mock('../src/firebase/users', () => ({
  __esModule: true,
  createUserProfileDocument: jest.fn(),
  getSingleUser: jest.fn(),
  updateUser: jest.fn(),
}));

const Harness = () => {
  useFirebaseSync();
  return null;
};

const renderWithStore = store =>
  ReactTestRenderer.create(
    <Provider store={store}>
      <Harness />
    </Provider>,
  );

const makeStore = () =>
  createStore(rootReducer, applyMiddleware(thunkMiddleware));

/** Runs the callback the hook handed to `onAuthStateChanged`. */
const emitAuthState = async userAuth => {
  const callback = onAuthStateChanged.mock.calls.at(-1)[1];
  await ReactTestRenderer.act(async () => {
    await callback(userAuth);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  onAuthStateChanged.mockReturnValue(jest.fn());
  onSnapshot.mockReturnValue(jest.fn());
});

test('subscribes to auth on mount', async () => {
  const store = makeStore();
  await ReactTestRenderer.act(async () => {
    renderWithStore(store);
  });
  expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
});

test('a signed-out user clears the session and attaches no listeners', async () => {
  const store = makeStore();
  await ReactTestRenderer.act(async () => {
    renderWithStore(store);
  });

  await emitAuthState(null);

  expect(onSnapshot).not.toHaveBeenCalled();
  const state = store.getState();
  expect(state.user.currentUser).toEqual({ displayName: '', email: '' });
  expect(state.cartList.cart).toEqual([]);
  expect(state.wishlist.list).toEqual([]);
});

test('a signed-in user gets user, cart and wishlist listeners', async () => {
  createUserProfileDocument.mockResolvedValue({ id: 'userRef' });

  const store = makeStore();
  await ReactTestRenderer.act(async () => {
    renderWithStore(store);
  });

  await emitAuthState({ uid: 'u1' });

  expect(onSnapshot).toHaveBeenCalledTimes(3);
});

test('an admin account attaches no listeners', async () => {
  // createUserProfileDocument returns undefined for admins.
  createUserProfileDocument.mockResolvedValue(undefined);

  const store = makeStore();
  await ReactTestRenderer.act(async () => {
    renderWithStore(store);
  });

  await emitAuthState({ uid: 'admin1' });

  expect(onSnapshot).not.toHaveBeenCalled();
  expect(store.getState().user.currentUser).toEqual({ displayName: '', email: '' });
});

test('signing in twice does not stack duplicate listeners', async () => {
  createUserProfileDocument.mockResolvedValue({ id: 'userRef' });
  const unsubscribers = [];
  onSnapshot.mockImplementation(() => {
    const unsubscribe = jest.fn();
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  });

  const store = makeStore();
  await ReactTestRenderer.act(async () => {
    renderWithStore(store);
  });

  await emitAuthState({ uid: 'u1' });
  await emitAuthState({ uid: 'u2' });

  // Six attached in total, and the first three were torn down.
  expect(unsubscribers).toHaveLength(6);
  unsubscribers.slice(0, 3).forEach(fn => expect(fn).toHaveBeenCalled());
  unsubscribers.slice(3).forEach(fn => expect(fn).not.toHaveBeenCalled());
});

test('unmounting detaches every listener', async () => {
  createUserProfileDocument.mockResolvedValue({ id: 'userRef' });
  const unsubscribers = [];
  onSnapshot.mockImplementation(() => {
    const unsubscribe = jest.fn();
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  });
  const unsubscribeAuth = jest.fn();
  onAuthStateChanged.mockReturnValue(unsubscribeAuth);

  const store = makeStore();
  let tree;
  await ReactTestRenderer.act(async () => {
    tree = renderWithStore(store);
  });
  await emitAuthState({ uid: 'u1' });

  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });

  unsubscribers.forEach(fn => expect(fn).toHaveBeenCalled());
  expect(unsubscribeAuth).toHaveBeenCalled();
});
