import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../../components/PressableScale';
import { colors, radius, spacing, typography } from '../../../theme';

const SHEET_TRAVEL = 420;
const CLOSE_DELAY = 180;

/** Animated radio: the inner dot springs in when selected. */
const Radio = ({ selected }) => {
  const scale = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1 : 0, { damping: 12, stiffness: 260 });
  }, [selected, scale]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      <Animated.View style={[styles.radioDot, dotStyle]} />
    </View>
  );
};

/**
 * Sort picker that springs up from the bottom over a fading backdrop. Each
 * option is a card with an icon and a one-line explanation; choosing one
 * applies it and closes the sheet.
 */
const SortSheet = ({ visible, options, value, onChange, onClose }) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, { damping: 18, stiffness: 170 });
    } else {
      progress.value = withTiming(0, { duration: 220 }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [SHEET_TRAVEL, 0]) }],
  }));

  const choose = option => {
    onChange(option.value);
    // Let the radio animate before the sheet slides away.
    setTimeout(onClose, CLOSE_DELAY);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }, sheetStyle]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="swap-vertical" size={18} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Sort products</Text>
            <Text style={styles.subtitle}>Applies to the products loaded so far</Text>
          </View>
          <PressableScale onPress={onClose} scaleTo={0.85} hitSlop={10} style={styles.close} accessibilityLabel="Close">
            <Icon name="close" size={18} color={colors.text} />
          </PressableScale>
        </View>

        {options.map(option => {
          const selected = option.value === value;
          return (
            <PressableScale
              key={option.value || 'default'}
              onPress={() => choose(option)}
              scaleTo={0.97}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}>
              <View style={[styles.optionIcon, { backgroundColor: option.tint }]}>
                <Icon name={option.icon} size={18} color={option.color} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                <Text style={styles.optionCaption}>{option.caption}</Text>
              </View>
              <Radio selected={selected} />
            </PressableScale>
          );
        })}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 22, 38, 0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginTop: 10,
    borderRadius: 3,
    backgroundColor: '#e2e2e8',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: spacing.sm + 4 },
  title: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text },
  subtitle: { marginTop: 1, fontSize: typography.size.xs, color: colors.textMuted },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#efeff3',
    backgroundColor: colors.white,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#fff7f6' },
  optionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, marginLeft: spacing.sm + 4 },
  optionLabel: { fontSize: typography.size.md, fontWeight: typography.weight.semiBold, color: colors.text },
  optionLabelSelected: { color: colors.primary },
  optionCaption: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d6d6de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});

export default SortSheet;
