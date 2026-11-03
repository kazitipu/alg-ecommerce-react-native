import { ROUTES } from './routes';

/**
 * Leaves a full-screen page that sits above the tabs (payment sheet, card
 * checkout) for `returnRoute` inside the Orders tab.
 *
 * Those pages live in the root stack, while My orders lives in the Orders
 * tab's own stack, so `navigation.replace(ROUTES.DASHBOARD)` was ignored and
 * the customer stayed on the payment page after their payment had been saved.
 * Navigating to the tabs closes the page and opens the route there; with no
 * `returnRoute` it simply goes back (e.g. to Order success).
 */
export const leaveToRoute = (navigation, returnRoute, params) => {
  if (!returnRoute) {
    if (navigation.canGoBack()) navigation.goBack();
    return;
  }
  navigation.navigate('MainTabs', {
    screen: ROUTES.TAB_ORDERS,
    params: { screen: returnRoute, params, initial: false },
  });
};

export default leaveToRoute;
