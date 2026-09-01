import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';
import { linking } from './linking';
import { ROUTES } from './routes';
import { SCREENS } from './screenRegistry';
import { screenOptions } from './stacks';

const Stack = createNativeStackNavigator();

/** Screens presented over the tabs rather than inside them. */
const MODAL_SCREENS = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.OTP_VERIFY,
  ROUTES.PAYMENT_SHEET,
  ROUTES.PAYMENT_WEBVIEW,
  ROUTES.LOGISTICS_MODAL,
  ROUTES.DISCOUNT_MODAL,
  ROUTES.GALLERY,
];

/**
 * Root: the tab bar plus a modal group.
 *
 * Auth lives here rather than replacing the app when signed out, because the
 * storefront is browsable without an account — exactly as on the web. Sign-in
 * is requested only when a protected action is taken, via `useAuthGuard`.
 */
const RootNavigator = () => (
  <NavigationContainer linking={linking}>
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        {MODAL_SCREENS.map(name => (
          <Stack.Screen
            key={name}
            name={name}
            component={SCREENS[name].component}
            initialParams={SCREENS[name].initialParams}
            options={{ title: SCREENS[name].title }}
          />
        ))}
      </Stack.Group>
    </Stack.Navigator>
  </NavigationContainer>
);

export default RootNavigator;
