import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { auth } from './app';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';
import { notifyError } from '../utils/notify';

/**
 * Authentication.
 *
 * Email/password, password reset and custom-token sign-in behave identically to
 * the web app. Social sign-in does not: the web used
 * `auth.signInWithPopup(provider)`, which has no React Native equivalent, so
 * Google goes through the native Sign-In SDK and exchanges the returned ID
 * token for a Firebase credential.
 */

let googleConfigured = false;

const configureGoogleSignIn = () => {
  if (googleConfigured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
};

export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const sendResetPasswordEmail = email =>
  sendPasswordResetEmail(auth, email);

export const signInWithToken = token => signInWithCustomToken(auth, token);

export const logout = () => signOut(auth);

/**
 * Requires `GOOGLE_WEB_CLIENT_ID` and, on Android, the debug/release keystore
 * SHA-1 registered against the Firebase Android app.
 */
export const signInWithGoogle = async () => {
  if (!GOOGLE_WEB_CLIENT_ID) {
    notifyError('Google Sign-In is not configured yet.');
    return undefined;
  }

  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    const idToken = response?.data?.idToken || response?.idToken;
    if (!idToken) return undefined;

    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    notifyError(error, 'Could not sign in with Google.');
    return undefined;
  }
};

/**
 * Facebook login is not wired up. The web app offered it via
 * `signInWithPopup`, which React Native cannot use; enabling it here needs
 * `react-native-fbsdk-next` plus a Facebook app configured for iOS/Android.
 * Kept as a named export so ported screens still import cleanly.
 */
export const singInWithFacebook = async () => {
  notifyError('Facebook sign-in is not available in the app yet.');
  return undefined;
};

export { auth };
