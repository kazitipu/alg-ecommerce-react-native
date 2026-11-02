import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

const MAX_LEAN = 6;
// Degrees of lean per px/ms of horizontal scroll speed.
const LEAN_PER_SPEED = 4;
const FOLLOW = { damping: 20, stiffness: 220 };
// Loosely damped, so cards wobble a little as they settle upright.
const SETTLE = { damping: 6, stiffness: 120, mass: 0.8 };

/**
 * Scroll-driven lean for a horizontal rail. Returns the shared lean value to
 * hand to each card and a scroll handler for the rail: while the rail moves,
 * cards lean with the direction and speed of travel; when it stops they spring
 * back upright. Nothing animates while the rail is still.
 */
export const useRailLean = () => {
  const lean = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastTime = useSharedValue(0);

  const settle = () => {
    'worklet';
    lean.value = withSpring(0, SETTLE);
  };

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: event => {
      lastX.value = event.contentOffset.x;
      lastTime.value = Date.now();
    },
    onScroll: event => {
      const now = Date.now();
      const elapsed = Math.max(now - lastTime.value, 1);
      const speed = (event.contentOffset.x - lastX.value) / elapsed;
      lastX.value = event.contentOffset.x;
      lastTime.value = now;
      const target = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, -speed * LEAN_PER_SPEED));
      lean.value = withSpring(target, FOLLOW);
    },
    onEndDrag: settle,
    onMomentumEnd: settle,
  });

  return { lean, onScroll };
};

/**
 * Wraps one card. It leans with a rail's scroll (pivoting at its base) when
 * given `lean`, and hops up when touched; at rest it stays still and upright.
 * The child receives `onPressIn` to trigger the hop.
 */
const CardMotion = ({ lean, children }) => {
  const hop = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { rotate: `${lean ? lean.value : 0}deg` }],
  }));

  const onPressIn = useCallback(() => {
    hop.value = withSequence(withSpring(-8, { damping: 12, stiffness: 400 }), withSpring(0, SETTLE));
  }, [hop]);

  return (
    <Animated.View style={[styles.pivot, style]}>
      {React.cloneElement(children, { onPressIn })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pivot: { transformOrigin: 'bottom' },
});

export default CardMotion;
