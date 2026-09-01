/**
 * Product cards show 1688 prices, which arrive in CNY. They must be converted
 * with the `Currency/taka` rate before being labelled Tk — the web card does
 * `salePrice * taka`. Shipping the raw figure under a Tk label understates
 * every price by ~17x, so this is pinned.
 */
import { formatPrice, toTaka } from '../src/utils/format';

describe('CNY to BDT conversion', () => {
  it('converts a marketplace price at the stored rate', () => {
    // ¥7 at 17.5 Tk/¥ is about Tk 123 — not "Tk 7".
    expect(toTaka(7, 17.5)).toBe(123);
    expect(toTaka(39, 17.5)).toBe(683);
  });

  it('accepts a string rate, as Firestore stores it', () => {
    expect(toTaka('7', '17.5')).toBe(123);
  });

  it('returns 0 rather than NaN for a missing rate or price', () => {
    expect(toTaka(7, undefined)).toBe(0);
    expect(toTaka(undefined, 17.5)).toBe(0);
    expect(toTaka('abc', 17.5)).toBe(0);
  });
});

describe('price formatting', () => {
  it('renders with the currency symbol and thousands separators', () => {
    expect(formatPrice(1250)).toBe('Tk 1,250');
    expect(formatPrice(123, 'Tk')).toBe('Tk 123');
  });

  it('degrades safely on bad input', () => {
    expect(formatPrice(undefined)).toBe('Tk 0');
    expect(formatPrice('abc')).toBe('Tk 0');
  });
});
