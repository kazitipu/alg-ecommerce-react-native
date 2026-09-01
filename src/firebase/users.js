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
 * Sequential customer number. Read-modify-write, exactly as on the web — it is
 * racy under concurrent signups, which is why `createUserProfileDocument`
 * re-checks for a collision and retries.
 */
const incrementUserCountByOne = async () => {
  const countRef = doc(db, 'userCount/count');
  const snapShot = await getDoc(countRef);

  try {
    if (!snapShot.exists()) {
      await setDoc(countRef, { userCount: 1 });
    } else {
      await updateDoc(countRef, { userCount: snapShot.data().userCount + 1 });
    }
  } catch (error) {
    notifyError(error);
  }

  const updatedSnapShot = await getDoc(countRef);
  return updatedSnapShot.data().userCount;
};

/**
 * Ensures `users/{uid}` exists and returns its reference.
 *
 * Admins are skipped so staff accounts never get a customer profile, and if the
 * freshly allocated `userId` is already taken the whole function retries.
 * Returns the ref (not a snapshot) because callers attach an `onSnapshot`
 * listener to it.
 */
export const createUserProfileDocument = async (userAuth, additionalData) => {
  if (!userAuth) return undefined;
  if (userAuth.isAnonymous) return undefined;

  const userRef = doc(db, `users/${userAuth.uid}`);
  const adminRef = doc(db, `admins/${userAuth.uid}`);

  const adminSnapShot = await getDoc(adminRef);
  if (adminSnapShot.exists()) return undefined;

  const snapShot = await getDoc(userRef);
  if (!snapShot.exists()) {
    const { email, displayName } = userAuth;
    const createdAt = new Date();

    try {
      const userCount = await incrementUserCountByOne();

      const takenSnapshot = await getDocs(
        query(collection(db, 'users'), where('userId', '==', `${userCount}`)),
      );

      if (!takenSnapshot.empty) {
        // Number already handed out — take the next one.
        return createUserProfileDocument(userAuth, additionalData);
      }

      await setDoc(userRef, {
        userId: userCount < 10 ? `0${userCount}` : `${userCount}`,
        uid: userAuth.uid,
        id: userAuth.uid,
        ...(displayName ? { displayName } : {}),
        email,
        createdAt,
        ...additionalData,
        myWallet: 0,
        addresss: '',
        company: '',
        status: 'Customer',
        totalRecharge: 0,
      });
    } catch (error) {
      console.warn('error creating user', error.message);
    }
  }

  return userRef;
};

export const getSingleUser = async id => {
  try {
    const user = await getDoc(doc(db, `users/${id}`));
    return user.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};

export const updateUser = async user => {
  try {
    await updateDoc(doc(db, `users/${user.id}`), { ...user });
  } catch (error) {
    notifyError(error);
  }
};
