import {
  buildOrderEntry,
  computeTotals,
  getCategoryRef,
  getFreightEstimate,
  getSelectionMode,
  getSizesForColor,
  normalizeSingleQuantity,
  parseLocalShipping,
  stepSingleQuantity,
  validateOrder,
} from '../src/utils/productDetail';

// Shapes taken from GET /api/products/711012043019.
const dress = {
  id: 711012043019,
  name: "Children's dress",
  detail_url: 'https://detail.1688.com/offer/711012043019.html',
  availability: 'pre-order',
  pictures: ['https://img/1.jpg'],
  price: 0,
  price_range: '',
  item_weight: 0.2,
  moq: 1,
  batch: 1,
  shop_id: 'shop-1',
  shop_name: 'Factory',
  propertyNames: ['Color', 'Suitable for height'],
  thirdCategoryId: 201552410,
  secondCategoryId: 201546613,
  topCategoryId: 311,
  totalAvailableQuantity: 100,
  props_list: { '0:0': 'Color:White', '0:1': 'Color:Pink', '1:0': 'height:100cm', '1:1': 'height:110cm' },
  props_imgs: {
    prop_img: [
      { properties: '0:0', url: 'https://img/white.jpg', value: 'White' },
      { properties: '0:1', url: 'https://img/pink.jpg', value: 'Pink' },
    ],
  },
  variants: [
    { price: '12.0', properties: '0:0;1:1', properties_name: '0:0:Color:White;1:1:height:110cm', quantity: 5, sku_id: 2 },
    { price: '11.0', properties: '0:0;1:0', properties_name: '0:0:Color:White;1:0:height:100cm', quantity: 5, sku_id: 1 },
    { price: '11.0', properties: '0:1;1:0', properties_name: '0:1:Color:Pink;1:0:height:100cm', quantity: 0, sku_id: 3 },
  ],
};

const TAKA = 22;

