import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';

const INK = '#1f2340';

/**
 * The floating white pill shared by the bottom tab bar and the screens that
 * hide it (product detail, cart, place order) to show their own call to
 * action in its place. Both use these styles so they line up exactly.
 */
export const floatingBarStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    borderRadius: 26,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
});

/** Bottom padding under the pill: the home-indicator inset, or 10 without one. */
export const floatingBarBottom = insets => Math.max(insets.bottom, 10);

/**
 * A screen's call-to-action bar, sitting where the tab bar would be and
 * sliding up the same way the tab bar does when it appears.
 */
const BottomActionBar = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  const mount = useSharedValue(0);

  useEffect(() => {
    mount.value = withTiming(1, { duration: 450 });
  }, [mount]);

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: mount.value,
    transform: [{ translateY: interpolate(mount.value, [0, 1], [30, 0]) }],
  }));

  return (
    <Animated.View
      style={[floatingBarStyles.wrapper, { paddingBottom: floatingBarBottom(insets) }, wrapperStyle]}>
      <View style={[floatingBarStyles.bar, styles.content, style]}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  content: { minHeight: 66, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10 },
});

export default BottomActionBar;
