import Toast from 'react-native-toast-message';

/**
 * The web data layer surfaced failures with bare `alert(error)` calls. Routing
 * them through one helper keeps that user-visible behaviour while giving us a
 * single place to swap in proper error reporting later.
 */
export const notifyError = (error, fallback = 'Something went wrong. Please try again.') => {
  const message =
    typeof error === 'string' ? error : error?.message || fallback;
  console.warn('[alg]', message, error);
  Toast.show({ type: 'error', text1: 'Error', text2: message });
};

export const notifySuccess = (text1, text2) =>
  Toast.show({ type: 'success', text1, text2 });

export const notifyInfo = (text1, text2) =>
  Toast.show({ type: 'info', text1, text2 });

export default { notifyError, notifySuccess, notifyInfo };