describe('product detail rules', () => {
  it('uses the deepest category id and its level', () => {
    expect(getCategoryRef(dress)).toEqual({ categoryId: 201552410, level: 3 });
    expect(getCategoryRef({ topCategoryId: 5 })).toEqual({ categoryId: 5, level: '' });
  });

  it('picks the selection mode like the web', () => {
    expect(getSelectionMode(dress)).toBe('colorSize');
    expect(getSelectionMode({ ...dress, props_list: { '0:0': 'Color:White' } })).toBe('colorOnly');
    expect(getSelectionMode({ ...dress, props_list: { '1:0': 'S' }, props_imgs: null })).toBe('single');
  });

  it("lists a colour's sizes sorted by size id", () => {
    expect(getSizesForColor(dress, '0:0').map(v => v.sku_id)).toEqual([1, 2]);
  });

  it('prices each SKU at its own price when there are no tiers', () => {
    const totals = computeTotals({
      item: dress,
      mode: 'colorSize',
      quantities: { '0:0;1:0': 2, '0:0;1:1': 1 },
      taka: TAKA,
    });
    expect(totals.totalQuantity).toBe(3);
    expect(totals.goodsTotal).toBe(242 * 2 + 264);
    expect(totals.totalCost).toBe(totals.goodsTotal);
  });

  it('re-prices the whole order on the active tier', () => {
    const item = { ...dress, price_range: [[1, '10'], [5, '8']] };
    const totals = computeTotals({ item, mode: 'colorSize', quantities: { '0:0;1:0': 6 }, taka: TAKA });
    expect(totals.tierIndex).toBe(1);
    expect(totals.tierPrice).toBe(176);
    expect(totals.totalCost).toBe(176 * 6);
  });

  it('estimates CN→BD freight from weight × rate', () => {
    expect(getFreightEstimate(dress, 3, 850)).toBe(510);
    expect(getFreightEstimate({ ...dress, item_weight: 0 }, 3, 850)).toBeNull();
  });

  it('reads the shipping quote from shippingCost', () => {
    expect(parseLocalShipping({ shippingCost: { freePostage: true } }, TAKA).kind).toBe('free');
    expect(parseLocalShipping({ shippingCost: { freight: '2.5' } }, TAKA)).toEqual({ kind: 'amount', amount: 55 });
    expect(parseLocalShipping({}, TAKA).kind).toBe('later');
  });

  it('validates in the web order', () => {
    const empty = computeTotals({ item: dress, mode: 'colorSize', quantities: {}, taka: TAKA });
    expect(validateOrder({ item: { ...dress, moq: 2 }, totals: empty, productType: 'Dress', shippingRate: 850 }).message).toBe(
      'সর্বনিম্ন 2 পিস অর্ডার করুন।',
    );
    expect(validateOrder({ item: { ...dress, moq: 0 }, totals: empty, productType: 'Dress', shippingRate: 850 }).message).toBe(
      "Your order value can't be 0Tk",
    );
    const some = computeTotals({ item: dress, mode: 'colorSize', quantities: { '0:0;1:0': 1 }, taka: TAKA });
    expect(validateOrder({ item: dress, totals: some, productType: '', shippingRate: 850 }).message).toBe(
      'Please choose your product type',
    );
    expect(validateOrder({ item: dress, totals: some, productType: 'Dress', shippingRate: 850 })).toBeNull();
  });

  it('builds the cart entry in the web format', () => {
    const quantities = { '0:0;1:0': 2 };
    const totals = computeTotals({ item: dress, mode: 'colorSize', quantities, taka: TAKA });
    const entry = buildOrderEntry({
      item: dress,
      mode: 'colorSize',
      quantities,
      totals,
      taka: TAKA,
      localShipping: { kind: 'amount', amount: 40.7 },
      shippingRate: 850,
      productType: "Children's Dress",
    });
    expect(entry.localShipping).toBe('40');
    const line = entry.items[0];
    expect(line).toMatchObject({ variants: false, price_range: '', weight: '0.40', batch: 1, shippingRate: 850 });
    expect(line.skus[0]).toMatchObject({ totalQuantity: 2, color: 'White', size: '100cm', image: 'https://img/white.jpg', price: 242, sku_id: 1 });
  });

  it('stringifies price_range and uses the tier price for single products', () => {
    const item = { ...dress, props_list: {}, props_imgs: null, price: '10', price_range: [[1, '10'], [5, '8']] };
    const totals = computeTotals({ item, mode: 'single', singleQuantity: 5, taka: TAKA });
    const entry = buildOrderEntry({
      item, mode: 'single', totals, taka: TAKA, localShipping: { kind: 'free' }, shippingRate: 750, productType: 'Others', now: () => 99,
    });
    expect(entry.localShipping).toBe('0');
    expect(entry.items[0].price_range).toBe(JSON.stringify(item.price_range));
    expect(entry.items[0].skus).toEqual([{ totalQuantity: 5, price: 176, sku_id: '99' }]);
  });

  it('steps a single quantity by pack size and stops at stock', () => {
    const item = { batch: 6, totalAvailableQuantity: 12 };
    expect(stepSingleQuantity(0, 1, item)).toEqual({ value: 6 });
    expect(stepSingleQuantity(12, 1, item)).toEqual({ value: 12, alert: 'পণ্যের উপলব্ধ পরিমাণ আছে 12 পিস।' });
    expect(stepSingleQuantity(6, -1, item)).toEqual({ value: 0 });
    expect(normalizeSingleQuantity('7', item)).toBe(12);
    expect(normalizeSingleQuantity('99', item)).toBe(12);
  });
});

