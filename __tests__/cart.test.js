import {
  allKeys,
  buildCartSelection,
  lineTotal,
  minQuantity,
  orderSkuKey,
  shopKeys,
  validateTypedQuantity,
} from '../src/utils/cart';

const cart = [
  {
    shopId: 'shop-a',
    shopName: 'A',
    localShipping: '0',
    items: [{ id: 1, batch: '', skus: [{ sku_id: 11, totalQuantity: 2, price: 242 }, { sku_id: 12, totalQuantity: 1, price: 253 }] }],
  },
  {
    shopId: 'shop-a',
    shopName: 'A',
    items: [{ id: 2, batch: 6, skus: [{ sku_id: 21, totalQuantity: 6, price: 10.6 }] }],
  },
  { shopId: 'shop-b', shopName: 'B', items: [{ id: 3, skus: [{ sku_id: 31, totalQuantity: 3, price: 100 }] }] },
];

describe('cart rules', () => {
  it('keys skus as itemId-skuId and groups a shop across entries', () => {
    expect(allKeys(cart)).toEqual(['1-11', '1-12', '2-21', '3-31']);
    expect(shopKeys(cart, 'shop-a')).toEqual(['1-11', '1-12', '2-21']);
  });

  it('totals only the selected skus at their stored prices', () => {
    const selection = buildCartSelection(cart, new Set(['1-11', '2-21']));
    expect(selection.totalQuantity).toBe(8);
    expect(selection.totalAmount).toBe(484 + 63);
    expect(selection.shops).toHaveLength(2);
    // Shaped as the web's cart hands skus to checkout.
    expect(selection.shops[0].items[0].skus).toEqual([
      { sku_id: '1-11', totalQuantity: 2, price: 242, shopId: 'shop-a', itemId: 1 },
    ]);
    expect(selection.sellers).toBe(3);
    expect(selection.categories).toBe(3);
  });

  it('selects nothing by default', () => {
    const selection = buildCartSelection(cart, new Set());
    expect(selection.shops).toEqual([]);
    expect(selection.totalAmount).toBe(0);
  });

  it('truncates line totals like the web', () => {
    expect(lineTotal({ totalQuantity: 3, price: 10.6 })).toBe(31);
  });

  it('steps down no lower than a pack or one piece', () => {
    expect(minQuantity({ batch: 6 })).toBe(6);
    expect(minQuantity({ batch: '' })).toBe(1);
  });

  it('validates typed quantities with the web alerts', () => {
    expect(validateTypedQuantity('')).toEqual({ alert: "Can't be empty or 0" });
    expect(validateTypedQuantity('0')).toEqual({ alert: "Can't be empty or 0" });
    expect(validateTypedQuantity('100001')).toEqual({ alert: "Can't be more than 100000" });
    expect(validateTypedQuantity('25')).toEqual({ value: 25 });
  });
});

describe('cart re-quotes after quantity changes', () => {
  const { buildCartShippingRequest, getCartTiers, toStoredLocalShipping } = require('../src/utils/cart');

  it('asks for a courier quote with the new quantities', () => {
    const item = {
      id: 'p1',
      variants: false,
      skus: [
        { sku_id: 's1', specId: 'a', totalQuantity: 3, color: 'Red', size: 'M', image: 'x', price: 120 },
        { sku_id: 's2', specId: 'b', totalQuantity: 2, price: 120 },
      ],
    };
    expect(buildCartShippingRequest(item)).toEqual({
      productId: 'p1',
      totalQuantity: 5,
      skus: [
        { sku_id: 's1', specId: 'a', totalQuantity: 3, price: 120 },
        { sku_id: 's2', specId: 'b', totalQuantity: 2, price: 120 },
      ],
    });
  });

  it('sends no skus for single-option items', () => {
    const item = { id: 'p2', variants: [], skus: [{ sku_id: '1', totalQuantity: 4, price: 50 }] };
    expect(buildCartShippingRequest(item)).toEqual({ productId: 'p2', totalQuantity: 4, skus: [] });
  });

  it('stores the quote the way the web does', () => {
    expect(toStoredLocalShipping({ kind: 'amount', amount: 77.6 })).toBe('77');
    expect(toStoredLocalShipping({ kind: 'free', amount: 0 })).toBe('0');
    expect(toStoredLocalShipping({ kind: 'later', amount: 0 })).toBe('0');
  });

  it('moves the active price tier with the quantity', () => {
    const item = { price_range: JSON.stringify([[2, '10'], [10, '8'], [50, '6']]), skus: [{ totalQuantity: 12 }] };
    expect(getCartTiers(item, 15)).toEqual([
      { label: '2-9', price: 150, active: false },
      { label: '10-49', price: 120, active: true },
      { label: '≥50', price: 90, active: false },
    ]);
    expect(getCartTiers({ ...item, skus: [{ totalQuantity: 1 }] }, 15)[0].active).toBe(true);
    expect(getCartTiers({ price_range: '[[1,"5"]]', skus: [] }, 15)).toEqual([]);
  });
});

describe('cart order', () => {
  const { newestFirst } = require('../src/utils/cart');

  it('lists the most recently added entry first without touching the stored order', () => {
    const stored = [{ shopId: 'old' }, { shopId: 'mid' }, { shopId: 'new' }];
    expect(newestFirst(stored).map(shop => shop.shopId)).toEqual(['new', 'mid', 'old']);
    expect(stored[0].shopId).toBe('old');
    expect(newestFirst(undefined)).toEqual([]);
  });
});

describe('order sku keys', () => {
  it('uses the composite id from checkout, or builds it from a bare id', () => {
    expect(orderSkuKey({ id: 7 }, { sku_id: '7-123' })).toBe('7-123');
    expect(orderSkuKey({ id: 7 }, { sku_id: 123 })).toBe('7-123');
  });
});
