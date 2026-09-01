/**
 * Checkout maths: coupon gating and the `ordersApi` documents the freight
 * pipeline reads. Getting either wrong charges customers the wrong amount, so
 * these mirror the web app's rules exactly.
 */
import {
  COUPON_ERRORS,
  getCouponAmount,
  validateCoupon,
  withCouponUsage,
} from '../src/utils/coupon';
import { buildOrders, getShopTotal, summarizeOrder } from '../src/utils/order';

const FUTURE = '2099-01-01';
const PAST = '2000-01-01';

const percentCoupon = {
  id: 'c1',
  name: 'SAVE10',
  discountType: 'percentage',
  discountAmount: 10,
  maximumDiscount: 500,
  minimumOrder: 1000,
  usageLimit: 2,
  expirationDate: FUTURE,
};

describe('coupon validation', () => {
  it('accepts a valid coupon', () => {
    expect(validateCoupon(percentCoupon, 5000, {})).toEqual({
      valid: true,
      coupon: percentCoupon,
    });
  });

  it('rejects a missing coupon', () => {
    expect(validateCoupon(null, 5000, {}).reason).toBe(COUPON_ERRORS.NOT_FOUND);
  });

  it('rejects an order below the minimum', () => {
    const result = validateCoupon(percentCoupon, 500, {});
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('1000');
  });

  it('rejects an expired coupon', () => {
    const expired = { ...percentCoupon, expirationDate: PAST };
    expect(validateCoupon(expired, 5000, {}).reason).toBe(COUPON_ERRORS.EXPIRED);
  });

  it('rejects a coupon the customer has exhausted', () => {
    const user = { usedCoupons: [{ id: 'c1', used: 2 }] };
    expect(validateCoupon(percentCoupon, 5000, user).reason).toContain('2');
  });

  it('still accepts it below the usage limit', () => {
    const user = { usedCoupons: [{ id: 'c1', used: 1 }] };
    expect(validateCoupon(percentCoupon, 5000, user).valid).toBe(true);
  });
});

describe('discount amount', () => {
  it('takes a percentage of the order', () => {
    expect(getCouponAmount(percentCoupon, 2000)).toBe(200);
  });

  it('caps a percentage at the maximum discount', () => {
    // 10% of 100000 is 10000, capped to 500.
    expect(getCouponAmount(percentCoupon, 100000)).toBe(500);
  });

  it('applies a flat discount as-is', () => {
    const flat = { discountType: 'flat', discountAmount: 300 };
    expect(getCouponAmount(flat, 5000)).toBe(300);
  });

  it('is zero with no coupon', () => {
    expect(getCouponAmount(null, 5000)).toBe(0);
  });
});

describe('coupon usage tracking', () => {
  it('starts a counter for a first-time coupon', () => {
    expect(withCouponUsage({}, percentCoupon)).toEqual([{ id: 'c1', used: 1 }]);
  });

  it('increments an existing counter and leaves others alone', () => {
    const user = { usedCoupons: [{ id: 'c1', used: 1 }, { id: 'c2', used: 3 }] };
    expect(withCouponUsage(user, percentCoupon)).toEqual([
      { id: 'c1', used: 2 },
      { id: 'c2', used: 3 },
    ]);
  });
});

describe('order totals', () => {
  const shop = {
    shopId: 's1',
    shopName: 'Shop One',
    items: [
      {
        id: 'i1',
        skus: [
          { sku_id: 'a', price: 100, totalQuantity: 3 },
          { sku_id: 'b', price: 100, totalQuantity: 2 },
        ],
      },
    ],
  };

  it('totals a shop from price x quantity', () => {
    expect(getShopTotal(shop)).toBe(500);
  });

  it('summarises products, units and value across shops', () => {
    const summary = summarizeOrder([shop, shop]);
    expect(summary.totalAmount).toBe(1000);
    expect(summary.goodsCategory).toBe(2);
    expect(summary.totalQuantity).toBe(10);
  });
});

describe('buildOrders', () => {
  const shopA = {
    shopId: 's1',
    items: [{ id: 'i1', skus: [{ sku_id: 'a', price: 100, totalQuantity: 5 }] }],
  };
  const shopB = {
    shopId: 's2',
    items: [{ id: 'i2', skus: [{ sku_id: 'b', price: 200, totalQuantity: 5 }] }],
  };

  const build = overrides =>
    buildOrders({
      pendingOrders: [shopA, shopB],
      deliveryAddress: { name: 'Kazi' },
      currency: 17.5,
      createdAt: 'TS',
      ...overrides,
    });

  it('creates one order per shop, entering the pipeline at stage 1', () => {
    const orders = build({});
    expect(orders).toHaveLength(2);
    orders.forEach(order => {
      expect(order.shipmentStatusScore).toBe(1);
      expect(order.orderStatus).toBe('pending');
      expect(order.paymentStatus).toBe('purchaseLater');
      expect(order.websiteName).toBe('1688.com');
      expect(order.createdAt).toBe('TS');
      expect(order.deliveryAddress).toEqual({ name: 'Kazi' });
    });
  });

  it('splits a coupon evenly across shops', () => {
    const orders = build({ couponAmount: 300, coupon: percentCoupon });
    // 150 off each of the two shops.
    expect(orders[0].couponAmount).toBe(150);
    expect(orders[0].actualTotal).toBe(500);
    expect(orders[0].orderTotal).toBe(350);
    expect(orders[1].actualTotal).toBe(1000);
    expect(orders[1].orderTotal).toBe(850);
  });

  it('leaves totals untouched with no coupon', () => {
    const orders = build({});
    expect(orders[0].orderTotal).toBe(orders[0].actualTotal);
    expect(orders[0].couponAmount).toBe(0);
  });

  it('uses the quoted delivery charge, falling back to the flat rate', () => {
    const orders = build({ deliveryCharges: { s1: 220 } });
    expect(orders[0].deliveryCharge).toBe(220);
    expect(orders[1].deliveryCharge).toBe(100);
  });

  it('keeps an existing orderId and generates one otherwise', () => {
    const orders = buildOrders({
      pendingOrders: [{ ...shopA, orderId: 'existing' }],
      deliveryAddress: {},
      currency: 17.5,
      createdAt: 'TS',
    });
    expect(orders[0].orderId).toBe('existing');
    expect(build({})[0].orderId).toBeDefined();
  });
});
