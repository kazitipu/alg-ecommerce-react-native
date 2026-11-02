import { formatPrice } from './format';
/**
 * Product-detail business rules, ported from the web's
 * `details-price-1688.jsx` so the app prices, validates and builds cart
 * entries exactly as alg.com.bd does.
 *
 * Quantities live in a map keyed by variant `properties` ("0:1;1:3"), the web's
 * `this.state[key]` convention. Products without colours are sold through a
 * single quantity instead (the web's "no variants" mode, which also covers
 * sizes-only listings).
 */

import { findTierIndex, parsePriceRange } from './priceTiers';
import { getColors } from './sku';
import { toStoredLocalShipping } from './cart';

export const DEFAULT_SHIPPING_RATE = 750;

/** Bengali copy shown on the web product page, reused verbatim. */
export const PRODUCT_TEXT = {
  moq: moq => `সর্বনিম্ন অর্ডার করুন ${moq} পিস`,
  packSize: batch => `এক প্যাক সাইজ = (${batch} পিস)`,
  onlyThisProduct: '(শুধুমাত্র এই পণ্যের ক্ষেত্রে প্রযোজ্য)',
  moqAlert: moq => `সর্বনিম্ন ${moq} পিস অর্ডার করুন।`,
  stockAlert: maxQty => `পণ্যের উপলব্ধ পরিমাণ আছে ${maxQty} পিস।`,
  shippingNote:
    'বি:দ্র: ব্যাটারি, লিকুইড ও কপি আইটেমের ক্ষেত্রে উল্লেখিত শিপিং রেটে প্রতি কেজিতে ২০০–৩০০ টাকা বৃদ্ধি পাবে।',
  deliveryTitle: 'ডেলিভারি প্রসেসঃ',
  deliveryBody:
    'চায়না থেকে অর্ডারকৃত পণ্য সর্বপ্রথম চাইনিজ ফ্যাক্টরি থেকে আমাদের চায়না ওয়্যারহাউজে আসবে। এরপর প্রোডাক্ট ক্যাটাগরি এর উপর ভিত্তি করে শিপমেন্ট এবং কাস্টম ক্লিয়ারেন্স এর সকল কার্যক্রম সম্পন্ন করা হবে। আমাদের বাংলাদেশ ওয়্যারহাউজে আপনার কাঙ্ক্ষিত পণ্যটি আসার পরে আপনার ডেলিভারি ঠিকানায় ডেলিভারি সম্পন্ন করা হবে।',
  paymentTitle: 'পেমেন্ট প্রসেস:',
  paymentBody:
    'এখন আপনি পণ্যের যেই দাম পেমেন্ট করছেন তা শুধু এবং শুধুমাত্র পণ্যের মূল্য। এরসাথে পণ্যের চায়না লোকাল কুরিয়ার চার্জ (যদি থাকে), পণ্যের ওজন অনুযায়ী চায়না থেকে বাংলাদেশ শিপিং চার্জ (প্যাকেজিং সহ) এবং আপনার ডেলিভারি ঠিকানা অনুযায়ী বাংলাদেশ কুরিয়ার চার্জ যোগ করা হবে।',
};

/** The web's "✓" service promises under the gallery. */
export const SERVICE_PROMISES = [
  '24/7 online services for our customers via wechat, whatsapp, hotline and facebook.',
  'The best wholesale prices and a vast variety of goods.',
  'Live tracking your product 24/7.',
  '100% Secure payment with us.',
  'Fastest product delivery (around 15-20 working days).',
  'Cheapest shipping charges around the country.',
  'Claiming 100% refund facility.',
];

/** Deepest category id on the product and its level, for the shipping-rate lookup. */
export const getCategoryRef = item => {
  if (!item) return { categoryId: null, level: '' };
  const categoryId = item.thirdCategoryId || item.secondCategoryId || item.topCategoryId || null;
  const level = item.thirdCategoryId ? 3 : item.secondCategoryId ? 2 : '';
  return { categoryId, level };
};

/** Last `:`-separated segment of the part of `properties_name` with `prefix`. */
const namePart = (propertiesName, prefix) => {
  const part = String(propertiesName || '')
    .split(';')
    .find(segment => segment.startsWith(prefix));
  if (!part) return null;
  const pieces = part.split(':');
  return pieces[pieces.length - 1];
};

export const getColorName = propertiesName => namePart(propertiesName, '0');
export const getSizeName = propertiesName => namePart(propertiesName, '1');

/** Display value for a colour option; `props_list` values carry a "Name:" prefix. */
export const getOptionValue = option => {
  const value = String(option?.value || '');
  return option?.url ? value : value.replace(/^[^:]*:/, '');
};

/** The swatch image for a variant's colour, if any. */
export const getVariantImage = (colors, properties) => {
  const colorCode = String(properties || '')
    .split(';')
    .find(code => code.startsWith('0'));
  return colors.find(color => color.properties === colorCode)?.url || '';
};

