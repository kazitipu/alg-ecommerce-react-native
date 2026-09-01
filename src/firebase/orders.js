import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';

import { db } from './app';
import { notifyError } from '../utils/notify';
import { generateUniqueId, getMonthName } from '../utils/ids';
import { getCartTotal } from '../services';

const docsToArray = snapshot => {
  const results = [];
  snapshot.forEach(document => results.push(document.data()));
  return results;
};

const byNewest = (a, b) => b.time - a.time;

/**
 * Creates one `ordersApi/{orderId}` document per shop in the basket.
 *
 * An id collision means the caller generated a duplicate order number, so the
 * write is refused rather than silently overwriting a real order.
 */
export const addToOrdersApi = async (userAuth, orders) => {
  if (!userAuth?.id) return undefined;

  const created = [];
  for (const shop of orders) {
    const orderRef = doc(db, `ordersApi/${shop.orderId}`);
    const snapShot = await getDoc(orderRef);

    if (snapShot.exists()) {
      notifyError('This order ID was already added. Please try again.');
      continue;
    }

    try {
      await setDoc(orderRef, {
        ...shop,
        userId: userAuth.id,
        displayName: userAuth.displayName,
        uid: userAuth.userId,
        month: getMonthName(),
      });
      const stored = await getDoc(orderRef);
      created.push(stored.data());
    } catch (error) {
      console.warn('error creating orders', error.message);
      return undefined;
    }
  }

  return created.sort(byNewest);
};

export const updateOrdersApi = async (userAuth, orders) => {
  if (!userAuth?.id) return undefined;

  for (const shop of orders) {
    const orderRef = doc(db, `ordersApi/${shop.orderId}`);
    const snapShot = await getDoc(orderRef);

    if (!snapShot.exists()) {
      notifyError('No order was found to be updated.');
      continue;
    }

    try {
      await updateDoc(orderRef, { ...shop, userId: userAuth.id });
    } catch (error) {
      console.warn('error updating orders', error.message);
      return undefined;
    }
  }

  const ordersArray = await getAllOrdersApi(userAuth.id);
  return (ordersArray || []).sort(byNewest);
};

export const getAllOrdersApi = async userId => {
  if (!userId) return undefined;
  try {
    const snapshot = await getDocs(
      query(collection(db, 'ordersApi'), where('userId', '==', userId)),
    );
    return docsToArray(snapshot).sort(byNewest);
  } catch (error) {
    notifyError(error);
    return [];
  }
};

export const getSingleOrderApi = async id => {
  try {
    const snapshot = await getDoc(doc(db, `ordersApi/${id}`));
    return snapshot.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

/**
 * Legacy storefront checkout: writes an `orders/{gbb#####}` document and
 * appends it to the user's `ordersArray`. The 1688 flow uses `addToOrdersApi`
 * instead.
 */
export const addCartItemsToOrdersFirestore = async (
  userAuth,
  ordersArray,
  billingAddress,
) => {
  if (!userAuth) return undefined;

  const sum = getCartTotal(ordersArray);
  const paid = 0;
  const uniqueId = `gbb${generateUniqueId()}`;
  const orderRef = doc(db, `orders/${uniqueId}`);

  try {
    await setDoc(orderRef, {
      userId: userAuth.uid,
      otherInformation: billingAddress,
      order: ordersArray,
      sum,
      status: 'order_pending',
      orderedAt: new Date(),
      paymentStatus: {
        paid,
        due: parseInt(sum, 10) - parseInt(paid, 10),
        total: sum,
      },
    });

    const snapShot = await getDoc(orderRef);
    const userRef = doc(db, `users/${userAuth.uid}`);
    const userSnapShot = await getDoc(userRef);
    const previousOrders = userSnapShot.data()?.ordersArray || [];

    try {
      await updateDoc(userRef, {
        ordersArray: [...previousOrders, { ...snapShot.data(), orderId: uniqueId }],
        shippingAddress: billingAddress,
      });
    } catch (error) {
      notifyError('Error creating order. Please try again later.');
    }

    return { ...snapShot.data(), orderId: uniqueId };
  } catch (error) {
    notifyError('Error creating order. Please try again.');
    return undefined;
  }
};

/**
 * Powers the public order-tracking screen. A tracking box can be given either a
 * document id or a courier tracking number, and the record may live in any of
 * the three pipelines, so all six lookups are attempted in order.
 */
export const getOrderOrShipmentRequest = async orderId => {
  const collections = ['ordersApi', 'shipForMe', 'bookingRequest'];

  for (const name of collections) {
    const snapshot = await getDoc(doc(db, `${name}/${orderId}`));
    if (snapshot.exists()) return snapshot.data();
  }

  for (const name of collections) {
    const snapshot = await getDocs(
      query(collection(db, name), where('trackingNo', '==', orderId)),
    );
    if (!snapshot.empty) return docsToArray(snapshot)[0];
  }

  return null;
};