describe('China local courier gate', () => {
  const { isShippingPending } = require('../src/utils/productDetail');

  it('waits until the quote matches the quantity picked', () => {
    expect(isShippingPending(null, 3)).toBe(true);
    expect(isShippingPending({ kind: 'amount', amount: 77, forQuantity: 2 }, 3)).toBe(true);
    expect(isShippingPending({ kind: 'amount', amount: 77, forQuantity: 3 }, 3)).toBe(false);
    expect(isShippingPending({ kind: 'later', amount: 0, forQuantity: 3 }, 3)).toBe(false);
  });

  it('does not block when nothing is picked yet', () => {
    expect(isShippingPending(null, 0)).toBe(false);
  });
});

describe('variant swatch row', () => {
   
  const { swatchSlots } = require('../src/screens/product/components/ProductSections');

  it('shows every swatch when they fit', () => {
    expect(swatchSlots(400, 5)).toEqual({ shown: 5 });
  });

  it('keeps one slot for "+N" when they do not fit', () => {
    // 300px fits 5 swatches of 44 with 8px gaps.
    expect(swatchSlots(300, 12)).toEqual({ shown: 4 });
  });

  it('shows up to 6 before the row is measured', () => {
    expect(swatchSlots(0, 12)).toEqual({ shown: 6 });
  });
});

describe('variant drawer colour swatches', () => {
   
  const { swatchLayout } = require('../src/screens/product/components/VariantSelector');

  it('keeps the grid while the colours fit in two rows', () => {
    // 340px holds 4 swatches of 68 with 10px gaps per row, so 8 fit.
    expect(swatchLayout(340, 8)).toEqual({ scroll: false, firstRow: 8 });
  });

  it('scrolls two rows sideways once a third row would be needed', () => {
    expect(swatchLayout(340, 9)).toEqual({ scroll: true, firstRow: 5 });
    expect(swatchLayout(340, 14)).toEqual({ scroll: true, firstRow: 7 });
  });

  it('does not scroll before the width is known', () => {
    expect(swatchLayout(0, 30).scroll).toBe(false);
  });
});

describe('China local courier wording', () => {
   
  const { isFreeLocalShipping, localShippingLabel } = require('../src/utils/productDetail');

  it('counts a zero quote or free postage as free, once something is picked', () => {
    expect(isFreeLocalShipping({ kind: 'amount', amount: 0 }, 3)).toBe(true);
    expect(isFreeLocalShipping({ kind: 'free', amount: 0 }, 3)).toBe(true);
    expect(isFreeLocalShipping({ kind: 'amount', amount: 12.5 }, 3)).toBe(false);
    // "Included later" is unknown, not free; nothing picked is not free either.
    expect(isFreeLocalShipping({ kind: 'later', amount: 0 }, 3)).toBe(false);
    expect(isFreeLocalShipping({ kind: 'amount', amount: 0 }, 0)).toBe(false);
    expect(isFreeLocalShipping(null, 3)).toBe(false);
  });

  it('words the other states as the product page does', () => {
    expect(localShippingLabel(null, 3, 'Tk')).toBe('Calculating…');
    expect(localShippingLabel({ kind: 'later', amount: 0 }, 3, 'Tk')).toBe('(included later)');
    expect(localShippingLabel({ kind: 'amount', amount: 12.5 }, 3, 'Tk')).toBe('Tk 12.50');
  });
});

describe('avatars and seller badges', () => {
   
  const { sellerInitials } = require('../src/screens/collection/components/SellerBanner');
   
  const { initialsOf } = require('../src/components/UserAvatar');

  it('builds a seller badge from the shop name', () => {
    expect(sellerInitials('Hangzhou Ali Toys')).toBe('HA');
    expect(sellerInitials('泉州市合伙人服饰有限公司')).toBe('泉州');
    expect(sellerInitials('b2b-2220082777954')).toBe('B2');
    expect(sellerInitials('')).toBe('S');
  });

  it('builds user initials from a name or email', () => {
    expect(initialsOf('kazi tipu')).toBe('KT');
    expect(initialsOf('kazi.tipu@example.com')).toBe('KT');
    expect(initialsOf('')).toBe('A');
  });
});
