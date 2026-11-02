import { PermissionsAndroid, Platform } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

/**
 * Invoice PDFs: made from the invoice HTML (react-native-html-to-pdf v1 —
 * `generatePDF`; the old default-export `convert` no longer exists, which made
 * both Save and Share fail), then shared through the system sheet or saved
 * where the customer can find them:
 *
 *  - Android 10+: the phone's Downloads, through the MediaStore
 *  - Android 7–9: Downloads after the storage permission
 *  - iOS: the share sheet, whose "Save to Files" keeps a copy
 */

export const invoiceFileName = number => `ALG-invoice-${String(number || 'invoice').replace(/[^\w-]/g, '_')}`;

// The last PDF made, reused while the invoice is unchanged (Save then Share).
let lastPdf = { html: null, path: null };

const RETRYABLE = /TIMEOUT|IN_PROGRESS|timed out|in progress/i;

const makePdf = async (html, number) => {
  if (lastPdf.html === html && lastPdf.path) {
    const exists = await ReactNativeBlobUtil.fs.exists(lastPdf.path).catch(() => false);
    if (exists) return lastPdf.path;
  }
  let result;
  try {
    result = await generatePDF({ html, fileName: invoiceFileName(number) });
  } catch (error) {
    // The converter gives up after 30 s on a slow phone; one more try usually works.
    if (!RETRYABLE.test(`${error?.code || ''} ${error?.message || ''}`)) throw error;
    result = await generatePDF({ html, fileName: invoiceFileName(number) });
  }
  const made = String(result?.filePath || '').replace(/^file:\/\//, '');
  if (!made) throw new Error('The invoice could not be generated.');
  // The converter adds a random number to the name; give the file a clean one.
  const path = `${made.slice(0, made.lastIndexOf('/'))}/${invoiceFileName(number)}.pdf`;
  if (path !== made) {
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => {});
    await ReactNativeBlobUtil.fs.mv(made, path);
  }
  lastPdf = { html, path };
  return path;
};

const share = path =>
  Share.open({
    url: `file://${path}`,
    type: 'application/pdf',
    filename: path.split('/').pop(),
    failOnCancel: false,
  });

export const shareInvoicePdf = async (html, number) => share(await makePdf(html, number));

/** Returns where it was saved: 'downloads', or 'shared' when the share sheet was used (iOS). */
export const saveInvoicePdf = async (html, number) => {
  const path = await makePdf(html, number);
  const name = `${invoiceFileName(number)}.pdf`;

  if (Platform.OS !== 'android') {
    await share(path);
    return 'shared';
  }

  if (Platform.Version >= 29) {
    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
      { name, parentFolder: 'ALG', mimeType: 'application/pdf' },
      'Download',
      path,
    );
    return 'downloads';
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Allow storage access to save the invoice.');
  const target = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${name}`;
  await ReactNativeBlobUtil.fs.cp(path, target);
  await ReactNativeBlobUtil.fs.scanFile([{ path: target, mime: 'application/pdf' }]);
  return 'downloads';
};
