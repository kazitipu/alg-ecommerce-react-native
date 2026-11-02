/**
 * Cart page rules, ported from the web's live cart (`pages/cart1688.jsx`).
 *
 * Selection is a set of `"{itemId}-{skuId}"` keys — the web's sku key — so it
 * survives entries being added or removed. Nothing is selected until the
 * shopper ticks something, as on the web.
 */

import { findTierIndex, parsePriceRange } from './priceTiers';

export const MAX_TYPED_QUANTITY = 100000;

export const CART_TEXT = {
  notice:
    'Please keep in mind that the total payable of this order does not include the shipping charge (CN to BD). It will be added later, after the products reach our local warehouse. Thank you.',
  zeroAmount: 'Your order amount must be greater than 0 Tk',
  emptyQuantity: "Can't be empty or 0",
  tooMany: `Can't be more than ${MAX_TYPED_QUANTITY}`,
};

export const skuKey = (item, sku) => `${item.id}-${sku.sku_id}`;

export const itemKeys = item => (item?.skus || []).map(sku => skuKey(item, sku));

/** Every sku key of every entry belonging to `shopId` (the web ticks them together). */
export const shopKeys = (cart, shopId) =>
  (cart || []).filter(shop => shop.shopId === shopId).flatMap(shop => (shop.items || []).flatMap(itemKeys));

export const allKeys = cart => (cart || []).flatMap(shop => (shop.items || []).flatMap(itemKeys));

/** Quantity the cart shows and steps from. */
export const skuQuantity = sku => Number(sku?.totalQuantity) || 0;

/** A sku line's total, as the web shows it: `parseInt(qty × price)`. */
export const lineTotal = sku => parseInt(skuQuantity(sku) * (Number(sku?.price) || 0), 10) || 0;

/** Smallest quantity a line can step down to: a whole pack, or one piece. */
export const minQuantity = item => (Number(item?.batch) > 1 ? Number(item.batch) : 1);

/** Checks a typed quantity the way the web does; returns `{ value }` or `{ alert }`. */
export const validateTypedQuantity = text => {
  const value = parseInt(String(text).replace(/\D/g, ''), 10) || 0;
  if (value <= 0) return { alert: CART_TEXT.emptyQuantity };
  if (value > MAX_TYPED_QUANTITY) return { alert: CART_TEXT.tooMany };
  return { value };
};

/**
 * The selected part of the cart and its totals.
 *
 *  - `shops`: the checkout payload — each entry with only its selected skus,
 *    carrying the stored (already tier-priced) sku prices. Each sku is shaped
 *    as the web's cart hands it to checkout: `sku_id` as "itemId-skuId", plus
 *    `shopId` and `itemId`, so orders store the same ids as web orders.
 *  - `totalQuantity` / `totalAmount`: over selected skus, `Σ parseInt(price × qty)`
 *  - `sellers` / `categories`: the web footer's "Number of Sellers" (all
 *    entries) and "Good Category" (all items)
 */
export const buildCartSelection = (cart, selected) => {
  const shops = [];
  let totalQuantity = 0;
  let totalAmount = 0;

  (cart || []).forEach(shop => {
    const items = [];
    (shop.items || []).forEach(item => {
      const skus = (item.skus || []).filter(sku => selected.has(skuKey(item, sku)));
      if (skus.length === 0) return;
      skus.forEach(sku => {
        totalQuantity += skuQuantity(sku);
        totalAmount += lineTotal(sku);
      });
      items.push({
        ...item,
        skus: skus.map(sku => ({ ...sku, sku_id: skuKey(item, sku), shopId: shop.shopId, itemId: item.id })),
      });
    });
    if (items.length > 0) shops.push({ ...shop, items });
  });

  return {
    shops,
    totalQuantity,
    totalAmount,
    sellers: (cart || []).length,
    categories: (cart || []).reduce((total, shop) => total + (shop.items?.length || 0), 0),
  };
};

export default { buildCartSelection, skuKey, validateTypedQuantity };

/** A checkout sku's cart key: already "itemId-skuId" from the cart, or built from a bare id. */
export const orderSkuKey = (item, sku) =>
  String(sku?.sku_id ?? '').startsWith(`${item?.id}-`) ? String(sku.sku_id) : skuKey(item, sku);

/** Total pieces of one cart item across its skus. */
export const itemQuantity = item =>
  (item?.skus || []).reduce((total, sku) => total + skuQuantity(sku), 0);

/**
 * The China local courier quote request for a cart item, shaped like the
 * product page's: single-option items (`variants: []`) send no skus; variant
 * items send each sku's stored variant fields with its quantity (the cart's
 * own display fields are left out).
 */
export const buildCartShippingRequest = item => {
  const single = Array.isArray(item?.variants) && item.variants.length === 0;
  return {
    productId: item?.id,
    totalQuantity: itemQuantity(item),
    skus: single
      ? []
      : (item?.skus || [])
          .filter(sku => skuQuantity(sku) > 0)
          .map(({ color, size, image, ...variant }) => variant),
  };
};

/**
 * How a parsed courier quote is stored on a cart entry, as the web does:
 * whole taka as a string, and '0' for free postage or "included later".
 */
export const toStoredLocalShipping = quote =>
  quote?.kind === 'amount' && quote.amount > 0 ? `${parseInt(quote.amount, 10)}` : '0';

/**
 * The item's quantity tiers in taka, with the one its current quantity falls
 * in marked active. Empty when there is a single price (or no rate yet).
 */
export const getCartTiers = (item, taka) => {
  const tiers = parsePriceRange(item?.price_range);
  const rate = parseFloat(taka) || 0;
  if (tiers.length < 2 || rate <= 0) return [];
  const active = findTierIndex(tiers, itemQuantity(item));
  return tiers.map((tier, index) => {
    const min = parseInt(tier[0], 10) || 1;
    const next = tiers[index + 1] ? parseInt(tiers[index + 1][0], 10) : null;
    return {
      label: next ? `${min}-${next - 1}` : `≥${min}`,
      price: Math.round(parseFloat(tier[1]) * rate),
      active: index === active,
    };
  });
};

/**
 * The cart for display, newest first. `carts/{uid}` keeps entries in the
 * order they were added (new ones are appended), so this is that order reversed.
 */
export const newestFirst = cart => [...(cart || [])].reverse();
