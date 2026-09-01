/**
 * 1688 products are sold on quantity tiers: `price_range` is a list of
 * `[minQuantity, unitPrice]` pairs and the unit price drops as the order grows.
 *
 * The web app re-derived the active tier inline in at least four places
 * (product detail, cart, place-order and the Firestore cart merge), each with a
 * subtly different copy of the same index maths. This is that logic, once.
 */

/** `price_range` is stored as a JSON string in Firestore but as an array in the API. */
export const parsePriceRange = priceRange => {
  if (!priceRange) return [];
  if (Array.isArray(priceRange)) return priceRange;
  try {
    const parsed = JSON.parse(priceRange);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

/**
 * Index of the tier that applies at `totalQuantity`.
 *
 * The first tier's threshold is treated as 0 so that any quantity below the
 * second threshold falls into it — this mirrors the web app, where a product
 * whose cheapest tier starts at 2 still prices a single unit at tier 0.
 */
export const findTierIndex = (priceRange, totalQuantity) => {
  const tiers = parsePriceRange(priceRange);
  if (tiers.length === 0) return -1;

  const quantity = parseInt(totalQuantity, 10) || 0;
  const thresholds = tiers.map((tier, index) =>
    index === 0 ? 0 : parseInt(tier[0], 10),
  );

  return thresholds.findIndex(
    (threshold, index, all) =>
      quantity >= threshold && quantity < (all[index + 1] || quantity + 1),
  );
};

/** Unit price in CNY at the given quantity, or 0 when there are no tiers. */
export const getTierUnitPrice = (priceRange, totalQuantity) => {
  const tiers = parsePriceRange(priceRange);
  const index = findTierIndex(priceRange, totalQuantity);
  if (index === -1 || !tiers[index]) return 0;
  return parseFloat(tiers[index][1]);
};

/** Unit price converted to BDT and rounded, matching the web app's arithmetic. */
export const getTierPriceInTaka = (priceRange, totalQuantity, taka) => {
  const unitPrice = getTierUnitPrice(priceRange, totalQuantity);
  if (!unitPrice) return 0;
  return Math.round(unitPrice * parseFloat(taka));
};

export default {
  parsePriceRange,
  findTierIndex,
  getTierUnitPrice,
  getTierPriceInTaka,
};
