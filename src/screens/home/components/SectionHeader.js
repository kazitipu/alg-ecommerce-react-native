import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import PressableScale from '../../../components/PressableScale';
import { colors, radius, spacing, typography } from '../../../theme';

/**
 * Section title with an accent bar, an optional subtitle, and on the right
 * either a "View all" pill or a custom `accessory`.
 */
const SectionHeader = ({ title, subtitle, icon, onViewAll, accessory }) => (
  <View style={styles.container}>
    <View style={styles.titleWrap}>
      <View style={styles.accent} />
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          {icon ? <Icon name={icon} size={18} color={colors.primary} style={styles.icon} /> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>

    {accessory}
    {onViewAll ? (
      <PressableScale onPress={onViewAll} scaleTo={0.92} hitSlop={8} style={styles.viewAll}>
        <Text style={styles.viewAllText}>View all</Text>
        <Icon name="chevron-forward" size={14} color={colors.primary} />
      </PressableScale>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  accent: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  texts: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 6 },
  title: {
    fontSize: typography.size.lg + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  subtitle: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 1 },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  viewAllText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.primary,
    marginRight: 2,
  },
});

export default SectionHeader;
