/**
 * `updateCartSkuQuantity` is the write behind the cart's quantity stepper.
 * The rule that matters: a line's tier price depends on the line's *total*
 * quantity, so changing one SKU re-prices every SKU on that line.
 */
import { getDoc, updateDoc } from '@react-native-firebase/firestore';
import { updateCartSkuQuantity } from '../src/firebase/cart';

const USER = { id: 'u1' };

/** Two SKUs on one line, tiers: 1+ @10 CNY, 100+ @8 CNY. Rate is 10 Tk/CNY. */
const cartFixture = () => [
  {
    shopId: 'shop1',
    shopName: 'Test Shop',
    items: [
      {
        id: 'item1',
        price_range: [
          [2, 10],
          [100, 8],
        ],
        skus: [
          { sku_id: 'a', totalQuantity: 10, price: 100 },
          { sku_id: 'b', totalQuantity: 10, price: 100 },
        ],
      },
    ],
  },
];

/** Stubs the read-then-write pair and returns what was written. */
const runUpdate = async payload => {
  let written;
  const before = cartFixture();

  getDoc
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ cart: before }) })
    .mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ cart: written }),
    });
  updateDoc.mockImplementation(async (_ref, value) => {
    written = value.cart;
  });

  const result = await updateCartSkuQuantity(USER, { taka: 10, ...payload });
  return { result, written };
};

beforeEach(() => jest.clearAllMocks());

it('sets the quantity on the targeted SKU only', async () => {
  const { written } = await runUpdate({ itemId: 'item1', skuId: 'a', quantity: 25 });

  const skus = written[0].items[0].skus;
  expect(skus.find(sku => sku.sku_id === 'a').totalQuantity).toBe(25);
  expect(skus.find(sku => sku.sku_id === 'b').totalQuantity).toBe(10);
});

it('re-prices the whole line when the total crosses a tier', async () => {
  // 95 + 10 = 105 units, which crosses the 100 threshold to 8 CNY.
  const { written } = await runUpdate({ itemId: 'item1', skuId: 'a', quantity: 95 });

  const skus = written[0].items[0].skus;
  expect(skus.every(sku => sku.price === 80)).toBe(true);
});

it('keeps the cheaper tier off until the threshold is reached', async () => {
  // 30 + 10 = 40 units stays in the first tier at 10 CNY.
  const { written } = await runUpdate({ itemId: 'item1', skuId: 'a', quantity: 30 });

  expect(written[0].items[0].skus.every(sku => sku.price === 100)).toBe(true);
});

it('drops a SKU set to zero but keeps the rest of the line', async () => {
  const { written } = await runUpdate({ itemId: 'item1', skuId: 'a', quantity: 0 });

  const skus = written[0].items[0].skus;
  expect(skus).toHaveLength(1);
  expect(skus[0].sku_id).toBe('b');
});

it('removes the shop entry once its last SKU is gone', async () => {
  let written;
  const before = [
    {
      shopId: 'shop1',
      items: [
        {
          id: 'item1',
          price_range: [],
          skus: [{ sku_id: 'a', totalQuantity: 5, price: 100 }],
        },
      ],
    },
  ];

  getDoc
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ cart: before }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ cart: written }) });
  updateDoc.mockImplementation(async (_ref, value) => {
    written = value.cart;
  });

  await updateCartSkuQuantity(USER, { itemId: 'item1', skuId: 'a', quantity: 0, taka: 10 });
  expect(written).toEqual([]);
});

it('leaves other lines untouched', async () => {
  let written;
  const before = [
    ...cartFixture(),
    {
      shopId: 'shop2',
      items: [
        {
          id: 'item2',
          price_range: [],
          skus: [{ sku_id: 'z', totalQuantity: 3, price: 55 }],
        },
      ],
    },
  ];

  getDoc
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ cart: before }) })
    .mockResolvedValueOnce({ exists: () => true, data: () => ({ cart: written }) });
  updateDoc.mockImplementation(async (_ref, value) => {
    written = value.cart;
  });

  await updateCartSkuQuantity(USER, { itemId: 'item1', skuId: 'a', quantity: 1, taka: 10 });
  expect(written[1].items[0].skus[0]).toEqual({
    sku_id: 'z',
    totalQuantity: 3,
    price: 55,
  });
});

it('does nothing without a signed-in user or a cart document', async () => {
  expect(await updateCartSkuQuantity(null, { itemId: 'x' })).toBeUndefined();

  getDoc.mockResolvedValueOnce({ exists: () => false });
  expect(
    await updateCartSkuQuantity(USER, { itemId: 'x', skuId: 'y', quantity: 1 }),
  ).toBeUndefined();
});
