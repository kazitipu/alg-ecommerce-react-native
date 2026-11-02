import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, typography } from '../theme';

const EASE = Easing.out(Easing.cubic);
const TOTAL = 7;

/** Done stages are green; the stage in progress is the brand red. */
const GREEN = { solid: '#059669', soft: '#ecfdf5', border: '#bbf0d9', gradient: ['#34d399', '#059669'] };
const RED = { solid: colors.primary, soft: '#fff1ee', border: '#ffd4cc', gradient: ['#ff8a5c', colors.primary, '#e8344a'] };

/** Icon and a one-line explanation per pipeline stage (1 Pending … 7 Delivered). */
export const STAGE_DETAILS = {
  1: { icon: 'time', hint: 'We have received your order' },
  2: { icon: 'checkmark-done', hint: 'Confirmed and bought from the seller' },
  3: { icon: 'business', hint: 'Arrived at our China warehouse' },
  4: { icon: 'airplane', hint: 'Packed and booked on a flight' },
  5: { icon: 'shield-checkmark', hint: 'Clearing customs in Bangladesh' },
  6: { icon: 'cube', hint: 'At our Dhaka warehouse' },
  7: { icon: 'home', hint: 'Handed over to you' },
};

/**
 * How each stage is drawn. Once the order is delivered every stage — the last
 * one included — is a green "done"; before that, finished stages are green,
 * the current one is red ("in progress") and the rest are upcoming.
 */
export const stageStates = (stages, score) => {
  const delivered = Number(score) >= TOTAL;
  return (stages || []).map(stage => ({
    ...stage,
    state: delivered || (stage.complete && !stage.current) ? 'done' : stage.current ? 'current' : 'upcoming',
  }));
};

/** Soft ring rippling out from the stage in progress. */
const Pulse = ({ color }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: EASE }), -1);
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.9]) }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.pulse, { backgroundColor: color }, style]} />;
};

