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

/**
 * The web names uploads after the file (`d2dExpressProduct/<name>`); a unique
 * prefix keeps two photos with the same name (e.g. "IMG_0001.JPG") from
 * overwriting each other.
 */
const fileNameOf = file =>
  `${generateUniqueId()}-${String(file?.fileName || file?.name || 'photo.jpg').replace(/[^\w.-]/g, '_')}`;

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

/** The customer's profile photo; one file per upload so old links keep working until replaced. */
export const uploadProfileImage = async (file, userId) => {
  try {
    return await uploadTo(`profileImages/${userId || 'unknown'}/${fileNameOf(file)}`, file);
  } catch (error) {
    return null;
  }
};
