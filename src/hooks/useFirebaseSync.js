import { useEffect } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { useDispatch } from 'react-redux';

import { auth, db } from '../firebase/app';
import { createUserProfileDocument } from '../firebase/users';
import {
  getCurrencyRedux,
  setCurrentUser,
  setReduxCart,
  setReduxWishlist,
} from '../actions';

const SIGNED_OUT_USER = { displayName: '', email: '' };

/**
 * The app's reactive backbone, ported from the web `components/app.jsx`.
 *
 * On sign-in it attaches live listeners to the user document, `carts/{uid}` and
 * `wishlists/{uid}`, so Redux tracks Firestore continuously. That is what keeps
 * the app and the website in step: a cart change made on one appears on the
 * other without a refresh.
 *
 * The web version leaked its snapshot listeners — it only ever unsubscribed
 * from `onAuthStateChanged`, so signing out and back in stacked up duplicate
 * cart and wishlist listeners. Here each set is torn down before the next is
 * attached and on unmount.
 */
export const useFirebaseSync = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // CNY -> BDT rate; every 1688 price depends on it.
    dispatch(getCurrencyRedux());

    let profileListeners = [];

    const detachProfileListeners = () => {
      profileListeners.forEach(unsubscribe => unsubscribe());
      profileListeners = [];
    };

    const clearSession = () => {
      dispatch(setCurrentUser(SIGNED_OUT_USER));
      dispatch(setReduxCart([]));
      dispatch(setReduxWishlist([]));
    };

    const unsubscribeFromAuth = onAuthStateChanged(auth, async userAuth => {
      detachProfileListeners();

      if (!userAuth) {
        clearSession();
        return;
      }

      // Returns undefined for admin accounts, which have no customer profile.
      const userRef = await createUserProfileDocument(userAuth);
      if (!userRef) {
        clearSession();
        return;
      }

      profileListeners = [
        onSnapshot(userRef, snapshot => {
          if (!snapshot.exists()) return;
          dispatch(setCurrentUser({ id: snapshot.id, ...snapshot.data() }));
        }),

        onSnapshot(doc(db, `carts/${userAuth.uid}`), snapshot => {
          if (!snapshot.exists()) return;
          dispatch(setReduxCart(snapshot.data().cart));
        }),

        onSnapshot(doc(db, `wishlists/${userAuth.uid}`), snapshot => {
          if (!snapshot.exists()) return;
          dispatch(setReduxWishlist(snapshot.data().wishlist));
        }),
      ];
    });

    return () => {
      detachProfileListeners();
      unsubscribeFromAuth();
    };
  }, [dispatch]);
};

export default useFirebaseSync;
