import {
  buildProductRequest,
  canSendRequest,
  missingField,
  rateOptions,
} from '../src/screens/buyforme/RequestProductScreen';
import { asText } from '../src/screens/buyforme/components/ServiceUI';

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn(), getString: jest.fn() }));
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));

describe('service screens', () => {
  const form = {
    store: 'Taobao',
    country: 'china',
    productType: 'Shoes',
    productUrl: ' https://item.taobao.com/1 ',
    productQuantity: '20',
    productVariant: ' red, M, 20 pcs ',
  };

  it("requires the web form's fields: store, country, type, quantity and description", () => {
    expect(canSendRequest(form)).toBe(true);
    expect(missingField({ ...form, store: '' })).toBe('Choose the store');
    expect(missingField({ ...form, country: '' })).toBe('Choose the origin country');
    expect(missingField({ ...form, productType: '' })).toBe('Choose the product type');
    expect(missingField({ ...form, productQuantity: '0' })).toBe('Enter the quantity');
    expect(missingField({ ...form, productVariant: '  ' })).toBe('Describe colour, size and pieces');
    // The link is optional, as on the web.
    expect(canSendRequest({ ...form, productUrl: '' })).toBe(true);
    expect(canSendRequest(undefined)).toBe(false);
  });

  it('lists product types with their 5 kg+ rate', () => {
    expect(rateOptions([{ id: 'Shoes', eleven: 650 }, { id: ' chemical', eleven: 1850 }, { eleven: 1 }, null])).toEqual([
      { value: 'Shoes', label: 'Shoes', rate: 650 },
      // The stored id is kept as the web saves it; only the label is tidied.
      { value: ' chemical', label: 'chemical', rate: 1850 },
    ]);
  });

  it('saves the request with the web\'s fields, landing in Pending', () => {
    const now = new Date(2026, 10, 3, 9, 30);
    expect(
      buildProductRequest({ form, shippingRate: 650, imageUrl: 'https://img', currentUser: { id: 'u1', displayName: 'Kazi' }, now }),
    ).toEqual({
      imageUrl: 'https://img',
      date: '03/11/2026',
      time: now.getTime(),
      productQuantity: '20',
      productUrl: 'https://item.taobao.com/1',
      productVariant: 'red, M, 20 pcs',
      productType: 'Shoes',
      shippingRate: '650',
      country: 'china',
      store: 'Taobao',
      userId: 'u1',
      displayName: 'Kazi',
      shipmentStatusScore: 1,
      status: 'Pending',
      orderStatus: 'Pending',
    });
  });

  it('never renders objects or nulls as text', () => {
    expect(asText({ a: 1 })).toBe('');
    expect(asText(null)).toBe('');
    expect(asText(12)).toBe('12');
  });
});
