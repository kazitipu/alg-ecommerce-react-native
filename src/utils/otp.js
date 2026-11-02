/**
 * Phone sign-in rules from the web login (`pages/login.jsx`): the number must
 * be 11 digits starting with 0 (no country code), and the SMS gateway answers
 * with an `error` code where 0 means the code was sent.
 */

export const OTP_TEXT = {
  invalidNumber: 'Enter valid mobile number without country code.',
  sent: 'An OTP was sent to you successfully!',
  fallback: 'There was an error.Please try again later.',
  tooMany: 'Too many requests. Please try again later.',
  network: 'There was an error. Please try again later.',
};

/** The gateway's error codes and the web's message for each. */
const GATEWAY_ERRORS = {
  400: 'The request was rejected, due to a missing or invalid parameter.',
  403: "You don't have permissions to perform the request.",
  404: 'The requested resource not found.',
  405: 'Authorization required.',
  409: 'Unknown error occurred on Server end.',
  410: 'Account expired',
  411: 'Reseller Account expired or suspended',
  412: 'Invalid Schedule',
  413: 'Invalid Sender ID',
  414: 'Message is empty',
  415: 'Message is too long',
  416: 'No valid number found',
  417: 'Insufficient balance',
  420: 'Content Blocked',
};

export const isValidBdMobile = number => {
  const value = String(number || '').trim();
  return value.length === 11 && value.startsWith('0') && /^\d+$/.test(value);
};

/**
 * `{ ok: true }` when the SMS went out, otherwise `{ ok: false, message,
 * clearNumber }`. Like the web, the typed number is cleared after a gateway
 * error, except "No valid number found" (416), where it is kept to be fixed.
 */
export const readOtpResponse = data => {
  const code = Number(data?.error);
  if (data && code === 0) return { ok: true };
  return { ok: false, message: GATEWAY_ERRORS[code] || OTP_TEXT.fallback, clearNumber: code !== 416 };
};

/** Message for a request that failed outright (network, 429 rate limit). */
export const otpRequestFailure = error =>
  error?.response?.status === 429 ? OTP_TEXT.tooMany : OTP_TEXT.network;

export default { isValidBdMobile, readOtpResponse, otpRequestFailure };
