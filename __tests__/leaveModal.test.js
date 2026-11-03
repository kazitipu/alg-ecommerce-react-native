import { leaveToRoute } from '../src/navigation/leaveModal';

describe('leaving the payment page', () => {
  it('opens the return route inside the Orders tab instead of replacing across navigators', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
    leaveToRoute(navigation, 'Dashboard', { paymentStatus: 'success' });
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'OrdersTab',
      params: { screen: 'Dashboard', params: { paymentStatus: 'success' }, initial: false },
    });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('just goes back when there is no return route', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };
    leaveToRoute(navigation, undefined);
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
