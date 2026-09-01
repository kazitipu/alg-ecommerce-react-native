import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

/**
 * Primary action button.
 *
 * `loading` both shows a spinner and blocks presses, which is how the web
 * forms guarded against double submission (they tracked a `loader` flag and
 * returned early).
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: { backgroundColor: colors.transparent },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
  },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.primary },
  ghostLabel: { color: colors.primary },
});

export default Button;
