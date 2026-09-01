import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

/** Labelled text field with inline validation messaging. */
const Input = ({ label, error, style, ...rest }) => (
  <View style={[styles.container, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholderTextColor={colors.textMuted}
      {...rest}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  error: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    color: colors.error,
  },
});

export default Input;
