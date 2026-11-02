import { StackActions } from '@react-navigation/native';

import { ROUTES } from './routes';

/** The screens of the sign-in flow, all presented as modals over the app. */
export const AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.PHONE_LOGIN,
  ROUTES.OTP_VERIFY,
];

const rootOf = navigation => {
  let current = navigation;
  while (current?.getParent?.()) current = current.getParent();
  return current;
};

/** How many sign-in screens sit on top of the root stack. */
export const countAuthRoutesOnTop = routes => {
  let count = 0;
  for (let i = routes.length - 1; i >= 0 && AUTH_ROUTES.includes(routes[i].name); i -= 1) {
    count += 1;
  }
  return count;
};

/**
 * Close every sign-in screen and return to where sign-in was asked for —
 * the web's `history.goBack()` / `history.push(location.state.from)`.
 */
export const leaveAuth = navigation => {
  const root = rootOf(navigation);
  const count = countAuthRoutesOnTop(root.getState()?.routes || []);
  if (count > 0) root.dispatch(StackActions.pop(count));
};

/** Close the sign-in flow and land on Home — the web's `history.push('/')`. */
export const leaveAuthToHome = navigation => {
  rootOf(navigation).popTo('MainTabs', {
    screen: ROUTES.TAB_HOME,
    params: { screen: ROUTES.HOME, pop: true },
  });
};
