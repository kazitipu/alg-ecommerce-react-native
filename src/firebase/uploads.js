import { getDownloadURL, putFile, ref } from '@react-native-firebase/storage';

import { storage } from './app';
import { generateUniqueId } from '../utils/ids';

/**
 * Storage uploads.
 *
 * The web app passed browser `File` objects to `put()`. React Native has no
 * `File`, so these take the shape the image picker returns —
 * `{ uri, fileName }` — and stream the local file with `putFile(uri)`.
 * `name` is accepted as an alias for `fileName` so callers can pass either.
 */
const uploadTo = async (path, file) => {
  const localUri = file?.uri || file;
  const fileRef = ref(storage, path);
  await putFile(fileRef, localUri);
  return getDownloadURL(fileRef);
};

const fileNameOf = file =>
  file?.fileName || file?.name || `${generateUniqueId()}.jpg`;

/** Bank/bKash slip attached to a payment. */
export const uploadImage = async file =>
  uploadTo(`payments/${generateUniqueId()}`, file);

/** Product photo attached to a door-to-door shipping request. */
export const uploadImageProduct = async file => {
  try {
    return await uploadTo(`d2dExpressProduct/${fileNameOf(file)}`, file);
  } catch (error) {
    return null;
  }
};

/** Slip attached to a wallet recharge or manual payment request. */
export const uploadImageRechargeRequest = async file => {
  try {
    return await uploadTo(`rechargeRequests/${fileNameOf(file)}`, file);
  } catch (error) {
    return null;
  }
};
