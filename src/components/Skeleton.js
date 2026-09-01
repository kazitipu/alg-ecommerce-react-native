import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius } from '../theme';

/**
 * Shimmering loading block, replacing `react-loading-skeleton`.
 * The pulse runs on the UI thread so it stays smooth while data loads.
 */
const Skeleton = ({ width = '100%', height = 16, style, borderRadius = radius.sm }) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius }, animatedStyle, style]}
    />
  );
};

/** Convenience grouping for list placeholders. */
export const SkeletonGroup = ({ count = 3, children, style }) => (
  <View style={style}>
    {Array.from({ length: count }).map((_, index) => (
      <React.Fragment key={index}>{children}</React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: { backgroundColor: colors.borderLight },
});

export default Skeleton;
