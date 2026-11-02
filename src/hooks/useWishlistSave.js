import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import useAuth from './useAuth';
import useAuthGuard from './useAuthGuard';
import { addToWishlist } from '../actions';
import { addWishlistTofirestore } from '../firebase/firebase.utils';

/**
 * The product cards' wishlist heart: the set of saved product ids, and a save
 * action that sends signed-out shoppers to log in (the web showed an alert)
 * and otherwise updates Redux and `wishlists/{uid}` in Firestore.
 */
export const useWishlistSave = () => {
  const dispatch = useDispatch();
  const requireAuth = useAuthGuard();
  const { currentUser } = useAuth();
  const wishlist = useSelector(state => state.wishlist.list);

  const wishlistIds = useMemo(
    () => new Set((wishlist || []).map(product => product?.id)),
    [wishlist],
  );

  const saveToWishlist = useCallback(
    product =>
      requireAuth(async () => {
        dispatch(addToWishlist(product));
        await addWishlistTofirestore(currentUser, product);
      }),
    [requireAuth, dispatch, currentUser],
  );

  return { wishlistIds, saveToWishlist };
};

export default useWishlistSave;
