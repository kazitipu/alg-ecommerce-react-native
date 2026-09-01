/**
 * Door-to-door freight quoting for the "Ship for me" service.
 *
 * Rates come from Firestore collections named `d2d-rates-{method}-{country}`,
 * and each product type carries a rate per weight band:
 *
 *   sea: 100kg (<=100), below_1000kg (100-1000), above_1000kg (>1000)
 *   air: parcel (<=0.3kg flat), ten (0.3-10kg), eleven (>10kg)
 *
 * Air's `parcel` band is a flat fee rather than a per-kg rate; the web app
 * still displayed a notional per-kg figure for it (the flat fee x 3.33, i.e.
 * divided by the 0.3kg band), which is reproduced here so the quote matches.
 */

export const SHIP_METHODS = {
  SEA: 'sea',
  AIR: 'air',
};

/** Air adds India; the web app's country lists differ per method. */
export const SHIP_FROM_BY_METHOD = {
  [SHIP_METHODS.SEA]: ['china', 'uk', 'usa', 'hongkong', 'thailand'],
  [SHIP_METHODS.AIR]: ['china', 'uk', 'usa', 'hongkong', 'thailand', 'india'],
};

const PARCEL_BAND_KG = 0.3;

/**
 * Quotes a shipment.
 * Returns `{ result, perKg }` in taka, or null when the rate is unknown.
 */
export const quoteFreight = ({ weight, productTypeId, rates, method }) => {
  const rate = (rates || []).find(entry => entry.id === productTypeId);
  const kg = parseFloat(weight);

  if (!rate || !Number.isFinite(kg) || kg <= 0) return null;

  if (method === SHIP_METHODS.SEA) {
    if (kg <= 100) {
      return { result: Math.round(kg * rate['100kg']), perKg: rate['100kg'] };
    }
    if (kg <= 1000) {
      return {
        result: Math.round(kg * rate.below_1000kg),
        perKg: rate.below_1000kg,
      };
    }
    return {
      result: Math.round(kg * rate.above_1000kg),
      perKg: rate.above_1000kg,
    };
  }

  // Air
  if (kg <= PARCEL_BAND_KG) {
    return {
      result: rate.parcel,
      // The flat parcel fee expressed per-kg, as the web app displayed it.
      perKg: Math.round(rate.parcel / PARCEL_BAND_KG),
    };
  }
  if (kg <= 10) {
    return { result: Math.round(kg * rate.ten), perKg: rate.ten };
  }
  return { result: Math.round(kg * rate.eleven), perKg: rate.eleven };
};

/**
 * A booking stays open for a week. The web app did this month/year rollover by
 * hand; `Date` handles it correctly on its own.
 */
export const getValidToDate = (from = new Date(), days = 7) => {
  const validTo = new Date(from);
  validTo.setDate(validTo.getDate() + days);
  return validTo;
};

export default { quoteFreight, getValidToDate, SHIP_METHODS, SHIP_FROM_BY_METHOD };
