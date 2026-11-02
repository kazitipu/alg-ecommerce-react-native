import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import CartScreen from '../src/screens/cart/CartScreen';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const cart = [
  {
    shopId: 'shop-a',
    shopName: 'Factory A',
    localShipping: '0',
    items: [
      {
        id: 711012043019,
        name: "Children's dress",
        picture: 'https://img/1.jpg',
        productType: "Children's Dress",
        propertyNames: ['Color', 'Height'],
        batch: '',
        skus: [
          { sku_id: 1, totalQuantity: 2, price: 242, color: 'White', size: '100cm', image: 'https://img/w.jpg' },
          { sku_id: 2, totalQuantity: 1, price: 253, color: 'White', size: '110cm' },
        ],
      },
    ],
  },
];

const render = state => {
  const store = createStore(() => state);
  let tree;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <CartScreen />
      </Provider>,
    );
  });
  return tree;
};

const textOf = tree =>
  tree.root
    .findAll(node => typeof node.props.children === 'string' || typeof node.props.children === 'number')
    .map(node => String(node.props.children))
    .join(' | ');

describe('CartScreen', () => {
  const base = { data: { symbol: 'Tk' }, user: { currentUser: { id: 'u1', uid: 'u1' }, currency: { taka: 22 } } };

  it('shows each sku with its options, unit price and line total', () => {
    const tree = render({ ...base, cartList: { cart } });
    const text = textOf(tree);
    expect(text).toContain('Factory A');
    expect(text).toContain("Children's Dress");
    expect(text).toContain('Color: White');
    expect(text).toContain('Height: 100cm');
    expect(text).toContain('Tk 484');
    // Nothing is selected until the shopper ticks something, as on the web.
    expect(text).toContain('Tk 0');
  });

  it('asks a signed-out shopper to sign in', () => {
    const tree = render({ ...base, user: { currentUser: { displayName: '' } }, cartList: { cart: [] } });
    expect(textOf(tree)).toContain('Sign in to see your cart');
  });
});
