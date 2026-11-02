import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, typography } from '../../../theme';

/** The six steps from the web's "How buy and ship for me works" banner. */
export const HOW_IT_WORKS_STEPS = [
  { icon: 'phone-portrait', label: 'Place Order', caption: 'Order in the app', colors: ['#ffb35c', '#f97316'] },
  { icon: 'receipt', label: 'Purchase Order', caption: 'We buy from the seller', colors: ['#ff8a5c', '#f2542d'] },
  { icon: 'business', label: 'Received in China', caption: 'At our China warehouse', colors: ['#ff7a7a', '#e8344a'] },
  { icon: 'airplane', label: 'Shipped to Bangladesh', caption: 'By air, customs cleared', colors: ['#7aa8ff', '#4f46e5'] },
  { icon: 'archive', label: 'Received in BD', caption: 'At our Dhaka hub', colors: ['#5eead4', '#0d9488'] },
  { icon: 'home', label: 'Delivered to Doorstep', caption: 'Right to your door', colors: ['#4ade80', '#059669'] },
];

const COLUMNS = 3;
const TILE = 50;

/** A dot that travels along a connector, hinting at the direction of travel. */
const Connector = ({ delay }) => {
  const travel = useSharedValue(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      travel.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(travel);
    };
  }, [travel, delay]);
  const dotStyle = useAnimatedStyle(() => ({
    left: `${travel.value * 100}%`,
    opacity: interpolate(travel.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
  }));
  return (
    <View style={styles.connector} pointerEvents="none">
      <View style={styles.connectorLine} />
      <Animated.View style={[styles.connectorDot, dotStyle]} />
    </View>
  );
};

const Step = ({ step, index }) => (
  <Animated.View entering={FadeInDown.delay(index * 90).springify().damping(15)} style={styles.step}>
    <View style={styles.tileWrap}>
      <LinearGradient colors={step.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <Icon name={step.icon} size={22} color={colors.white} />
      </LinearGradient>
      <View style={[styles.number, { borderColor: step.colors[1] }]}>
        <Text style={[styles.numberText, { color: step.colors[1] }]}>{index + 1}</Text>
      </View>
    </View>
    <Text style={styles.label} numberOfLines={2}>
      {step.label}
    </Text>
    <Text style={styles.caption} numberOfLines={2}>
      {step.caption}
    </Text>
  </Animated.View>
);

/**
 * "How buy and ship for me works", drawn natively instead of the web's banner
 * image: six numbered steps in two rows of three, linked by connectors with a
 * travelling dot, and a "Buy & ship for me" route strip on top.
 */
const HowItWorks = () => {
  const rows = [];
  for (let i = 0; i < HOW_IT_WORKS_STEPS.length; i += COLUMNS) {
    rows.push(HOW_IT_WORKS_STEPS.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.card}>
      <LinearGradient colors={['#fff4f0', '#ffffff']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="sparkles" size={14} color={colors.white} />
        </View>
        <Text style={styles.headerText}>How buy and ship for me works</Text>
      </View>
      <View style={styles.route}>
        <Text style={styles.routeEnd}>🇨🇳 China</Text>
        <View style={styles.routeLine} />
        <Icon name="airplane" size={14} color={colors.primary} />
        <View style={styles.routeLine} />
        <Text style={styles.routeEnd}>Bangladesh 🇧🇩</Text>
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex > 0 && styles.rowGap]}>
          {row.map((step, column) => {
            const index = rowIndex * COLUMNS + column;
            return (
              <View key={step.label} style={styles.cell}>
                <Step step={step} index={index} />
                {column < row.length - 1 ? <Connector delay={index * 250} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffe3da',
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { marginLeft: 8, fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  route: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 16, paddingHorizontal: 4, gap: 6 },
  routeEnd: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.textSecondary },
  routeLine: { flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#f3b4a4' },
  row: { flexDirection: 'row' },
  rowGap: { marginTop: 16 },
  cell: { width: `${100 / COLUMNS}%` },
  step: { alignItems: 'center', paddingHorizontal: 4 },
  tileWrap: { width: TILE + 8, height: TILE + 8, alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  number: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 10, fontWeight: '800' },
  label: { marginTop: 6, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.text, textAlign: 'center' },
  caption: { marginTop: 2, fontSize: 10, lineHeight: 13, color: colors.textMuted, textAlign: 'center' },
  // Sits between this cell's tile and the next one's, level with the tiles.
  connector: { position: 'absolute', top: (TILE + 8) / 2 - 1, left: '50%', right: '-50%', marginHorizontal: TILE / 2 + 8, height: 2 },
  connectorLine: { ...StyleSheet.absoluteFill, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#f3c2b5' },
  connectorDot: { position: 'absolute', top: -2, width: 6, height: 6, marginLeft: -3, borderRadius: 3, backgroundColor: colors.primary },
});

export default HowItWorks;
