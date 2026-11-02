import { isTabBarHidden } from '../src/navigation/TabBar';
import { ROUTES } from '../src/navigation/routes';

const tab = (name, focused) =>
  focused ? { name, state: { index: 0, routes: [{ name: focused }] } } : { name };

describe('tab bar visibility', () => {
  it('hides on screens with their own bottom call to action', () => {
    expect(isTabBarHidden(tab(ROUTES.TAB_HOME, ROUTES.PRODUCT_DETAIL))).toBe(true);
    expect(isTabBarHidden(tab(ROUTES.TAB_CATEGORY, ROUTES.PRODUCT_1688))).toBe(true);
    expect(isTabBarHidden(tab(ROUTES.TAB_CART, ROUTES.PLACE_ORDER))).toBe(true);
    expect(isTabBarHidden(tab(ROUTES.TAB_CART, ROUTES.ORDER_SUCCESS))).toBe(true);
    expect(isTabBarHidden(tab(ROUTES.TAB_HOME, ROUTES.REQUEST_PRODUCT))).toBe(true);
    expect(isTabBarHidden(tab(ROUTES.TAB_HOME, ROUTES.BUY_FOR_ME))).toBe(false);
    // The Cart tab opens on the cart before its stack has any state.
    expect(isTabBarHidden(tab(ROUTES.TAB_CART))).toBe(true);
  });

  it('shows everywhere else', () => {
    expect(isTabBarHidden(tab(ROUTES.TAB_HOME))).toBe(false);
    expect(isTabBarHidden(tab(ROUTES.TAB_HOME, ROUTES.COLLECTION))).toBe(false);
    expect(isTabBarHidden(tab(ROUTES.TAB_ACCOUNT, ROUTES.WISHLIST))).toBe(false);
  });
});
