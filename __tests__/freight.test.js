/**
 * Freight quoting for "Ship for me". These bands decide what a customer is
 * quoted, so each boundary is pinned against the web app's behaviour.
 */
import {
  SHIP_FROM_BY_METHOD,
  SHIP_METHODS,
  getValidToDate,
  quoteFreight,
} from '../src/utils/freight';

const RATES = [
  {
    id: 'general',
    name: 'General goods',
    // sea bands
    '100kg': 200,
    below_1000kg: 180,
    above_1000kg: 150,
    // air bands
    parcel: 900,
    ten: 750,
    eleven: 700,
  },
];

const quote = (weight, method) =>
  quoteFreight({ weight, productTypeId: 'general', rates: RATES, method });

describe('sea freight bands', () => {
  it('uses the 100kg rate up to and including 100kg', () => {
    expect(quote(50, SHIP_METHODS.SEA)).toEqual({ result: 10000, perKg: 200 });
    expect(quote(100, SHIP_METHODS.SEA)).toEqual({ result: 20000, perKg: 200 });
  });

  it('uses the sub-1000kg rate just past 100kg', () => {
    expect(quote(101, SHIP_METHODS.SEA)).toEqual({ result: 18180, perKg: 180 });
    expect(quote(1000, SHIP_METHODS.SEA)).toEqual({ result: 180000, perKg: 180 });
  });

  it('uses the bulk rate above 1000kg', () => {
    expect(quote(1001, SHIP_METHODS.SEA)).toEqual({ result: 150150, perKg: 150 });
  });
});

describe('air freight bands', () => {
  it('charges a flat parcel fee up to 0.3kg', () => {
    const result = quote(0.2, SHIP_METHODS.AIR);
    expect(result.result).toBe(900);
    // The flat fee shown as an equivalent per-kg figure, as on the web.
    expect(result.perKg).toBe(3000);
  });

  it('switches to the per-kg rate past 0.3kg', () => {
    expect(quote(5, SHIP_METHODS.AIR)).toEqual({ result: 3750, perKg: 750 });
    expect(quote(10, SHIP_METHODS.AIR)).toEqual({ result: 7500, perKg: 750 });
  });

  it('uses the heavy rate above 10kg', () => {
    expect(quote(11, SHIP_METHODS.AIR)).toEqual({ result: 7700, perKg: 700 });
  });
});

describe('invalid input', () => {
  it('returns null for an unknown product type', () => {
    expect(
      quoteFreight({ weight: 10, productTypeId: 'ghost', rates: RATES, method: 'sea' }),
    ).toBeNull();
  });

  it('returns null for a missing or non-positive weight', () => {
    expect(quote('', SHIP_METHODS.SEA)).toBeNull();
    expect(quote(0, SHIP_METHODS.SEA)).toBeNull();
    expect(quote(-5, SHIP_METHODS.SEA)).toBeNull();
    expect(quote('abc', SHIP_METHODS.SEA)).toBeNull();
  });

  it('returns null when no rates have loaded', () => {
    expect(
      quoteFreight({ weight: 10, productTypeId: 'general', rates: [], method: 'sea' }),
    ).toBeNull();
  });
});

describe('origin countries', () => {
  it('offers India by air only, matching the web app', () => {
    expect(SHIP_FROM_BY_METHOD[SHIP_METHODS.AIR]).toContain('india');
    expect(SHIP_FROM_BY_METHOD[SHIP_METHODS.SEA]).not.toContain('india');
  });
});

describe('booking validity', () => {
  it('stays open for a week and rolls over month ends correctly', () => {
    // The web app did this rollover by hand; Date handles it.
    const validTo = getValidToDate(new Date('2026-01-28T00:00:00Z'));
    expect(validTo.toISOString().slice(0, 10)).toBe('2026-02-04');
  });

  it('rolls over a year end', () => {
    const validTo = getValidToDate(new Date('2026-12-30T00:00:00Z'));
    expect(validTo.toISOString().slice(0, 10)).toBe('2027-01-06');
  });
});
