import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

/**
 * Replaces `react-tabs`, and also the dashboard's duplicated sidebar. Scrolls
 * horizontally so the six dashboard destinations fit on a phone.
 */
const SegmentedControl = ({ segments, value, onChange, scrollable = false, style }) => {
  const content = segments.map(segment => {
    const active = segment.value === value;
    return (
      <Pressable
        key={segment.value}
        onPress={() => onChange(segment.value)}
        style={[
          styles.segment,
          scrollable && styles.segmentScrollable,
          active && styles.segmentActive,
        ]}>
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {segment.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.container, style]}>
        {content}
      </ScrollView>
    );
  }

  return <ScrollView horizontal={false} contentContainerStyle={[styles.container, styles.fixed, style]}>{content}</ScrollView>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  fixed: { flexGrow: 1 },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentScrollable: { flex: 0 },
  segmentActive: { backgroundColor: colors.white },
  label: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  labelActive: { color: colors.primary, fontWeight: typography.weight.semiBold },
});

export default SegmentedControl;
