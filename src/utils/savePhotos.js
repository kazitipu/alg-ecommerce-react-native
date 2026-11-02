import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

/**
 * Saves product photos where the customer will find them: the phone's photo
 * gallery, in an "ALG" album.
 *
 *  - Android 10+ (API 29): through the MediaStore — apps may no longer write
 *    into shared folders such as Download directly, which is why the old
 *    direct-to-DownloadDir save silently produced nothing.
 *  - Android 7–9: the classic storage permission, then a media scan so the
 *    files show up in the gallery.
 *  - iOS: the share sheet with the downloaded files, whose "Save N Images"
 *    puts them in Photos.
 */

const ALBUM = 'ALG';

/** Marketplace links sometimes come as http:// or protocol-less //. */
export const cleanImageUrl = url =>
  String(url || '')
    .trim()
    .replace(/^\/\//, 'https://')
    .replace(/^http:\/\//i, 'https://');

/** The image type from the response, else from the link's extension. */
export const imageTypeOf = (url, contentType) => {
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (type.startsWith('image/')) return type;
  const ext = String(url).split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

const extensionOf = type => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[type] || 'jpg');

const download = async (url, index, productId) => {
  // Fetched into memory and written out here: the library's stream-to-file
  // mode aborted every photo with "Download interrupted." on Android.
  const response = await ReactNativeBlobUtil.fetch('GET', cleanImageUrl(url), {
    // The image CDNs refuse some requests without a browser-like agent.
    'User-Agent': 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  });
  const info = response.info();
  if (info.status < 200 || info.status >= 300) {
    throw new Error(`Photo ${index + 1} could not be downloaded (${info.status}).`);
  }
  const headers = info.headers || {};
  const type = imageTypeOf(url, headers['Content-Type'] || headers['content-type']);
  const name = `alg-${productId}-${index + 1}.${extensionOf(type)}`;
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${Date.now()}-${name}`;
  await ReactNativeBlobUtil.fs.writeFile(path, response.base64(), 'base64');
  return { path, type, name };
};

const askLegacyPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version >= 29) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
    title: 'Save photos',
    message: 'Allow ALG to save product photos to your gallery.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const saveOnAndroid = async file => {
  if (Platform.Version >= 29) {
    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      { name: file.name, parentFolder: ALBUM, mimeType: file.type },
      'Image',
      file.path,
    );
  } else {
    const folder = `${ReactNativeBlobUtil.fs.dirs.PictureDir}/${ALBUM}`;
    if (!(await ReactNativeBlobUtil.fs.isDir(folder))) await ReactNativeBlobUtil.fs.mkdir(folder);
    const target = `${folder}/${file.name}`;
    await ReactNativeBlobUtil.fs.cp(file.path, target);
    await ReactNativeBlobUtil.fs.scanFile([{ path: target, mime: file.type }]);
  }
  await ReactNativeBlobUtil.fs.unlink(file.path).catch(() => {});
};

/**
 * Downloads and saves `images`. `onProgress(done, total)` reports each photo.
 * Resolves to `{ saved, failed, cancelled }`.
 */
export const saveProductPhotos = async (images, { productId = 'product', onProgress } = {}) => {
  const list = (images || []).filter(Boolean);
  if (!(await askLegacyPermission())) return { saved: 0, failed: 0, cancelled: true, denied: true };

  const files = [];
  let failed = 0;
  for (let index = 0; index < list.length; index++) {
    try {
      const file = await download(list[index], index, productId);
      if (Platform.OS === 'android') await saveOnAndroid(file);
      files.push(file);
    } catch (error) {
      failed += 1;
      if (__DEV__) console.warn('[savePhotos]', index + 1, error?.message || error);
    }
    onProgress?.(index + 1, list.length);
  }

  if (Platform.OS === 'ios' && files.length > 0) {
    const result = await Share.open({
      urls: files.map(file => `file://${file.path}`),
      type: files[0].type,
      failOnCancel: false,
    });
    const cancelled = result?.dismissedAction === true || result?.success === false;
    return { saved: cancelled ? 0 : files.length, failed, cancelled };
  }

  return { saved: files.length, failed, cancelled: false };
};

export default saveProductPhotos;
