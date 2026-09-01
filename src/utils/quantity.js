/**
 * Quantity stepping for products sold in fixed pack sizes.
 *
 * 1688 listings can carry a `batch` (minimum multiple): a product with
 * `batch: 6` is only orderable in 6s. The web app snapped to the nearest
 * multiple with `Math.ceil`/`Math.floor` in several places; this is that rule
 * in one place, used by both the product detail and cart steppers.
 */

export const stepUp = (current, batch = 1) => {
  const size = Number(batch) > 1 ? Number(batch) : 1;
  const value = Number(current) || 0;
  if (size === 1) return value + 1;
  // Snap up to the next multiple, or add a whole batch if already on one.
  const next = Math.floor(value / size) * size + size;
  return next > value ? next : value + size;
};

export const stepDown = (current, batch = 1, min = 0) => {
  const size = Number(batch) > 1 ? Number(batch) : 1;
  const value = Number(current) || 0;
  if (size === 1) return Math.max(min, value - 1);
  const next = Math.ceil(value / size) * size - size;
  return Math.max(min, next < value ? next : value - size);
};

/** Rounds a typed quantity up to a whole batch and clamps it to stock. */
export const normalizeQuantity = (value, batch = 1, available) => {
  const size = Number(batch) > 1 ? Number(batch) : 1;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  const snapped = size === 1 ? parsed : Math.ceil(parsed / size) * size;
  const stock = Number(available);
  return Number.isFinite(stock) && stock > 0 ? Math.min(snapped, stock) : snapped;
};

export default { stepUp, stepDown, normalizeQuantity };
