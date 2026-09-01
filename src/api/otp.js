import client from './client';

/**
 * Asks the backend to text a login code. The code itself is mirrored into
 * `otpSms/{number}` in Firestore, which is what `verifyOtp` compares against.
 */
export const sendOtpSms = async phoneNumber => {
  const { data } = await client.get(`/api/v1/otp-sms-send/${phoneNumber}`);
  return data;
};
