import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import Button from './Button';
import { colors, spacing, typography } from '../theme';

/** Shown wherever a list has nothing in it — cart, wishlist, orders, search. */
const EmptyState = ({ icon = 'file-tray-outline', title, message, actionLabel, onAction }) => (
  <View style={styles.container}>
    <Icon name={icon} size={64} color={colors.borderLight} />
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} style={styles.action} />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});

export default EmptyState;
