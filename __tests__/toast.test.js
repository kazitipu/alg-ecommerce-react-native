import Toast from 'react-native-toast-message';

import { pickToastIcon } from '../src/components/ToastCard';
import { notifyError, notifySuccess } from '../src/utils/notify';

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

describe('toasts', () => {
  it('picks shopping icons from the message', () => {
    expect(pickToastIcon('success', 'Item added to cart')).toBe('cart');
    expect(pickToastIcon('success', 'Item added to wishlist')).toBe('heart');
    expect(pickToastIcon('success', 'Payment received')).toBe('card');
    expect(pickToastIcon('info', 'Item removed from cart')).toBe('cart');
    expect(pickToastIcon('success', 'Successfully logged in!')).toBe('person-circle');
    expect(pickToastIcon('success', 'All good')).toBe('checkmark-circle');
    expect(pickToastIcon('error', 'Could not add this to your cart.')).toBe('alert-circle');
  });

  it('gives each toast a fresh id and a matching countdown', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    notifySuccess('Added to Cart');
    notifyError(new Error('Network down'));
    const [first, second] = Toast.show.mock.calls.map(([options]) => options);
    expect(first).toMatchObject({ type: 'success', text1: 'Added to Cart', visibilityTime: first.props.duration });
    expect(second).toMatchObject({ type: 'error', text2: 'Network down' });
    expect(second.props.id).toBeGreaterThan(first.props.id);
  });
});
