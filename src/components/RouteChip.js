import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme';

const ROUTE_COLOR = '#c8a47e';

/**
 * "🇨🇳 ✈ 🇧🇩" chip with the plane flying the China → Bangladesh route on a
 * loop. `width` is the length of the dashed route between the flags.
 */
const RouteChip = ({ width = 46, style }) => {
  const flight = useSharedValue(0);

  useEffect(() => {
    // A few flights, then rest: an endless loop keeps the screen redrawing.
    flight.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), 3, false);
    return () => cancelAnimation(flight);
  }, [flight]);

  const planeStyle = useAnimatedStyle(() => ({
    opacity: flight.value < 0.1 ? flight.value * 10 : flight.value > 0.9 ? (1 - flight.value) * 10 : 1,
    transform: [{ translateX: flight.value * (width - 14) }],
  }));

  return (
    <View style={[styles.route, style]}>
      <Text style={styles.flag}>🇨🇳</Text>
      <View style={[styles.track, { width }]}>
        <View style={styles.line} />
        <Animated.View style={[styles.plane, planeStyle]}>
          <Icon name="airplane" size={13} color={colors.primary} />
        </Animated.View>
      </View>
      <Text style={styles.flag}>🇧🇩</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#efe4d6',
  },
  flag: { fontSize: 14 },
  track: { height: 16, marginHorizontal: 4, justifyContent: 'center' },
  line: { height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: ROUTE_COLOR },
  plane: { position: 'absolute', left: 0, top: 1.5 },
});

export default RouteChip;