/**
 * The size rows for a colour: that colour's variants, sorted by the size's
 * numeric id, as the web's `getSizesArray` does.
 */
export const getSizesForColor = (item, colorProperties) =>
  (item?.variants || [])
    .filter(variant =>
      variant.properties
        .split(';')
        .some(code => code.startsWith('0') && code === colorProperties),
    )
    .sort(
      (a, b) =>
        Number(a.properties.split(';')[1]?.split(':')[1]) -
        Number(b.properties.split(';')[1]?.split(':')[1]),
    );

/** Which selection UI the product uses. */
export const getSelectionMode = item => {
  const colors = getColors(item);
  if (colors.length === 0) return 'single';
  const hasSizes = Object.keys(item?.props_list || {}).some(key => key.startsWith('1'));
  return hasSizes ? 'colorSize' : 'colorOnly';
};

const toNumber = value => parseFloat(value) || 0;

/** A SKU's own price in taka. */
export const skuPriceInTaka = (variant, taka) =>
  Math.round(toNumber(variant?.price) * toNumber(taka));

/**
 * Totals for the current selection.
 *
 *  - `totalQuantity` drives the tier, weight and shipping quote
 *  - `tierPrice` (the web's `price2`) is the unit price of the active tier, or,
 *    without tiers, `parseInt(price × taka)` as the web shows it
 *  - `goodsTotal` (the web's `totalPrice`) sums each SKU at its own price
 *  - `totalCost` is what the order is shown as: `round(tierPrice × qty)` when
 *    the product has tiers, otherwise `goodsTotal`
 */
export const computeTotals = ({ item, mode, quantities, singleQuantity, taka }) => {
  const tiers = parsePriceRange(item?.price_range);
  const rate = toNumber(taka);

  let totalQuantity;
  let goodsTotal;
  if (mode === 'single') {
    totalQuantity = Number(singleQuantity) || 0;
    goodsTotal = totalQuantity * Math.round(toNumber(item?.price) * rate);
  } else {
    totalQuantity = 0;
    goodsTotal = 0;
    Object.entries(quantities || {}).forEach(([properties, quantity]) => {
      const count = Number(quantity) || 0;
      if (count <= 0) return;
      const variant = item?.variants?.find(candidate => candidate.properties === properties);
      totalQuantity += count;
      goodsTotal += skuPriceInTaka(variant, rate) * count;
    });
  }

  const tierIndex = tiers.length > 0 ? findTierIndex(tiers, totalQuantity) : -1;
  const tierPrice =
    tierIndex >= 0
      ? Math.round(toNumber(tiers[tierIndex][1]) * rate)
      : parseInt(toNumber(item?.price) * rate, 10) || 0;
  const totalCost = tiers.length > 0 ? Math.round(tierPrice * totalQuantity) : goodsTotal;

  return { tiers, tierIndex, tierPrice, totalQuantity, goodsTotal, totalCost };
};

/** Approximate parcel weight in kg, as the web formats it. */
export const getWeight = (item, totalQuantity) =>
  (toNumber(item?.item_weight) * (Number(totalQuantity) || 0)).toFixed(2);

/** CN → BD freight estimate in taka; null when the listing has no weight. */
export const getFreightEstimate = (item, totalQuantity, shippingRate) => {
  if (!item?.item_weight) return null;
  return parseInt(toNumber(getWeight(item, totalQuantity)) * toNumber(shippingRate), 10) || 0;
};

/**
 * Interprets the `/api/products/shipping` response like the web: free
 * postage, a freight figure converted to taka, or "included later" when the
 * supplier gives no quote.
 */
/**
 * The China local courier charge as the product page words it: the amount,
 * "(free shipping)", "(included later)" when the seller gives no quote, or
 * "Calculating…" while the quote for this quantity is on its way.
 */
/** Whether the China local courier costs nothing for the quantity picked. */
export const isFreeLocalShipping = (localShipping, totalQuantity) =>
  Boolean(totalQuantity) &&
  Boolean(localShipping) &&
  (localShipping.kind === 'free' || (localShipping.kind === 'amount' && !(Number(localShipping.amount) > 0)));

export const localShippingLabel = (localShipping, totalQuantity, symbol) => {
  if (!totalQuantity) return formatPrice(0, symbol);
  if (!localShipping) return 'Calculating…';
  if (localShipping.kind === 'free') return '(free shipping)';
  if (localShipping.kind === 'later') return '(included later)';
  return `${symbol} ${Number(localShipping.amount || 0).toFixed(2)}`;
};

export const parseLocalShipping = (response, taka) => {
  const cost = response?.shippingCost;
  if (!cost) return { kind: 'later', amount: 0 };
  if (cost.freePostage) return { kind: 'free', amount: 0 };
  return { kind: 'amount', amount: Number((toNumber(cost.freight) * toNumber(taka)).toFixed(2)) };
};

/**
 * True while the China local courier quote is not yet in for the quantity
 * picked: the quote is still loading, or the quantity changed since (and the
 * debounced request has not gone out yet).
 */
