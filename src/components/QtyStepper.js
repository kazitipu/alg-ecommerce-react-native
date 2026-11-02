import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { normalizeQuantity, stepDown, stepUp } from '../utils/quantity';
import { colors, spacing, typography } from '../theme';
import { appAlert } from '../utils/appAlert';

const POP = { damping: 9, stiffness: 320 };

/**
 * Quantity control that respects a product's `batch` pack size.
 *
 * `available` caps the value at the stock the marketplace reports, which is
 * what the web app's Bengali stock-limit alerts enforced.
 *
 * Typed values are committed when the field is left (submitting also blurs it), not on every
 * keystroke. `validateTyped(text)` can veto one by returning `{ alert }` (the
 * cart's "Can't be empty or 0" rule); `typeable={false}` turns typing off.
 *
 * At zero it is a compact "Add" button; the first tap opens it into a pill with
 * a soft minus, the (typeable) number, and a gradient plus. The number pops on
 * every change, and a control that cannot move further dims.
 */
const QtyStepper = ({
  value,
  onChange,
  batch = 1,
  available,
  min = 0,
  disabled = false,
  typeable = true,
  validateTyped,
}) => {
  const current = Number(value) || 0;
  const stock = Number(available);
  const atMax = Number.isFinite(stock) && stock > 0 && current >= stock;
  const atMin = current <= min;

  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = withSequence(withSpring(1.25, POP), withSpring(1, POP));
  }, [current, scale]);
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const [draft, setDraft] = useState(null);
  const commitTyped = () => {
    if (draft === null) return;
    const text = draft;
    setDraft(null);
    const check = validateTyped?.(text);
    if (check?.alert) {
      appAlert('', check.alert);
      return;
    }
    const next = normalizeQuantity(text, batch, available);
    if (next !== current) onChange(Math.max(next, min));
  };

  const increase = () => {
    if (disabled || atMax) return;
    const next = stepUp(current, batch);
    onChange(
      Number.isFinite(stock) && stock > 0 ? Math.min(next, stock) : next,
    );
  };
  const decrease = () => {
    if (disabled || atMin) return;
    onChange(stepDown(current, batch, min));
  };

  if (current === 0 && min === 0) {
    return (
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(120)}>
        <Pressable
          onPress={increase}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Add"
          style={({ pressed }) => [
            styles.addShadow,
            disabled && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <LinearGradient
            colors={['#ff8a5c', colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.add}>
            <Icon name="add" size={16} color={colors.white} />
            <Text style={styles.addText}>Add</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14)}
      style={[styles.pill, disabled && styles.disabled]}>
      <Pressable
        onPress={decrease}
        hitSlop={6}
        style={({ pressed }) => [
          styles.minus,
          atMin && styles.dim,
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Decrease quantity">
        <Icon
          name={
            min === 0 && current <= (Number(batch) > 1 ? Number(batch) : 1)
              ? 'trash-outline'
              : 'remove'
          }
          size={15}
          color={colors.primary}
        />
      </Pressable>

      <Animated.View style={numberStyle}>
        <TextInput
          style={styles.input}
          value={draft ?? String(current)}
          onChangeText={setDraft}
          onEndEditing={commitTyped}
          keyboardType="number-pad"
          returnKeyType="done"
          editable={!disabled && typeable}
          selectTextOnFocus
        />
      </Animated.View>

      <Pressable
        onPress={increase}
        hitSlop={6}
        style={({ pressed }) => [
          atMax && styles.dim,
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Increase quantity">
        <LinearGradient
          colors={['#ff8a5c', colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.plus}>
          <Icon name="add" size={16} color={colors.white} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

/** Shown next to the stepper when a product only sells in packs. */
export const BatchHint = ({ batch }) =>
  Number(batch) > 1 ? (
    <Animated.View entering={ZoomIn} style={styles.hintChip}>
      <Icon name="albums-outline" size={11} color={colors.accentDark} />
      <Text style={styles.hint}>Sold in packs of {batch}</Text>
    </Animated.View>
  ) : null;

const styles = StyleSheet.create({
  addShadow: {
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addText: {
    marginLeft: 3,
    color: colors.white,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#ffd4cc',
    shadowColor: '#1f2340',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  minus: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minWidth: 40,
    height: 30,
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  dim: { opacity: 0.35 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fff4e6',
  },
  hint: {
    marginLeft: 4,
    fontSize: typography.size.xs,
    color: colors.accentDark,
    fontWeight: typography.weight.semiBold,
  },
});

export default QtyStepper;
