import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import { floatingBarBottom, floatingBarStyles } from '../components/BottomActionBar';
import PressableScale from '../components/PressableScale';
import { ROUTES } from './routes';
import { colors, typography } from '../theme';

const BAR_HEIGHT = 66;
const CENTER_SIZE = 60;
const RING = 6;
const INDICATOR_WIDTH = 26;
const SLIDE = { damping: 18, stiffness: 190, mass: 0.8 };
const POP = { damping: 10, stiffness: 260 };
const INACTIVE = '#9a9aa6';
const INK = '#1f2340';

/**
 * Screens with their own bottom call to action (in a `BottomActionBar` that
 * takes the tab bar's place), so the tab bar steps out of the way.
 */
export const SCREENS_WITHOUT_TAB_BAR = [
  ROUTES.PRODUCT_DETAIL,
  ROUTES.PRODUCT_1688,
  ROUTES.PRODUCT_TAOBAO,
  ROUTES.CART,
  ROUTES.PLACE_ORDER,
  ROUTES.ORDER_SUCCESS,
  ROUTES.REQUEST_PRODUCT,
  ROUTES.INVOICE,
  ROUTES.TRACKING_DETAILS,
  ROUTES.ORDER_DETAILS,
  ROUTES.LOGISTICS_DETAILS,
];

/** The first screen of each tab's stack, focused before the stack has state. */
const TAB_ROOTS = {
  [ROUTES.TAB_HOME]: ROUTES.HOME,
  [ROUTES.TAB_CATEGORY]: ROUTES.CATEGORY_LIST,
  [ROUTES.TAB_CART]: ROUTES.CART,
  [ROUTES.TAB_ORDERS]: ROUTES.DASHBOARD,
  [ROUTES.TAB_ACCOUNT]: ROUTES.ACCOUNT,
};

/** Whether the screen showing inside the focused tab hides the tab bar. */
export const isTabBarHidden = tabRoute => {
  const name = getFocusedRouteNameFromRoute(tabRoute) ?? TAB_ROOTS[tabRoute.name];
  return SCREENS_WITHOUT_TAB_BAR.includes(name);
};

/** Count bubble that pops whenever the number changes. */
const Badge = ({ value, style }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withSpring(1.4, { damping: 6 }), withSpring(1, POP));
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.badge, style, animatedStyle]}>
      <Text style={styles.badgeText}>{value > 99 ? '99+' : value}</Text>
    </Animated.View>
  );
};

