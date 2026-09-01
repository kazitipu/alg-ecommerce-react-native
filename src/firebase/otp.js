import axios from 'axios';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';

import { db } from './app';
import { signInWithToken } from './auth';
import { createUserProfileDocument } from './users';
import { ENDPOINTS } from '../constants/config';
import { notifyError } from '../utils/notify';

/**
 * Phone login.
 *
 * This is ALG's own OTP flow, not Firebase Phone Auth — the backend sends the
 * SMS and, once the code checks out, mints a Firebase custom token. Because no
 * reCAPTCHA is involved, it ports to React Native unchanged.
 *
 *   1. the login screen calls the backend to send an SMS
 *   2. `sendOtp` mirrors the code into `otpSms/{number}`
 *   3. `verifyOtp` compares the entered code, ensures a user profile exists,
 *      asks the backend for a custom token and signs in with it
 */

/** The code is valid for 60 seconds, enforced by a client-side delete. */
const OTP_TTL_MS = 60000;

export const sendOtp = async (number, otp) => {
  const otpRef = doc(db, `otpSms/${number}`);

  try {
    const snapShot = await getDoc(otpRef);
    if (!snapShot.exists()) {
      await setDoc(otpRef, { number, otp });
    } else {
      await updateDoc(otpRef, { number, otp });
    }

    setTimeout(() => {
      deleteDoc(otpRef).catch(() => {});
    }, OTP_TTL_MS);
  } catch (error) {
    notifyError(error);
  }
};

export const verifyOtp = async (number, otp) => {
  const otpRef = doc(db, `otpSms/${number}`);
  const snapShot = await getDoc(otpRef);

  if (!snapShot.exists()) {
    notifyError('Your OTP has expired. Please try again.');
    return { displayName: '', email: '' };
  }

  try {
    // eslint-disable-next-line eqeqeq
    if (snapShot.data().otp != otp) {
      notifyError('That code is not correct. Please try again.');
      return undefined;
    }

    // Phone-only accounts use the number itself as the uid.
    const userAuth = {
      uid: number,
      id: number,
      email: '',
      displayName: number,
    };

    const userRef = await createUserProfileDocument(userAuth, {
      mobileNo: `${number}`,
    });

    const { data } = await axios.get(ENDPOINTS.verifyOtp(number));
    if (data?.token) {
      await signInWithToken(data.token);
    }

    if (!userRef) return undefined;
    const userObj = await getDoc(userRef);
    return userObj.data();
  } catch (error) {
    notifyError(error);
    return undefined;
  }
};
