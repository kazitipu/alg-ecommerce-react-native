import { deleteDoc, doc, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';

import { db } from './app';
import { notifyError } from '../utils/notify';
import { getTierPriceInTaka } from '../utils/priceTiers';

/**
 * `carts/{uid}` holds a shop -> items -> skus tree:
 *
 *   cart: [{ shopId, shopName, localShipping,
 *            items: [{ id, name, price_range, batch, skus: [{ sku_id, totalQuantity, price }] }] }]
 *
 * Each shop entry carries exactly one item — the web app deliberately keeps two
 * different items from the same shop as two separate entries so they become two
 * separate orders. That behaviour is preserved.
 */

/**
 * Removes selected SKUs from a cart line, dropping the whole shop entry when
 * every SKU of that line was selected.
 *
 * `item.skus[].sku_id` arrives in the composite `"{itemId}-{skuId}"` form the
 * cart screen flattens to, which is why it is compared against a rebuilt key.
 */
export const removeItemFromCart = async (userAuth, item) => {
  if (!userAuth?.id) return undefined;

  const cartRef = doc(db, `carts/${userAuth.id}`);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) return undefined;

  const firestoreCart = snapShot.data().cart;
  const selectedSkuIds = item.skus.map(sku => sku.sku_id);

  const updatedCart = firestoreCart.map(shop => {
    const line = shop.items[0];
    if (line.id !== item.id) return shop;

    // Every SKU selected — the line goes away entirely.
    if (line.skus.length === item.skus.length) return null;

    const remainingSkus = line.skus.filter(
      sku => !selectedSkuIds.includes(`${line.id}-${sku.sku_id}`),
    );
    return { ...shop, items: [{ ...line, skus: remainingSkus }] };
  });

  await updateDoc(cartRef, { cart: updatedCart.filter(Boolean) });

  const updated = await getDoc(cartRef);
  return updated.data().cart;
};

/**
 * Adds a shop/item/sku bundle to the cart, merging quantities when the same SKU
 * is already present and re-pricing the whole line against its quantity tier.
 *
 * The web version wrote the cart once per SKU inside a loop, but every
 * iteration wrote the identical document (the merged SKU array is computed up
 * front and both loop branches produced the same value). That loop is collapsed
 * to a single write here — same result, one Firestore round trip instead of N.
 */
export const addCartItemTofirestore = async (userAuth, product) => {
  if (!userAuth?.id) return undefined;

  const cartRef = doc(db, `carts/${userAuth.id}`);
  const snapShot = await getDoc(cartRef);

  // First ever item for this user.
  if (!snapShot.exists()) {
    try {
      await setDoc(cartRef, { cart: [product] });
      const created = await getDoc(cartRef);
      return created.data().cart;
    } catch (error) {
      console.warn('error creating cartProduct', error.message);
      return [];
    }
  }

  const firestoreCart = snapShot.data().cart;
  const incomingItem = product.items[0];

  // Prefer the shop entry that already holds this item; otherwise the last one.
  const shopMatches = firestoreCart.filter(entry => entry.shopId === product.shopId);
  const shopAlreadyAdded =
    shopMatches.find(shop => shop.items.some(item => item.id === incomingItem.id)) ||
    shopMatches[shopMatches.length - 1] ||
    null;

  const appendAsNewEntry = async () => {
    try {
      await updateDoc(cartRef, { cart: [...firestoreCart, product] });
      const updated = await getDoc(cartRef);
      return updated.data().cart;
    } catch (error) {
      console.warn('error creating cartProduct', error.message);
      return [];
    }
  };

  if (!shopAlreadyAdded) return appendAsNewEntry();

  const itemAlreadyAdded = shopAlreadyAdded.items.find(
    item => item.id === incomingItem.id,
  );

  // Same shop but a different product: keep it as its own order.
  if (!itemAlreadyAdded) return appendAsNewEntry();

  // Merge incoming SKUs with the stored ones, summing shared quantities.
  let mergedSkus = [...incomingItem.skus];
  itemAlreadyAdded.skus.forEach(storedSku => {
    const incoming = incomingItem.skus.find(sku => sku.sku_id === storedSku.sku_id);
    if (!incoming) {
      mergedSkus.push(storedSku);
      return;
    }
    mergedSkus = mergedSkus.map(sku =>
      sku.sku_id === storedSku.sku_id
        ? {
            ...sku,
            totalQuantity:
              parseInt(storedSku.totalQuantity, 10) + parseInt(sku.totalQuantity, 10),
          }
        : sku,
    );
  });

  // Crossing a tier threshold re-prices every SKU on the line, not just the new one.
  const totalQuantity = mergedSkus.reduce(
    (sum, sku) => sum + parseInt(sku.totalQuantity, 10),
    0,
  );
  const tierPrice = getTierPriceInTaka(
    incomingItem.price_range,
    totalQuantity,
    product.currency,
  );
  mergedSkus = mergedSkus.map(sku => ({
    ...sku,
    price: incomingItem.price_range ? tierPrice : sku.price,
  }));

  const newCart = firestoreCart.map(shop => {
    if (shop.shopId !== product.shopId) return shop;
    return {
      ...shop,
      items: shop.items.map(item =>
        item.id === itemAlreadyAdded.id
          ? { ...itemAlreadyAdded, skus: mergedSkus }
          : item,
      ),
    };
  });

  try {
    await updateDoc(cartRef, { cart: newCart });
    const updated = await getDoc(cartRef);
    return updated.data().cart;
  } catch (error) {
    console.warn('error creating cartProduct', error.message);
    return [];
  }
};