/** A regular tab: icon over label, with a soft highlight and a pop on selection. */
const TabItem = ({ focused, options, label, onPress, onLongPress }) => {
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = focused
      ? withSequence(withTiming(1.25, { duration: 140 }), withSpring(1, POP))
      : withTiming(0, { duration: 180 });
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1], [0, -2]) },
      { scale: interpolate(lift.value, [0, 1, 1.25], [1, 1.06, 1.22]) },
    ],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: Math.min(lift.value, 1),
    transform: [{ scale: interpolate(lift.value, [0, 1], [0.5, 1], 'clamp') }],
  }));

  const color = focused ? colors.primary : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel || label}
      style={styles.item}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.highlight, highlightStyle]} />
        <Animated.View style={iconStyle}>
          {options.tabBarIcon?.({ focused, color, size: 22 })}
        </Animated.View>
        {options.tabBarBadge ? <Badge value={options.tabBarBadge} /> : null}
      </View>
      <Text style={[styles.label, { color }, focused && styles.labelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

/**
 * The raised centre tab (Cart): a gradient disc set into a white ring so it
 * reads as cut into the bar. It wiggles and sends out a pulse whenever the
 * badge count changes, and glows while selected.
 */
const CenterTab = ({ focused, options, label, onPress, onLongPress }) => {
  const badge = options.tabBarBadge;
  const wiggle = useSharedValue(0);
  const pulse = useSharedValue(0);
  const glow = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (!badge) return;
    wiggle.value = withSequence(
      withTiming(-12, { duration: 70 }),
      withTiming(10, { duration: 90 }),
      withTiming(-6, { duration: 80 }),
      withSpring(0, POP),
    );
    pulse.value = 0;
    pulse.value = withTiming(1, { duration: 700 });
  }, [badge, wiggle, pulse]);

  useEffect(() => {
    glow.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused, glow]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.1, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.7]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.35 }));

  return (
    <View style={styles.item}>
      <View style={styles.centerAnchor}>
        <Animated.View pointerEvents="none" style={[styles.centerPulse, pulseStyle]} />
        <Animated.View pointerEvents="none" style={[styles.centerGlow, glowStyle]} />
        <View style={styles.centerRing}>
          <PressableScale
            onPress={onPress}
            onLongPress={onLongPress}
            scaleTo={0.88}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}>
            <LinearGradient
              colors={['#ff8a5c', colors.primary, '#e8344a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerButton}>
              <Animated.View style={iconStyle}>
                {options.tabBarIcon?.({ focused: true, color: colors.white, size: 25 })}
              </Animated.View>
            </LinearGradient>
          </PressableScale>
          {badge ? <Badge value={badge} style={styles.centerBadge} /> : null}
        </View>
      </View>
      <Text
        style={[styles.label, styles.centerLabel, focused && styles.labelFocused]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

/**
 * Floating bottom navigation with a raised centre Cart button. A short red bar
 * slides along the top edge to the selected tab, stretching mid-flight, and
 * hides when the centre tab is selected.
 */
const TabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const count = state.routes.length;
  const centerIndex = Math.floor(count / 2);
  const tabWidth = barWidth / count;

  const position = useSharedValue(state.index);
  const stretch = useSharedValue(1);
  const visible = useSharedValue(state.index === centerIndex ? 0 : 1);
  const mount = useSharedValue(0);

  useEffect(() => {
    mount.value = withTiming(1, { duration: 450 });
  }, [mount]);

  useEffect(() => {
    position.value = withSpring(state.index, SLIDE);
    stretch.value = withSequence(withTiming(1.8, { duration: 150 }), withSpring(1, SLIDE));
    visible.value = withTiming(state.index === centerIndex ? 0 : 1, { duration: 200 });
  }, [state.index, centerIndex, position, stretch, visible]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateX: (position.value + 0.5) * tabWidth - INDICATOR_WIDTH / 2 },
      { scaleX: stretch.value },
    ],
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: mount.value,
    transform: [{ translateY: interpolate(mount.value, [0, 1], [30, 0]) }],
  }));

  if (isTabBarHidden(state.routes[state.index])) return null;

  return (
    <Animated.View
      style={[floatingBarStyles.wrapper, { paddingBottom: floatingBarBottom(insets) }, wrapperStyle]}>
      <View style={[floatingBarStyles.bar, styles.bar]} onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
        {barWidth > 0 ? <Animated.View style={[styles.indicator, indicatorStyle]} /> : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          const Item = index === centerIndex ? CenterTab : TabItem;
          return (
            <Item
              key={route.key}
              focused={focused}
              options={options}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: BAR_HEIGHT },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.primary,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconSlot: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: typography.weight.bold },
  label: { marginTop: 3, fontSize: typography.size.xxs, fontWeight: typography.weight.medium },
  labelFocused: { fontWeight: typography.weight.bold },
  // The centre disc is lifted so half of it rises above the bar.
  centerAnchor: {
    position: 'absolute',
    top: -(CENTER_SIZE / 2 + RING) + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRing: {
    padding: RING,
    borderRadius: (CENTER_SIZE + RING * 2) / 2,
    backgroundColor: colors.white,
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  centerPulse: {
    position: 'absolute',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: colors.primary,
  },
  centerGlow: {
    position: 'absolute',
    width: CENTER_SIZE + 24,
    height: CENTER_SIZE + 24,
    borderRadius: (CENTER_SIZE + 24) / 2,
    backgroundColor: colors.primary,
  },
  centerBadge: { top: 2, right: 2 },
  centerLabel: { marginTop: 34, color: INK },
});

export default TabBar;
