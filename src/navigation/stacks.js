import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES } from './routes';
import { SCREENS } from './screenRegistry';
import { colors, typography } from '../theme';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: {
    fontWeight: typography.weight.semiBold,
    fontSize: typography.size.lg,
  },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

/** Renders `<Stack.Screen>` entries from the registry. */
const screensFor = names =>
  names.map(name => {
    const screen = SCREENS[name];
    return (
      <Stack.Screen
        key={name}
        name={name}
        component={screen.component}
        initialParams={screen.initialParams}
        options={{ title: screen.title }}
      />
    );
  });

/**
 * Each tab owns a stack. Screens that several tabs can reach (product detail,
 * the collection grid) are registered in every stack that needs them so a push
 * stays inside the current tab, which is the standard native behaviour.
 */

const SHOPPING_SCREENS = [
  ROUTES.COLLECTION,
  ROUTES.SEARCH,
  ROUTES.VENDOR_PRODUCTS,
  ROUTES.PRODUCT_DETAIL,
  ROUTES.PRODUCT_1688,
  ROUTES.PRODUCT_TAOBAO,
];

export const HomeStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    {screensFor([ROUTES.HOME, ...SHOPPING_SCREENS, ROUTES.BUY_FOR_ME, ROUTES.REQUEST_PRODUCT])}
  </Stack.Navigator>
);

export const CategoryStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    {screensFor([ROUTES.CATEGORY_LIST, ROUTES.CATEGORY_SUB, ...SHOPPING_SCREENS])}
  </Stack.Navigator>
);

export const CartStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    {screensFor([
      ROUTES.CART,
      ROUTES.PLACE_ORDER,
      ROUTES.ORDER_SUCCESS,
      ROUTES.ORDER_DETAILS,
      ROUTES.LOGISTICS_DETAILS,
      ...SHOPPING_SCREENS,
    ])}
  </Stack.Navigator>
);

/**
 * The dashboard screens are shared by both freight flows. Rather than the web
 * app's two duplicated route trees — where the ship-for-me sidebar linked at
 * the buy-and-ship URLs and left its own screens unreachable — each screen is
 * registered once and takes a `flow` param.
 */
export const OrdersStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    {screensFor([
      ROUTES.DASHBOARD,
      ROUTES.MY_REQUESTS,
      ROUTES.MY_ORDERS,
      ROUTES.FORWARDING_PARCELS,
      ROUTES.DELIVERED,
      ROUTES.TRACKING_DETAILS,
      ROUTES.INVOICE,
      ROUTES.ORDER_DETAILS,
      ROUTES.LOGISTICS_DETAILS,
    ])}
  </Stack.Navigator>
);

export const AccountStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    {screensFor([
      ROUTES.ACCOUNT,
      ROUTES.PROFILE_INFORMATION,
      ROUTES.PROFILE_SECURITY,
      ROUTES.WISHLIST,
      ROUTES.NOTICES,
      ROUTES.NOTICE_DETAIL,
      ROUTES.TRACK_ORDER,
      ROUTES.SHIP_FOR_ME,
      ROUTES.BUY_FOR_ME,
      ROUTES.REQUEST_PRODUCT,
      ROUTES.ABOUT_US,
      ROUTES.FAQ,
      ROUTES.PRIVACY,
      ROUTES.REFUND,
      ROUTES.TERMS,
      ROUTES.TAX_AND_SHIPPING,
      ROUTES.HOW_TO_ORDER,
      ROUTES.CONTACT,
      ...SHOPPING_SCREENS,
    ])}
  </Stack.Navigator>
);

export { screenOptions };
