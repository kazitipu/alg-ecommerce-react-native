import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SWEEP_MS = 1300;

/**
 * Loading placeholder with a soft highlight sweeping across it, richer than a
 * plain pulse. Size it with `style` like any block.
 */
const Shimmer = ({ style, borderRadius = 8, color = '#eef0f4' }) => {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + progress.value * width * 2 }],
  }));

  return (
    <View
      style={[styles.block, { borderRadius, backgroundColor: color }, style]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
});

export default Shimmer;
