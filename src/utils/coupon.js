/**
 * Coupon validation and discount maths.
 *
 * A coupon must clear four gates before it applies: it must exist, the order
 * must reach its `minimumOrder`, it must not have expired, and the customer
 * must not have used it more than `usageLimit` times. Percentage discounts are
 * additionally capped at `maximumDiscount`.
 */

export const COUPON_ERRORS = {
  NOT_FOUND: 'No coupon available with this code. Try another.',
  EXPIRED: 'Sorry, this coupon has expired.',
  MINIMUM: minimum => `Your minimum order amount must be ${minimum} Tk.`,
  LIMIT: limit => `You've already used this coupon the maximum ${limit} times.`,
};

/**
 * Checks a coupon against the order and the customer.
 * Returns `{ valid: true, coupon }` or `{ valid: false, reason }`.
 */
export const validateCoupon = (coupon, totalAmount, currentUser) => {
  if (!coupon) return { valid: false, reason: COUPON_ERRORS.NOT_FOUND };

  if (coupon.minimumOrder > totalAmount) {
    return { valid: false, reason: COUPON_ERRORS.MINIMUM(coupon.minimumOrder) };
  }

  const expiresAt = new Date(coupon.expirationDate).getTime();
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    return { valid: false, reason: COUPON_ERRORS.EXPIRED };
  }

  const used = (currentUser?.usedCoupons || []).find(
    entry => entry.id === coupon.id,
  );
  if (used && used.used >= coupon.usageLimit) {
    return { valid: false, reason: COUPON_ERRORS.LIMIT(coupon.usageLimit) };
  }

  return { valid: true, coupon };
};

/** Discount in taka: a capped percentage, or a flat amount. */
export const getCouponAmount = (coupon, totalAmount) => {
  if (!coupon) return 0;

  if (coupon.discountType === 'percentage') {
    const amount = (totalAmount * coupon.discountAmount) / 100;
    return amount > coupon.maximumDiscount ? coupon.maximumDiscount : amount;
  }

  return coupon.discountAmount;
};

/** Bumps the customer's per-coupon usage counter for `users/{uid}`. */
export const withCouponUsage = (currentUser, coupon) => {
  const existing = currentUser?.usedCoupons || [];
  const already = existing.find(entry => entry.id === coupon.id);

  return already
    ? existing.map(entry =>
        entry.id === coupon.id ? { ...entry, used: entry.used + 1 } : entry,
      )
    : [...existing, { id: coupon.id, used: 1 }];
};

export default { validateCoupon, getCouponAmount, withCouponUsage, COUPON_ERRORS };