export const isShippingPending = (localShipping, totalQuantity) =>
  totalQuantity > 0 && (!localShipping || localShipping.forQuantity !== totalQuantity);

/** The SKUs sent to the shipping quote: full variant fields plus the quantity. */
export const buildShippingSkus = (item, mode, quantities) =>
  mode === 'single'
    ? []
    : Object.entries(quantities || {})
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([properties, quantity]) => ({
          totalQuantity: Number(quantity),
          ...item.variants.find(variant => variant.properties === properties),
        }));

/**
 * Checks run before Buy now / Add to cart, in the web's order. Returns
 * `{ type: 'alert', message }`, `{ type: 'missing' }` (the web's "Please fill
 * the missing information first" banner) or null when the order can proceed.
 */
export const validateOrder = ({ item, totals, productType, shippingRate }) => {
  if (item?.moq && item.moq > totals.totalQuantity) {
    return { type: 'alert', message: PRODUCT_TEXT.moqAlert(item.moq) };
  }
  if (parseInt(totals.totalCost, 10) === 0) {
    return { type: 'alert', message: "Your order value can't be 0Tk" };
  }
  if (!productType || Number(shippingRate) === 0) {
    return { type: 'alert', message: 'Please choose your product type' };
  }
  if (totals.totalQuantity === 0) return { type: 'missing' };
  return null;
};

/**
 * The cart / pending-order entry, field for field as the web builds it, so
 * carts stay readable by both apps. `price_range` is a JSON string, which the
 * web's Firestore cart merge parses.
 */
export const buildOrderEntry = ({
  item,
  mode,
  quantities,
  totals,
  taka,
  localShipping,
  shippingRate,
  productType,
  now = Date.now,
}) => {
  const hasTiers = totals.tiers.length > 0;
  const colors = getColors(item);

  const skus =
    mode === 'single'
      ? [
          {
            totalQuantity: totals.totalQuantity,
            price: hasTiers ? totals.tierPrice : Math.round(toNumber(item.price) * toNumber(taka)),
            sku_id: now().toString(),
          },
        ]
      : Object.entries(quantities || {})
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([properties, quantity]) => {
            const variant = item.variants.find(candidate => candidate.properties === properties);
            return {
              totalQuantity: Number(quantity),
              color: getColorName(variant.properties_name),
              size: getSizeName(variant.properties_name),
              image: getVariantImage(colors, properties),
              ...variant,
              price: hasTiers ? totals.tierPrice : skuPriceInTaka(variant, taka),
            };
          });

  return {
    shopId: item.shop_id,
    shopName: item.shop_name,
    localShipping: toStoredLocalShipping(localShipping),
    items: [
      {
        id: item.id,
        name: item.name,
        detail_url: item.detail_url,
        availability: item.availability,
        picture: item.pictures?.[0],
        variants: mode === 'single' ? [] : false,
        skus,
        propertyNames: item.propertyNames,
        price_range: item.price_range ? JSON.stringify(item.price_range) : '',
        shippingRate,
        productType,
        weight: getWeight(item, totals.totalQuantity),
        batch: item.batch ? item.batch : '',
      },
    ],
  };
};

/**
 * The single-quantity stepper of the web's no-variant mode: steps by the pack
 * size and refuses to pass the available stock, returning the Bengali alert.
 */
export const stepSingleQuantity = (current, direction, item) => {
  const batch = Number(item?.batch) > 1 ? Number(item.batch) : 1;
  const maxQty = Number(item?.totalAvailableQuantity) || 0;
  const value = Number(current) || 0;

  if (direction < 0) return { value: Math.max(value - batch, 0) };
  const next = value + batch;
  if (maxQty && next > maxQty) return { value, alert: PRODUCT_TEXT.stockAlert(maxQty) };
  return { value: next };
};

/** A typed single quantity: whole packs, never above the available stock. */
export const normalizeSingleQuantity = (text, item) => {
  const batch = Number(item?.batch) > 1 ? Number(item.batch) : 1;
  const maxQty = Number(item?.totalAvailableQuantity) || Infinity;
  const parsed = parseInt(String(text).replace(/\D/g, ''), 10) || 0;
  if (batch === 1) return Math.min(parsed, maxQty);
  const roundedUp = Math.ceil(parsed / batch) * batch;
  return Math.floor(Math.min(roundedUp, maxQty) / batch) * batch;
};

/** Similar products from `relatedGroups`, priced like the web's cards. */
export const getRelatedProducts = item =>
  (item?.relatedGroups?.[0]?.Items || []).map(related => ({
    id: String(related.Id || '').replace('abb-', ''),
    name: related.Name,
    image: related.Image?.Url,
    marginPrice: toNumber(related.Price?.MarginPrice),
    originalPrice: toNumber(related.Price?.OriginalPrice),
  }));

export default {
  computeTotals,
  validateOrder,
  buildOrderEntry,
  parseLocalShipping,
  isShippingPending,
  getSelectionMode,
};
