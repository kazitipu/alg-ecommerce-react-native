import { doc, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';

import { db } from './app';
import { addCartItemTofirestore } from './cart';

/**
 * `wishlists/{uid}` stores a single `wishlist` array.
 *
 * `price_range` and `videos` are blanked on write because both can be large and
 * the wishlist only ever renders a thumbnail, a name and a price.
 */
/**
 * The wishlist document belongs to the Firebase auth uid, which is also the
 * profile document's id — the app's `currentUser` carries it as `id` (and
 * sometimes `uid`), so either is accepted.
 */
const wishlistKey = userAuth => userAuth?.uid || userAuth?.id;

export const addWishlistTofirestore = async (userAuth, product) => {
  if (!wishlistKey(userAuth)) return;

  const wishlistRef = doc(db, `wishlists/${wishlistKey(userAuth)}`);
  const snapShot = await getDoc(wishlistRef);
  // Null and undefined fields are dropped, as the web does — Firestore rejects
  // undefined values.
  const entry = Object.fromEntries(
    Object.entries({ ...product, price_range: '', videos: '' }).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );

  if (!snapShot.exists()) {
    await setDoc(wishlistRef, { wishlist: [entry] });
    return;
  }

  const wishlist = snapShot.data().wishlist;
  if (wishlist.some(item => item.id === product.id)) return;

  await updateDoc(wishlistRef, { wishlist: [...wishlist, entry] });
};

/** Removes a product from `wishlists/{uid}`; throws when there is no signed-in account. */
export const removeFromWishlistFirestore = async (userAuth, product) => {
  const key = wishlistKey(userAuth);
  if (!key) throw new Error('Please sign in to change your wishlist.');

  const wishlistRef = doc(db, `wishlists/${key}`);
  const snapShot = await getDoc(wishlistRef);
  if (!snapShot.exists()) return;

  await updateDoc(wishlistRef, {
    wishlist: (snapShot.data().wishlist || []).filter(item => item?.id !== product.id),
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
