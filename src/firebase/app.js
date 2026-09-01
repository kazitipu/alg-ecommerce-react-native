import { getApp } from '@react-native-firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

/**
 * Firebase handles for the whole app.
 *
 * Unlike the web build there is no `initializeApp(config)` call here: the native
 * SDK configures itself from `android/app/google-services.json` and
 * `ios/GoogleService-Info.plist`, which must be generated from the
 * `alg-ecommerce-a9a51` console for the `com.alglimited.ecommerce` app ids.
 * `src/constants/config.js` keeps the same values for reference and for the
 * REST endpoints that need the project id.
 */
export const app = getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Kept for import parity with the web module. On the web these were passed to
 * `signInWithPopup`, which does not exist in React Native — `signInWithGoogle`
 * uses the native Google Sign-In SDK and exchanges its token for a Firebase
 * credential instead.
 */
export { GoogleAuthProvider, FacebookAuthProvider };

/** Web code referenced `firestore` directly; alias so ported screens still work. */
export const firestore = db;

export default app;
