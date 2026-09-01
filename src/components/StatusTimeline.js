import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { buildTimeline } from '../utils/tracking';
import { colors, spacing, typography } from '../theme';

/**
 * The 7-stage freight pipeline — Pending through Delivered — shown on the
 * public tracking screen and on each order's tracking detail.
 */
const StatusTimeline = ({ order }) => {
  const stages = buildTimeline(order);

  return (
    <View style={styles.container}>
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        return (
          <View key={stage.score} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, stage.complete && styles.dotComplete]}>
                {stage.complete ? (
                  <Icon name="checkmark" size={12} color={colors.white} />
                ) : null}
              </View>
              {!isLast ? (
                <View style={[styles.line, stage.complete && styles.lineComplete]} />
              ) : null}
            </View>

            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  stage.complete && styles.labelComplete,
                  stage.current && styles.labelCurrent,
                ]}>
                {stage.label}
              </Text>
              {stage.date ? <Text style={styles.date}>{stage.date}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  row: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: 32 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotComplete: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 28,
    backgroundColor: colors.borderLight,
  },
  lineComplete: { backgroundColor: colors.success },
  content: { flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.sm },
  label: {
    fontSize: typography.size.md,
    color: colors.textMuted,
  },
  labelComplete: { color: colors.text },
  labelCurrent: {
    color: colors.primary,
    fontWeight: typography.weight.bold,
  },
  date: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});

export default StatusTimeline;
