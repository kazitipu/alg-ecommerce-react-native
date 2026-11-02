import { StackActions } from '@react-navigation/native';

import { countAuthRoutesOnTop, leaveAuth, leaveAuthToHome } from '../src/navigation/authExit';
import { ROUTES } from '../src/navigation/routes';
import { SCREENS } from '../src/navigation/screenRegistry';

const root = routes => ({
  getParent: () => undefined,
  getState: () => ({ routes: routes.map(name => ({ name })) }),
  dispatch: jest.fn(),
  popTo: jest.fn(),
});

describe('leaving the sign-in flow', () => {
  it('registers phone sign-in as its own screen', () => {
    expect(SCREENS[ROUTES.PHONE_LOGIN].component).toBeDefined();
  });

  it('counts only the sign-in screens on top of the stack', () => {
    const names = ['MainTabs', ROUTES.PAYMENT_SHEET, ROUTES.LOGIN, ROUTES.PHONE_LOGIN, ROUTES.OTP_VERIFY];
    expect(countAuthRoutesOnTop(names.map(name => ({ name })))).toBe(3);
    expect(countAuthRoutesOnTop([{ name: 'MainTabs' }])).toBe(0);
  });

  it('pops login, phone and OTP together, back to where sign-in started', () => {
    const nav = root(['MainTabs', ROUTES.LOGIN, ROUTES.PHONE_LOGIN, ROUTES.OTP_VERIFY]);
    const child = { getParent: () => nav };
    leaveAuth(child);
    expect(nav.dispatch).toHaveBeenCalledWith(StackActions.pop(3));
  });

  it('goes to Home after email sign-in, like the web', () => {
    const nav = root(['MainTabs', ROUTES.LOGIN]);
    leaveAuthToHome(nav);
    expect(nav.popTo).toHaveBeenCalledWith('MainTabs', {
      screen: ROUTES.TAB_HOME,
      params: { screen: ROUTES.HOME, pop: true },
    });
  });
});
