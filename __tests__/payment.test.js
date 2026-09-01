/**
 * The WebView watches every navigation for the gateway's redirect back into the
 * app. Missing it would strand the customer on a payment page after they have
 * already paid; false-positives would close the WebView mid-payment.
 */
import { parsePaymentReturn } from '../src/utils/payment';
import { PAYMENT_RETURN_URLS } from '../src/constants/config';

const RETURN_URL = PAYMENT_RETURN_URLS[0];

describe('detecting the gateway redirect', () => {
  it('reads the status off a return URL', () => {
    expect(parsePaymentReturn(`${RETURN_URL}?paymentStatus=success`)).toBe('success');
    expect(parsePaymentReturn(`${RETURN_URL}?paymentStatus=cancel`)).toBe('cancel');
    expect(parsePaymentReturn(`${RETURN_URL}?paymentStatus=failure`)).toBe('failure');
  });

  it('finds the status among other query parameters', () => {
    expect(
      parsePaymentReturn(`${RETURN_URL}?trxId=ABC123&paymentStatus=success&x=1`),
    ).toBe('success');
  });

  it('treats a return URL with no status as success', () => {
    // Any redirect back means the gateway finished with us.
    expect(parsePaymentReturn(RETURN_URL)).toBe('success');
  });

  it('recognises every configured return URL', () => {
    PAYMENT_RETURN_URLS.forEach(url => {
      expect(parsePaymentReturn(`${url}?paymentStatus=success`)).toBe('success');
    });
  });
});

describe('ignoring everything else', () => {
  it('ignores the gateway pages themselves', () => {
    expect(parsePaymentReturn('https://tokenized.sandbox.bka.sh/checkout')).toBeNull();
    expect(parsePaymentReturn('https://sandbox.sslcommerz.com/pay')).toBeNull();
  });

  it('ignores a lookalike host', () => {
    expect(
      parsePaymentReturn('https://evil.example.com/alg.com.bd?paymentStatus=success'),
    ).toBeNull();
  });

  it('ignores empty input', () => {
    expect(parsePaymentReturn('')).toBeNull();
    expect(parsePaymentReturn(undefined)).toBeNull();
  });

  it('decodes an encoded status value', () => {
    expect(parsePaymentReturn(`${RETURN_URL}?paymentStatus=payment%20failed`)).toBe(
      'payment failed',
    );
  });
});
