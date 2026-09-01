import {
  collection,
  deleteDoc,
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
 * The two freight services:
 *
 *  - `bookingRequest`  "Buy & Ship for me" — ALG purchases the goods for the customer
 *  - `shipForMe`       "Ship for me"       — the customer bought them; ALG only forwards
 *  - `shipForMeList`   the draft parcel list built up before a ship-for-me booking is sent
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

// --- Ship for me -------------------------------------------------------------

export const setShipForMe = async bookingObj => {
  const bookingRef = doc(db, `shipForMe/${bookingObj.bookingId}`);
  const snapShot = await getDoc(bookingRef);

  if (snapShot.exists()) {
    notifyError('There is already a booking with a similar id, please try again.');
    return undefined;
  }

  try {
    await setDoc(bookingRef, withoutFile(bookingObj));
    const stored = await getDoc(bookingRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const updateShipForMe = async bookingObj => {
  const bookingRef = doc(db, `shipForMe/${bookingObj.bookingId}`);
  const snapShot = await getDoc(bookingRef);

  try {
    await updateDoc(bookingRef, { ...snapShot.data(), ...withoutFile(bookingObj) });
    const stored = await getDoc(bookingRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const getSingleShipForMe = async bookingId => {
  try {
    const snapshot = await getDoc(doc(db, `shipForMe/${bookingId}`));
    return snapshot.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const getAllShipForMeOfSingleUser = userId => listByUser('shipForMe', userId);

export const updateShipmentRequest = async requestObj => {
  try {
    const requestRef = doc(db, `shipForMe/${requestObj.bookingId}`);
    await updateDoc(requestRef, { ...requestObj });
    const stored = await getDoc(requestRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

// --- Ship-for-me draft list --------------------------------------------------

export const uploadShipForMeList = async bookingObj => {
  const bookingId = generateBookingId();
  const bookingRef = doc(db, `shipForMeList/${bookingId}`);
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

export const updateShipForMeList = async bookingObj => {
  const bookingRef = doc(db, `shipForMeList/${bookingObj.bookingId}`);
  const snapShot = await getDoc(bookingRef);

  if (!snapShot.exists()) {
    notifyError('That parcel could not be found. Please try again.');
    return undefined;
  }

  try {
    const { bookingObj: nested, ...rest } = bookingObj;
    await updateDoc(bookingRef, rest);
    const stored = await getDoc(bookingRef);
    return stored.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const deleteShipForMeList = async bookingObj => {
  try {
    await deleteDoc(doc(db, `shipForMeList/${bookingObj.bookingId}`));
  } catch (error) {
    notifyError(error);
  }
};

/** Draft parcels are shown in entry order, not newest-first. */
export const getAllShipForMeList = userId =>
  listByUser('shipForMeList', userId, { sorted: false });
