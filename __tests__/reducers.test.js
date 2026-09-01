import { createStore } from 'redux';
import rootReducer from '../src/reducers';

test('root reducer composes and holds the expected slices', () => {
  const store = createStore(rootReducer);
  const state = store.getState();
  expect(Object.keys(state).sort()).toEqual([
    'bookingRequests', 'cartList', 'compare', 'data', 'filters', 'notices',
    'orders', 'searchedProducts', 'shipForMeList', 'singleProduct', 'user', 'wishlist',
  ]);
  expect(state.data.symbol).toBe('Tk');
  expect(state.cartList.cart).toEqual([]);
});

test('cart syncs from the firestore snapshot payload', () => {
  const store = createStore(rootReducer);
  const shopTree = [{ shopId: 's1', items: [{ id: 'i1', skus: [{ sku_id: 'k1', totalQuantity: 3 }] }] }];
  store.dispatch({ type: 'SET_REDUX_CART', payload: shopTree });
  expect(store.getState().cartList.cart).toEqual(shopTree);
});

test('price_range JSON strings are parsed into arrays', () => {
  const store = createStore(rootReducer);
  store.dispatch({
    type: 'FETCH_ALL_PRODUCTS_FROM_FIRESTORE',
    payload: [{ id: 'p1', price_range: '[[2,10],[100,8]]' }, { id: 'p2', price_range: '' }],
  });
  const { products } = store.getState().data;
  expect(products[0].price_range).toEqual([[2, 10], [100, 8]]);
  expect(products[1].price_range).toEqual([]);
});

test('1688 payload is adapted into the internal product shape', () => {
  const store = createStore(rootReducer);
  store.dispatch({
    type: 'SET_SEARCHED_PRODUCT_DETAIL',
    route: '1688',
    payload: {
      num_iid: '999', title: 'Test', pic_url: 'a.jpg',
      item_imgs: [{ url: 'b.jpg' }], seller_info: { shop_name: 'Shop', sid: 's7' },
      skus: { sku: [{ properties: '0:1' }] }, priceRange: [[2, 5]],
    },
  });
  const { product } = store.getState().singleProduct;
  expect(product.id).toBe('999');
  expect(product.shop_name).toBe('Shop');
  expect(product.pictures).toEqual(['a.jpg', 'b.jpg']);
  expect(product.availability).toBe('1688');
  expect(product.variants).toEqual([{ properties: '0:1' }]);
});
