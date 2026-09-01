import { doc, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';

import { db } from './app';
import { addCartItemTofirestore } from './cart';

/**
 * `wishlists/{uid}` stores a single `wishlist` array.
 *
 * `price_range` and `videos` are blanked on write because both can be large and
 * the wishlist only ever renders a thumbnail, a name and a price.
 */
export const addWishlistTofirestore = async (userAuth, product) => {
  if (!userAuth) return;

  const wishlistRef = doc(db, `wishlists/${userAuth.uid}`);
  const snapShot = await getDoc(wishlistRef);
  const entry = { ...product, price_range: '', videos: '' };

  if (!snapShot.exists()) {
    await setDoc(wishlistRef, { wishlist: [entry] });
    return;
  }

  const wishlist = snapShot.data().wishlist;
  if (wishlist.some(item => item.id === product.id)) return;

  await updateDoc(wishlistRef, { wishlist: [...wishlist, entry] });
};

export const removeFromWishlistFirestore = async (userAuth, product) => {
  if (!userAuth) return;

  const wishlistRef = doc(db, `wishlists/${userAuth.uid}`);
  const snapShot = await getDoc(wishlistRef);
  if (!snapShot.exists()) return;

  await updateDoc(wishlistRef, {
    wishlist: snapShot.data().wishlist.filter(item => item.id !== product.id),
  });
};

/**
 * Moves a wishlist entry into the cart. The web app deliberately leaves the
 * wishlist entry in place (its removal call is commented out there), so the
 * item stays saved after being added — preserved here.
 */
export const addToCartAndRemoveWishlistFirestore = async (userAuth, product) => {
  await addCartItemTofirestore(userAuth, product);
};
