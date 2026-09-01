/**
 * 1688 variant decoding. The web app re-derived this inline six times inside a
 * 4,600-line component; these cases pin the shared version.
 */
import {
  buildSelectedSkus,
  buildVariantKey,
  findVariant,
  getColorImage,
  getColors,
  getSelectedQuantity,
  getSizes,
  getTotalAvailableQuantity,
  getVariantLabel,
} from '../src/utils/sku';
import { adaptProduct } from '../src/utils/adaptProduct';

/** Two colours x two sizes, with a swatch image for one colour only. */
const item = {
  num_iid: '123',
  batch: 1,
  props_list: {
    '0:red': 'Red',
    '0:blue': 'Blue',
    '1:m': 'M',
    '1:l': 'L',
  },
  props_imgs: {
    prop_img: [{ properties: '0:red', url: 'https://cdn/red.jpg' }],
  },
  variants: [
    { properties: '0:red;1:m', sku_id: 's1', quantity: '10', properties_name: '0:red:颜色:Red;1:m:尺码:M' },
    { properties: '0:red;1:l', sku_id: 's2', quantity: '5', properties_name: '0:red:颜色:Red;1:l:尺码:L' },
    { properties: '0:blue;1:m', sku_id: 's3', quantity: '0', properties_name: '0:blue:颜色:Blue;1:m:尺码:M' },
  ],
};

describe('option lists', () => {
  it('merges swatch images with colours that have none', () => {
    const colors = getColors(item);
    // Two colours exist but only one has a picture, so both lists are merged.
    expect(colors).toHaveLength(2);
    expect(colors.map(c => c.properties).sort()).toEqual(['0:blue', '0:red']);
    expect(colors.find(c => c.properties === '0:red').url).toBe('https://cdn/red.jpg');
  });

  it('uses the image list alone when every colour has a picture', () => {
    const allPictured = {
      props_list: { '0:red': 'Red' },
      props_imgs: { prop_img: [{ properties: '0:red', url: 'https://cdn/red.jpg' }] },
    };
    expect(getColors(allPictured)).toEqual([
      { properties: '0:red', url: 'https://cdn/red.jpg' },
    ]);
  });

  it('falls back to the property list when there are no images', () => {
    expect(getColors({ props_list: { '0:red': 'Red' } })).toEqual([
      { properties: '0:red', value: 'Red' },
    ]);
  });

  it('reads sizes from the "1" prefix only', () => {
    expect(getSizes(item)).toEqual([{ '1:m': 'M' }, { '1:l': 'L' }]);
  });

  it('copes with a product that has no options at all', () => {
    expect(getColors({})).toEqual([]);
    expect(getSizes({})).toEqual([]);
    expect(getColors(null)).toEqual([]);
  });
});

describe('variant lookup', () => {
  it('builds the composite key the marketplace uses', () => {
    expect(buildVariantKey('0:red', '1:m')).toBe('0:red;1:m');
    expect(buildVariantKey('0:red', null)).toBe('0:red');
    expect(buildVariantKey(null, '1:m')).toBe('1:m');
    expect(buildVariantKey(null, null)).toBe('');
  });

  it('finds a stocked pair', () => {
    expect(findVariant(item, '0:red', '1:m').sku_id).toBe('s1');
  });

  it('returns undefined for a pair the seller does not stock', () => {
    // Blue/L is absent from the variant list entirely.
    expect(findVariant(item, '0:blue', '1:l')).toBeUndefined();
  });

  it('sums stock across variants', () => {
    expect(getTotalAvailableQuantity(item)).toBe(15);
    expect(getTotalAvailableQuantity({})).toBe(0);
  });

  it('reads a human label off properties_name', () => {
    expect(getVariantLabel(item.variants[0])).toBe('Red / M');
    expect(getVariantLabel({})).toBe('');
  });

  it('finds a colour swatch image', () => {
    expect(getColorImage(item, '0:red')).toBe('https://cdn/red.jpg');
    expect(getColorImage(item, '0:blue')).toBeUndefined();
  });
});

describe('building the cart payload', () => {
  it('turns the quantity map into priced SKUs', () => {
    const skus = buildSelectedSkus(item, { '0:red;1:m': 3, '0:red;1:l': 2 }, 150);

    expect(skus).toHaveLength(2);
    expect(skus[0]).toMatchObject({
      sku_id: 's1',
      properties: '0:red;1:m',
      totalQuantity: 3,
      price: 150,
      name: 'Red / M',
    });
    // Every selected SKU carries the same tier price, as the web app did.
    expect(skus.every(sku => sku.price === 150)).toBe(true);
  });

  it('skips zero quantities and unknown variants', () => {
    const skus = buildSelectedSkus(
      item,
      { '0:red;1:m': 0, '0:ghost;1:x': 5, '0:red;1:l': 1 },
      100,
    );
    expect(skus).toHaveLength(1);
    expect(skus[0].sku_id).toBe('s2');
  });

  it('totals the selected quantity', () => {
    expect(getSelectedQuantity({ a: 3, b: 2 })).toBe(5);
    expect(getSelectedQuantity({})).toBe(0);
    expect(getSelectedQuantity(undefined)).toBe(0);
  });
});

describe('legacy payload adapter', () => {
  it('maps marketplace field names onto the internal shape', () => {
    const product = adaptProduct(
      {
        num_iid: '999',
        title: 'Test product',
        pic_url: 'a.jpg',
        item_imgs: [{ url: 'b.jpg' }],
        seller_info: { shop_name: 'Shop', sid: 's7' },
        skus: { sku: [{ properties: '0:1' }] },
        priceRange: [[2, 5]],
        orginal_price: '20',
        price: '10',
      },
      '1688',
    );

    expect(product.id).toBe('999');
    expect(product.name).toBe('Test product');
    expect(product.pictures).toEqual(['a.jpg', 'b.jpg']);
    expect(product.shop_name).toBe('Shop');
    expect(product.availability).toBe('1688');
    expect(product.variants).toEqual([{ properties: '0:1' }]);
    expect(product.price_range).toEqual([[2, 5]]);
  });

  it('unwraps the nested prodct_array form', () => {
    const product = adaptProduct(
      { prodct_array: { num_iid: '5', title: 'Nested', seller_info: {} } },
      'taobao',
    );
    expect(product.id).toBe('5');
    expect(product.name).toBe('Nested');
  });

  it('passes null through untouched', () => {
    expect(adaptProduct(null, '1688')).toBeNull();
  });
});
