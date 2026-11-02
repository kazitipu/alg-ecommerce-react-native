import { orderCounts } from '../src/screens/profile/AccountScreen';
import { BUCKETS } from '../src/utils/dashboard';

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));

describe('account order shortcuts', () => {
  it('counts each section the way My orders (and the website) lists it', () => {
    const ordersApi = [{ orderStatus: 'pending' }, { orderStatus: 'Purchased' }, { orderStatus: 'Alg warehouse' }, { orderStatus: 'Delivered' }];
    const bookings = [{ orderStatus: 'Pending' }, { orderStatus: 'Purchased' }];
    expect(orderCounts(ordersApi, bookings)).toEqual({
      [BUCKETS.REQUESTS]: 2,
      [BUCKETS.ORDERS]: 2,
      [BUCKETS.FORWARDING]: 1,
      [BUCKETS.DELIVERED]: 1,
    });
  });

  it('copes with lists that have not loaded', () => {
    expect(Object.values(orderCounts(undefined, null))).toEqual([0, 0, 0, 0]);
  });
});
