/**
 * Coupon validation and discount maths.
 *
 * A coupon must clear four gates before it applies: it must exist, the order
 * must reach its `minimumOrder`, it must not have expired, and the customer
 * must not have used it more than `usageLimit` times. Percentage discounts are
 * additionally capped at `maximumDiscount`.
 */

/** The web's messages (`placeOrder.jsx` → `handleAddCoupon`). */
export const COUPON_ERRORS = {
  EMPTY: 'Please add a coupon code first.',
  NOT_FOUND: 'No coupon available with this coupon code. try another',
  EXPIRED: 'Sorry this coupon has expired!.',
  MINIMUM: minimum => `your minimum order amount must be ${minimum}Tk`,
  LIMIT: limit =>
    `You've already used this coupon more than the maximum usage limit: ${limit}`,
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

  // As on the web (`expirationDate >= today`), an unreadable date counts as expired.
  const expiresAt = new Date(coupon.expirationDate).getTime();
  if (!(expiresAt >= Date.now())) {
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

/**
 * Bumps the customer's per-coupon usage counter for `users/{uid}`. Like the
 * web, a first use stores the whole coupon with `used: 1`.
 */
export const withCouponUsage = (currentUser, coupon) => {
  const existing = currentUser?.usedCoupons || [];
  const already = existing.find(entry => entry.id === coupon.id);

  return already
    ? existing.map(entry =>
        entry.id === coupon.id ? { ...entry, used: parseInt(entry.used, 10) + 1 } : entry,
      )
    : [...existing, { ...coupon, used: 1 }];
};

export default { validateCoupon, getCouponAmount, withCouponUsage, COUPON_ERRORS };
