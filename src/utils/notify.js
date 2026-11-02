import Toast from 'react-native-toast-message';

/**
 * The web data layer surfaced failures with bare `alert(error)` calls. Routing
 * them through one helper keeps that user-visible behaviour while giving us a
 * single place to swap in proper error reporting later.
 *
 * Toasts render with `ToastCard` (see App.js). Each one gets an id so its
 * entrance and countdown restart even when the same message shows twice.
 */
const DURATION = { success: 3200, info: 3200, error: 4500 };

let nextId = 0;

const show = (type, text1, text2) => {
  nextId += 1;
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime: DURATION[type],
    props: { id: nextId, duration: DURATION[type] },
  });
};

export const notifyError = (error, fallback = 'Something went wrong. Please try again.') => {
  const message =
    typeof error === 'string' ? error : error?.message || fallback;
  console.warn('[alg]', message, error);
  show('error', 'Oops! Something went wrong', message);
};

export const notifySuccess = (text1, text2) => show('success', text1, text2);

export const notifyInfo = (text1, text2) => show('info', text1, text2);

export default { notifyError, notifySuccess, notifyInfo };
