import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

/**
 * Pressable that springs down slightly while held, so taps feel physical.
 * The scale runs on the UI thread, so it stays smooth while JS is busy.
 */
const PressableScale = ({ scaleTo = 0.96, style, onPressIn, onPressOut, children, ...rest }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={event => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