/** The overall bar in the header, filling to the current step. */
const Bar = ({ value, gradient }) => {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(200, withTiming(value, { duration: 900, easing: EASE }));
  }, [value, width]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(width.value * 100, 4)}%` }));
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, style]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
};

/**
 * The 7-stage shipment journey used by both tracking screens.
 * `stages` comes from `buildTimeline(order)`; `score` is `shipmentStatusScore`.
 */
const JourneyTimeline = ({ stages, score, title = 'Journey' }) => {
  const step = Math.min(Math.max(Number(score) || 1, 1), TOTAL);
  const delivered = step >= TOTAL;
  const tone = delivered ? GREEN : RED;
  const rows = stageStates(stages, score);
  const current = rows.find(row => row.state === 'current') || rows[step - 1];

  return (
    <View>
      {/* Header: where the parcel is, step count and overall progress */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.stepChip, { backgroundColor: tone.soft, borderColor: tone.border }]}>
            <Text style={[styles.stepChipText, { color: tone.solid }]}>
              {delivered ? 'Completed' : `Step ${step} of ${TOTAL}`}
            </Text>
          </View>
        </View>
        <Bar value={step / TOTAL} gradient={tone.gradient} />
        <Text style={styles.headerHint}>
          {delivered ? 'All 7 steps done' : `${Math.round((step / TOTAL) * 100)}% of the way to your door`}
        </Text>
      </View>

      {delivered ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient colors={GREEN.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Icon name="checkmark-done" size={20} color={GREEN.solid} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Delivered</Text>
              <Text style={styles.bannerSub}>
                {current?.date ? `Handed over on ${current.date}` : 'Your order has reached you'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}

      {rows.map((row, index) => {
        const details = STAGE_DETAILS[row.score] || { icon: 'ellipse', hint: '' };
        const look = row.state === 'current' ? RED : GREEN;
        const last = index === rows.length - 1;
        const nextDone = rows[index + 1] && rows[index + 1].state !== 'upcoming';
        return (
          <Animated.View
            key={row.score}
            entering={FadeInRight.delay(120 + index * 60).duration(320).easing(EASE)}
            style={styles.row}
          >
            <View style={styles.rail}>
              <View style={styles.dotWrap}>
                {row.state === 'current' ? <Pulse color={RED.solid} /> : null}
                {row.state === 'upcoming' ? (
                  <View style={[styles.dot, styles.dotUpcoming]}>
                    <Icon name={`${details.icon}-outline`} size={14} color={colors.textMuted} />
                  </View>
                ) : (
                  <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dot}>
                    <Icon
                      name={row.state === 'current' || (delivered && last) ? details.icon : 'checkmark'}
                      size={15}
                      color={colors.white}
                    />
                  </LinearGradient>
                )}
              </View>
              {!last ? (
                <View style={styles.lineTrack}>
                  {nextDone ? <View style={[styles.lineFill, { backgroundColor: GREEN.solid }]} /> : null}
                  {row.state === 'current' ? <View style={[styles.lineFill, styles.lineHalf, { backgroundColor: RED.solid }]} /> : null}
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.body,
                row.state === 'current' && { backgroundColor: RED.soft, borderColor: RED.border },
                delivered && last && { backgroundColor: GREEN.soft, borderColor: GREEN.border },
              ]}
            >
              <View style={styles.bodyTop}>
                <Text
                  style={[
                    styles.label,
                    row.state === 'upcoming' && styles.labelUpcoming,
                    row.state === 'current' && { color: RED.solid },
                    delivered && last && { color: GREEN.solid },
                  ]}
                  numberOfLines={1}
                >
                  {row.label}
                </Text>
                {row.state === 'current' ? (
                  <View style={[styles.chip, { backgroundColor: RED.solid }]}>
                    <View style={styles.chipDot} />
                    <Text style={styles.chipText}>In progress</Text>
                  </View>
                ) : row.date ? (
                  <View style={[styles.dateChip, row.state === 'done' && { backgroundColor: GREEN.soft }]}>
                    <Icon name="calendar-outline" size={10} color={row.state === 'done' ? GREEN.solid : colors.textMuted} />
                    <Text style={[styles.dateText, row.state === 'done' && { color: GREEN.solid }]}>{row.date}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.hint, row.state === 'upcoming' && styles.hintUpcoming]}>
                {row.state === 'upcoming' ? `Up next · ${details.hint}` : details.hint}
                {row.state === 'current' && row.date ? ` · since ${row.date}` : ''}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  stepChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  stepChipText: { fontSize: 11, fontWeight: '800' },
  barTrack: { height: 8, marginTop: 10, borderRadius: 4, backgroundColor: '#f0f0f4', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  headerHint: { marginTop: 6, fontSize: 11, color: colors.textMuted },
  banner: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, padding: 12, borderRadius: 16 },
  bannerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, marginLeft: 12 },
  bannerTitle: { fontSize: typography.size.md, fontWeight: '800', color: colors.white },
  bannerSub: { marginTop: 1, fontSize: typography.size.xs, color: 'rgba(255,255,255,0.9)' },
  row: { flexDirection: 'row' },
  rail: { width: 34, alignItems: 'center' },
  dotWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 32, height: 32, borderRadius: 16 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotUpcoming: { borderWidth: 1.5, borderColor: '#e4e4ec', backgroundColor: colors.white },
  lineTrack: { flex: 1, width: 3, minHeight: 14, marginVertical: 3, borderRadius: 2, backgroundColor: '#ececf1', overflow: 'hidden' },
  lineFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  lineHalf: { bottom: '50%' },
  body: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bodyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flexShrink: 1, fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  labelUpcoming: { fontWeight: typography.weight.semiBold, color: colors.textMuted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  chipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.white },
  chipText: { fontSize: 10, fontWeight: '800', color: colors.white },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full, backgroundColor: '#f3f3f6' },
  dateText: { fontSize: 10, fontWeight: typography.weight.bold, color: colors.textMuted },
  hint: { marginTop: 2, fontSize: typography.size.xs, color: colors.textSecondary },
  hintUpcoming: { color: colors.textMuted },
});

export default JourneyTimeline;
