import React, { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Resting angles cycled by position, so neighbours lean different ways.
const ANGLES = [-2, 1.6, -1.2, 2.2, -1.8, 1.2];
const SWAY = 0.9;
const FLOAT = 3;

/**
 * Keeps its child gently moving, with each position on its own period and
 * phase so a row never moves in lockstep.
 *
 *  - `motion="sway"` leans the card at a small angle and rocks it around that
 *    angle, like a card pinned to a board; `origin="top"` swings it from its pin.
 *  - `motion="float"` keeps the card upright and lets it bob up and down.
 */
const Tilt = ({ index = 0, origin = 'center', motion = 'sway', children, style }) => {
  const floating = motion === 'float';
  const base = floating ? 0 : ANGLES[index % ANGLES.length];
  const amplitude = floating ? FLOAT : SWAY;
  const value = useSharedValue(base);

  useEffect(() => {
    const duration = 2400 + (index % 4) * 350;
    const ease = Easing.inOut(Easing.sin);
    value.value = withDelay(
      (index % 5) * 180,
      withRepeat(
        withSequence(
          withTiming(base + amplitude, { duration, easing: ease }),
          withTiming(base - amplitude, { duration, easing: ease }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(value);
  }, [value, base, amplitude, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: floating ? [{ translateY: value.value }] : [{ rotate: `${value.value}deg` }],
  }));

  return (
    <Animated.View style={[{ transformOrigin: origin }, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export default Tilt;
