/**
 * 1688 variant decoding.
 *
 * A listing describes its options in three loosely-related places:
 *
 *   props_list  { "0:123": "Red", "1:456": "XL", ... }
 *               keys prefixed "0" are colours, "1" are sizes
 *   props_imgs  { prop_img: [{ properties: "0:123", url }] }
 *               swatch images, present for some colours only
 *   variants    [{ properties: "0:123;1:456", price, quantity, sku_id }]
 *               the actual purchasable SKUs, keyed by the property pair
 *
 * The web app re-derived all of this inline in a 4,600-line component, six
 * times over. This module is that logic once, so the detail screen and the cart
 * agree on what a variant is.
 */

const COLOR_PREFIX = '0';
const SIZE_PREFIX = '1';

const entriesWithPrefix = (propsList, prefix) =>
  Object.keys(propsList || {})
    .filter(key => key.startsWith(prefix))
    .map(key => ({ properties: key, value: propsList[key] }));

/**
 * Colour options, merging swatch images with the plain property list.
 *
 * When every colour has an image the image list is used as-is; otherwise the
 * two are merged and de-duplicated by `properties`, so colours missing a
 * picture still appear.
 */
export const getColors = item => {
  if (!item) return [];

  const withoutPicture = entriesWithPrefix(item.props_list, COLOR_PREFIX);
  const withPicture = item.props_imgs?.prop_img || [];

  if (withPicture.length === 0) return withoutPicture;
  if (withPicture.length === withoutPicture.length) return withPicture;

  const merged = [];
  [...withPicture, ...withoutPicture].forEach(option => {
    if (!merged.some(existing => existing.properties === option.properties)) {
      merged.push(option);
    }
  });
  return merged;
};

/** Size options, in the `{ [propertyKey]: label }` shape the web app used. */
export const getSizes = item =>
  entriesWithPrefix(item?.props_list, SIZE_PREFIX).map(entry => ({
    [entry.properties]: entry.value,
  }));

/** Builds the `properties` key that identifies a variant. */
export const buildVariantKey = (colorProperties, sizeProperties) => {
  if (colorProperties && sizeProperties) return `${colorProperties};${sizeProperties}`;
  return colorProperties || sizeProperties || '';
};

/** The purchasable SKU for a colour/size pair, if the seller stocks it. */
export const findVariant = (item, colorProperties, sizeProperties) => {
  const key = buildVariantKey(colorProperties, sizeProperties);
  if (!key || !item?.variants) return undefined;
  return item.variants.find(variant => variant.properties === key);
};

/** Total units the seller reports across every variant. */
export const getTotalAvailableQuantity = item =>
  (item?.variants || []).reduce(
    (total, variant) => total + (parseInt(variant.quantity, 10) || 0),
    0,
  );

/** Human label for a variant, e.g. "Red / XL", from its `properties_name`. */
export const getVariantLabel = variant => {
  if (!variant?.properties_name) return '';
  // properties_name looks like "0:123:颜色:Red;1:456:尺码:XL"
  return variant.properties_name
    .split(';')
    .map(part => part.split(':').pop())
    .filter(Boolean)
    .join(' / ');
};

/** Swatch image for a colour, when the listing provides one. */
export const getColorImage = (item, colorProperties) =>
  (item?.props_imgs?.prop_img || []).find(
    image => image.properties === colorProperties,
  )?.url;

/**
 * Flattens the per-variant quantity map the detail screen keeps in state into
 * the SKU array the cart and Firestore expect.
 *
 * `quantities` is keyed by variant `properties`, matching the web app's habit
 * of storing quantities as `this.state["0:123;1:456"]`.
 */
export const buildSelectedSkus = (item, quantities, unitPrice) =>
  Object.entries(quantities || {})
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([properties, quantity]) => {
      const variant = item.variants?.find(candidate => candidate.properties === properties);
      if (!variant) return null;

      return {
        sku_id: variant.sku_id ?? properties,
        properties,
        totalQuantity: Number(quantity),
        price: unitPrice,
        name: getVariantLabel(variant),
        image: getColorImage(item, properties.split(';')[0]),
      };
    })
    .filter(Boolean);

/** Sum of every selected quantity — what the price tier is resolved against. */
export const getSelectedQuantity = quantities =>
  Object.values(quantities || {}).reduce(
    (total, quantity) => total + (Number(quantity) || 0),
    0,
  );

export default {
  getColors,
  getSizes,
  buildVariantKey,
  findVariant,
  getTotalAvailableQuantity,
  getVariantLabel,
  getColorImage,
  buildSelectedSkus,
  getSelectedQuantity,
};