/** Sale prices arrive as numbers, "1200", or a "900-1200" range string. */
const resolvePrice = salePrice => {
  if (typeof salePrice !== 'string') return salePrice;
  return salePrice.includes('-')
    ? Number(salePrice.split('-')[1])
    : parseInt(salePrice, 10);
};

/**
 * Legacy flat-cart helpers, still reachable from the header mini-cart and the
 * `/cart` screen. They operate on a cart of plain products rather than the
 * shop tree above.
 */
export const decrementCartItemFromFirestore = async (userAuth, product) => {
  if (!userAuth) return;

  const cartRef = doc(db, `carts/${userAuth.uid}`);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) return;

  const cart = snapShot.data().cart;
  const variantMatches = item =>
    (item.color ? item.color === product.color : true) &&
    (item.sizeOrShipsFrom
      ? item.sizeOrShipsFrom === product.sizeOrShipsFrom
      : true);

  const hasSameVariant = cart.some(
    item => item.id === product.id && variantMatches(item),
  );
  const alreadyInCart = cart.findIndex(item => item.id === product.id) !== -1;

  try {
    if (alreadyInCart && hasSameVariant) {
      const decremented = cart.map(item => {
        if (item.id === product.id && item.qty >= 1 && variantMatches(item)) {
          return {
            ...item,
            qty: item.qty - 1,
            sum: resolvePrice(item.salePrice) * (parseInt(item.qty, 10) - 1),
          };
        }
        return item;
      });
      await updateDoc(cartRef, { cart: decremented.filter(item => item.qty !== 0) });
    } else {
      await updateDoc(cartRef, {
        cart: [
          ...cart,
          { ...product, qty: 1, sum: resolvePrice(product.salePrice) },
        ],
      });
    }
  } catch (error) {
    notifyError(error);
  }
};

export const removeCartItemFromFirestore = async (userAuth, product) => {
  if (!userAuth) return;

  const cartRef = doc(db, `carts/${userAuth.uid}`);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) return;

  const cart = snapShot
    .data()
    .cart.filter(
      cartItem =>
        cartItem.id !== product.id ||
        cartItem.color !== product.color ||
        cartItem.sizeOrShipsFrom !== product.sizeOrShipsFrom,
    );

  try {
    await updateDoc(cartRef, { cart });
  } catch (error) {
    notifyError(error);
  }
};

/** Clears the basket by deleting the whole document, as the web app does. */
export const removeAllCartItemFromFirestore = async userAuth => {
  if (!userAuth) return;
  await deleteDoc(doc(db, `carts/${userAuth.uid}`));
};

/**
 * Sets the quantity of one SKU in the stored cart, re-pricing the whole line.
 *
 * The web cart screen mutated its own local copy and pushed the entire tree
 * back to Firestore. This narrows the write to the affected line and re-derives
 * the tier price from the line's new total, which is the rule the product page
 * and the checkout both use — crossing a threshold re-prices every SKU on the
 * line, not just the one that changed.
 *
 * Passing `quantity: 0` drops the SKU, and dropping the last SKU of a line
 * removes the whole shop entry, matching `removeItemFromCart`.
 */
export const updateCartSkuQuantity = async (userAuth, { itemId, skuId, quantity, taka }) => {
  if (!userAuth?.id && !userAuth?.uid) return undefined;

  const cartRef = doc(db, `carts/${userAuth.id || userAuth.uid}`);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) return undefined;

  const updatedCart = snapShot
    .data()
    .cart.map(shop => {
      const items = (shop.items || [])
        .map(item => {
          if (item.id !== itemId) return item;

          const skus = (item.skus || [])
            .map(sku =>
              sku.sku_id === skuId
                ? { ...sku, totalQuantity: Number(quantity) }
                : sku,
            )
            .filter(sku => Number(sku.totalQuantity) > 0);

          if (skus.length === 0) return null;

          const lineQuantity = skus.reduce(
            (total, sku) => total + (Number(sku.totalQuantity) || 0),
            0,
          );
          const tierPrice = getTierPriceInTaka(item.price_range, lineQuantity, taka);

          return {
            ...item,
            skus: item.price_range
              ? skus.map(sku => ({ ...sku, price: tierPrice }))
              : skus,
          };
        })
        .filter(Boolean);

      return items.length > 0 ? { ...shop, items } : null;
    })
    .filter(Boolean);

  await updateDoc(cartRef, { cart: updatedCart });
  const updated = await getDoc(cartRef);
  return updated.data().cart;
};
