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

/**
 * Manual ("Direct Deposit") payment submissions and refund applications.
 *
 * A payment request is a customer claim that money was sent — it uploads a slip
 * image and flips the related order or booking to `pending` so an admin can
 * verify it. Two parallel collections exist for historical reasons:
 *   `paymentRequest`    — ship-for-me bookings and product requests
 *   `paymentRequestApi` — D2D orders in `ordersApi`
 *
 * NOTE: the web versions wrote these follow-up updates with
 * `await array.map(async ...)`, which does not await anything — the status
 * flips were fire-and-forget and could be lost if the page navigated away. Here
 * every batch is awaited properly, so the same writes actually land before the
 * call resolves.
 */

/** `file` holds a local image handle that must not be written to Firestore. */
const withoutFile = paymentObj => {
  const { file, ...rest } = paymentObj;
  return rest;
};

/**
 * Looks up each entry of `items` in `collectionName` by `idField`, applies
 * `buildUpdate` to it, and returns the updated documents.
 */
const updateRelatedDocs = async (collectionName, items, idField, buildUpdate) => {
  const updated = [];

  for (const item of items) {
    const snapshot = await getDocs(
      query(collection(db, collectionName), where(idField, '==', item[idField])),
    );

    for (const found of snapshot.docs) {
      const targetRef = doc(db, `${collectionName}/${found.data()[idField]}`);
      const targetSnapshot = await getDoc(targetRef);
      if (!targetSnapshot.exists()) continue;

      await updateDoc(targetRef, buildUpdate(item, found.data()));
      const stored = await getDoc(targetRef);
      updated.push(stored.data());
    }
  }

  return updated;
};

/** Guards against re-submitting the same payment id twice. */
const createPaymentRequest = async (path, paymentObj, onCreated) => {
  const paymentRequestRef = doc(db, `${path}/${paymentObj.paymentId}`);
  const snapShot = await getDoc(paymentRequestRef);

  if (snapShot.exists()) {
    notifyError('An error occurred. Please try again.');
    return undefined;
  }

  try {
    const payload = withoutFile(paymentObj);
    await setDoc(paymentRequestRef, payload);
    if (onCreated) await onCreated(payload);
    return payload;
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

/** Payment against "Buy & Ship for me" product requests. */
export const uploadPaymentRequest = async paymentObj =>
  createPaymentRequest('paymentRequest', paymentObj, async payload =>
    updateRelatedDocs('bookingRequest', payload.productRequestArray, 'bookingId', () => ({
      paymentStatus: 'pending',
    })),
  );

/** Same as above, flagged so the admin panel shows it under product requests. */
export const uploadPaymentRequest2 = async paymentObj => {
  const paymentRequestRef = doc(db, `paymentRequestApi/${paymentObj.paymentId}`);
  const snapShot = await getDoc(paymentRequestRef);

  if (snapShot.exists()) {
    notifyError('An error occurred. Please try again.');
    return undefined;
  }

  try {
    const payload = { ...withoutFile(paymentObj), productRequest: true };
    await setDoc(paymentRequestRef, payload);
    await updateRelatedDocs(
      'bookingRequest',
      paymentObj.productRequestArray,
      'bookingId',
      () => ({ paymentStatus: 'pending' }),
    );
    return payload;
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

/** Payment against a "Ship for me" booking. */
export const uploadShipmentPaymentRequest = async paymentObj =>
  createPaymentRequest('paymentRequest', paymentObj, async payload =>
    updateRelatedDocs('shipForMe', payload.productRequestArray, 'bookingId', () => ({
      paymentRequested: true,
    })),
  );

/**
 * Payment against D2D orders, applying the advance-payment discount.
 * `offer` arrives as a string like "10%".
 */
export const uploadPaymentRequestApi = async paymentObj =>
  createPaymentRequest('paymentRequestApi', paymentObj, async payload =>
    updateRelatedDocs(
      'ordersApi',
      payload.pendingOrders,
      'orderId',
      (shop, stored) => ({
        ...shop,
        orderTotal:
          stored.orderTotal -
          stored.orderTotal * (parseFloat(payload.offer.split('%')[0]) / 100),
      }),
    ),
  );

/** Payment against D2D orders with no discount — only flips the status. */
export const uploadPaymentRequestApi2 = async paymentObj =>
  createPaymentRequest('paymentRequestApi', paymentObj, async payload =>
    updateRelatedDocs('ordersApi', payload.pendingOrders, 'orderId', () => ({
      paymentStatus: 'pending',
    })),
  );

/**
 * Records a payment on an order and mirrors it onto the user's payment history.
 */
export const uploadPayment = async (payment, user) => {
  try {
    const paymentRef = doc(db, `payments/${payment.orderId}`);
    const snapShot = await getDoc(paymentRef);

    if (snapShot.exists()) {
      await updateDoc(paymentRef, {
        payments: [...snapShot.data().payments, payment],
      });
    } else {
      await setDoc(paymentRef, { payments: [payment] });
    }

    const userRef = doc(db, `users/${user.id}`);
    const userSnapShot = await getDoc(userRef);
    const previous = userSnapShot.data()?.paymentsArray || [];
    await updateDoc(userRef, { paymentsArray: [...previous, payment] });
  } catch (error) {
    notifyError(error);
  }
};

/**
 * Files a refund application and marks the underlying order or booking as
 * `refundStatus: 'requested'`.
 */
export const uploadRefundApply = async refundObj => {
  const refundRequestRef = doc(db, `refundRequest/${refundObj.refundId}`);
  const snapShot = await getDoc(refundRequestRef);

  if (snapShot.exists()) {
    notifyError('An error occurred. Please try again.');
    return undefined;
  }

  try {
    await setDoc(refundRequestRef, {
      ...refundObj,
      status: 'pending',
      time: refundObj.refundId,
    });

    const orderRef = refundObj.productRequest
      ? doc(db, `bookingRequest/${refundObj.order.bookingId}`)
      : doc(db, `ordersApi/${refundObj.order.orderId}`);

    await updateDoc(orderRef, { refundStatus: 'requested' });
    const stored = await getDoc(orderRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};
