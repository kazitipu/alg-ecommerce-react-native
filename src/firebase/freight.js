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
import { generateBookingId } from '../utils/ids';

/**
 * Freight bookings: `bookingRequest` holds "Buy & Ship for me" requests, where
 * ALG purchases the goods for the customer. (The "Ship for me" forwarding
 * service and its `shipForMe` / `shipForMeList` collections are no longer
 * offered, matching the website.)
 */

const docsToArray = snapshot => {
  const results = [];
  snapshot.forEach(document => results.push(document.data()));
  return results;
};

const byNewest = (a, b) => b.time - a.time;

/** `file` holds a local image handle that must not be written to Firestore. */
const withoutFile = bookingObj => {
  const { file, ...rest } = bookingObj;
  return rest;
};

const listByUser = async (path, userId, { sorted = true } = {}) => {
  try {
    const snapshot = await getDocs(
      query(collection(db, path), where('userId', '==', userId)),
    );
    const results = docsToArray(snapshot);
    return sorted ? results.sort(byNewest) : results;
  } catch (error) {
    notifyError(error);
    return [];
  }
};

// --- Buy & Ship for me -------------------------------------------------------

export const setProductRequest = async bookingObj => {
  const bookingId = generateBookingId();
  const bookingRef = doc(db, `bookingRequest/${bookingId}`);
  const snapShot = await getDoc(bookingRef);

  if (snapShot.exists()) {
    notifyError('There is already a booking with a similar id, please try again.');
    return undefined;
  }

  try {
    await setDoc(bookingRef, { bookingId, ...withoutFile(bookingObj) });
    const stored = await getDoc(bookingRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const getSingleProductRequest = async id => {
  try {
    const snapshot = await getDoc(doc(db, `bookingRequest/${id}`));
    return snapshot.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

/**
 * Door-to-door shipping rates for one origin country (`d2d-rates-air-china`
 * etc.): each document is a product type (`id`) with its per-kg rate for 5 kg
 * and over (`eleven`). The request form lists them as the web does.
 */
export const getAllD2DRates = async (freightType, country) => {
  try {
    return docsToArray(await getDocs(collection(db, `d2d-rates-${freightType}-${country}`)));
  } catch (error) {
    notifyError(error);
    return [];
  }
};

export const getAllBookingsOfSingleUser = userId =>
  listByUser('bookingRequest', userId);

/** Bulk-marks a set of requests as awaiting payment after a payment is submitted. */
export const updateMultipleProductRequest = async productReqArray => {
  try {
    const updated = [];
    for (const booking of productReqArray) {
      const bookingRef = doc(db, `bookingRequest/${booking.bookingId}`);
      await updateDoc(bookingRef, { paymentStatus: 'pending' });
      updated.push(await getDoc(bookingRef));
    }
    return updated;
  } catch (error) {
    notifyError(error);
    return [];
  }
};
