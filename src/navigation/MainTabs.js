import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@react-native-vector-icons/ionicons';
import { useSelector } from 'react-redux';

import { ROUTES } from './routes';
import { AccountStack, CartStack, CategoryStack, HomeStack, OrdersStack } from './stacks';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

/**
 * Total cart lines, matching the web header badge: one per item in each shop
 * entry, or one for a shop entry that carries no items array.
 */
export const selectCartCount = cart =>
  (cart || []).reduce((total, shop) => total + (shop.items?.length || 1), 0);

/**
 * Icon renderers are built once at module scope. Creating them inline in
 * `options` would hand React Navigation a brand-new component type on every
 * render and remount the icon each time.
 */
const tabBarIcon = iconName => {
  const TabBarIcon = ({ color, size, focused }) => (
    <Icon name={focused ? iconName : `${iconName}-outline`} color={color} size={size} />
  );
  TabBarIcon.displayName = `TabBarIcon(${iconName})`;
  return TabBarIcon;
};

const TABS = [
  { name: ROUTES.TAB_HOME, component: HomeStack, label: 'Home', icon: tabBarIcon('home') },
  { name: ROUTES.TAB_CATEGORY, component: CategoryStack, label: 'Categories', icon: tabBarIcon('grid') },
  { name: ROUTES.TAB_CART, component: CartStack, label: 'Cart', icon: tabBarIcon('cart') },
  { name: ROUTES.TAB_ORDERS, component: OrdersStack, label: 'Orders', icon: tabBarIcon('cube') },
  { name: ROUTES.TAB_ACCOUNT, component: AccountStack, label: 'Account', icon: tabBarIcon('person') },
];

const navigatorScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { fontSize: typography.size.xxs },
  tabBarStyle: { borderTopColor: colors.borderLight },
};

const MainTabs = () => {
  const cartCount = useSelector(state => selectCartCount(state.cartList.cart));

  return (
    <Tab.Navigator screenOptions={navigatorScreenOptions}>
      {TABS.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: tab.icon,
            ...(tab.name === ROUTES.TAB_CART && cartCount > 0
              ? { tabBarBadge: cartCount }
              : null),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default MainTabs;
