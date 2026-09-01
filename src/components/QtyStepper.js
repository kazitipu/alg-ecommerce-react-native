import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { normalizeQuantity, stepDown, stepUp } from '../utils/quantity';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Quantity control that respects a product's `batch` pack size.
 *
 * `available` caps the value at the stock the marketplace reports, which is
 * what the web app's Bengali stock-limit alerts enforced.
 */
const QtyStepper = ({ value, onChange, batch = 1, available, min = 0, disabled = false }) => {
  const commitTyped = text => onChange(normalizeQuantity(text, batch, available));

  const increase = () => {
    const next = stepUp(value, batch);
    const stock = Number(available);
    onChange(Number.isFinite(stock) && stock > 0 ? Math.min(next, stock) : next);
  };

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <Pressable
        onPress={disabled ? undefined : () => onChange(stepDown(value, batch, min))}
        hitSlop={8}
        style={styles.button}
        accessibilityLabel="Decrease quantity">
        <Icon name="remove" size={18} color={colors.text} />
      </Pressable>

      <TextInput
        style={styles.input}
        value={String(value ?? 0)}
        onChangeText={commitTyped}
        keyboardType="number-pad"
        editable={!disabled}
        selectTextOnFocus
      />

      <Pressable
        onPress={disabled ? undefined : increase}
        hitSlop={8}
        style={styles.button}
        accessibilityLabel="Increase quantity">
        <Icon name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
};

/** Shown next to the stepper when a product only sells in packs. */
export const BatchHint = ({ batch }) =>
  Number(batch) > 1 ? (
    <Text style={styles.hint}>Sold in packs of {batch}</Text>
  ) : null;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  disabled: { opacity: 0.5 },
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  input: {
    minWidth: 44,
    height: 34,
    textAlign: 'center',
    fontSize: typography.size.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    color: colors.accent,
  },
});

export default QtyStepper;
