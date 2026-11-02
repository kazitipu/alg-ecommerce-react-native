/**
 * Total cart lines, matching the web header badge: one per item in each shop
 * entry, or one for a shop entry that carries no items array.
 */
export const selectCartCount = cart =>
  (cart || []).reduce((total, shop) => total + (shop.items?.length || 1), 0);

export default selectCartCount;
