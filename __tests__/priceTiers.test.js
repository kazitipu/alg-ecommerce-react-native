/**
 * `price_range` tier resolution was duplicated four times in the web app with
 * slightly different index maths. These cases pin the single shared version to
 * the behaviour the web app actually shipped.
 */
import {
  findTierIndex,
  getTierPriceInTaka,
  getTierUnitPrice,
  parsePriceRange,
} from '../src/utils/priceTiers';

// [minQuantity, unitPriceCNY]
const TIERS = [
  [2, 10],
  [100, 8],
  [500, 6],
];

describe('parsePriceRange', () => {
  it('accepts the JSON string Firestore stores', () => {
    expect(parsePriceRange('[[2,10],[100,8]]')).toEqual([[2, 10], [100, 8]]);
  });

  it('passes arrays through and degrades safely', () => {
    expect(parsePriceRange(TIERS)).toBe(TIERS);
    expect(parsePriceRange('')).toEqual([]);
    expect(parsePriceRange(undefined)).toEqual([]);
    expect(parsePriceRange('not json')).toEqual([]);
  });
});

describe('findTierIndex', () => {
  it('treats the first tier as starting at zero', () => {
    // A single unit still prices at tier 0 even though it starts at 2.
    expect(findTierIndex(TIERS, 1)).toBe(0);
    expect(findTierIndex(TIERS, 50)).toBe(0);
  });

  it('moves up exactly on a threshold', () => {
    expect(findTierIndex(TIERS, 99)).toBe(0);
    expect(findTierIndex(TIERS, 100)).toBe(1);
    expect(findTierIndex(TIERS, 499)).toBe(1);
    expect(findTierIndex(TIERS, 500)).toBe(2);
  });

  it('keeps the last tier open-ended', () => {
    expect(findTierIndex(TIERS, 100000)).toBe(2);
  });

  it('reports no tier when there is no range', () => {
    expect(findTierIndex([], 10)).toBe(-1);
  });
});

describe('pricing', () => {
  it('returns the unit price for the active tier', () => {
    expect(getTierUnitPrice(TIERS, 50)).toBe(10);
    expect(getTierUnitPrice(TIERS, 250)).toBe(8);
    expect(getTierUnitPrice(TIERS, 900)).toBe(6);
    expect(getTierUnitPrice([], 900)).toBe(0);
  });

  it('converts to taka and rounds, as the web app did', () => {
    expect(getTierPriceInTaka(TIERS, 50, 17.5)).toBe(175);
    expect(getTierPriceInTaka(TIERS, 250, 17.5)).toBe(140);
    expect(getTierPriceInTaka(TIERS, 900, '17.5')).toBe(105);
  });

  it('yields zero when the product has no tiers', () => {
    expect(getTierPriceInTaka('', 10, 17.5)).toBe(0);
  });
});
