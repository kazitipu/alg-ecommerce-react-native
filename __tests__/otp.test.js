import { isValidBdMobile, otpRequestFailure, readOtpResponse } from '../src/utils/otp';

describe('phone sign-in rules', () => {
  it('accepts 11-digit numbers starting with 0', () => {
    expect(isValidBdMobile('01712345678')).toBe(true);
    expect(isValidBdMobile('8801712345678')).toBe(false);
    expect(isValidBdMobile('1712345678')).toBe(false);
    expect(isValidBdMobile('0171234567a')).toBe(false);
  });

  it('reads the gateway code like the web', () => {
    expect(readOtpResponse({ error: 0 })).toEqual({ ok: true });
    expect(readOtpResponse({ error: 417 })).toEqual({ ok: false, message: 'Insufficient balance', clearNumber: true });
    expect(readOtpResponse({ error: 416 }).clearNumber).toBe(false);
    expect(readOtpResponse({ error: 999 }).message).toBe('There was an error.Please try again later.');
    expect(readOtpResponse(undefined).ok).toBe(false);
  });

  it('explains rate limiting', () => {
    expect(otpRequestFailure({ response: { status: 429 } })).toBe('Too many requests. Please try again later.');
    expect(otpRequestFailure(new Error('x'))).toBe('There was an error. Please try again later.');
  });
});
