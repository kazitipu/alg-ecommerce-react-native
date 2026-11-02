import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { colors, radius, typography } from '../../../theme';

/**
 * Building blocks shared by the service screens (Buy for me, Request a
 * product), in the style of the redesigned checkout screens.
 */

export const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
export const EASE = Easing.out(Easing.cubic);

/** Firestore values can be numbers, null or objects; inputs need strings. */
export const asText = value =>
  value === undefined || value === null || typeof value === 'object'
    ? ''
    : String(value);

/** Entering animation for the n-th block on a screen: eased fade-up, staggered. */
export const enter = index =>
  FadeInUp.delay(80 + index * 70)
    .duration(380)
    .easing(EASE);

/** White rounded card with a tinted icon tile, title and optional right element. */
export const SectionCard = ({
  icon,
  tint,
  color,
  title,
  hint,
  right,
  index = 0,
  children,
  style,
}) => (
  <Animated.View entering={enter(index)} style={[styles.card, style]}>
    {title ? (
      <View style={styles.cardHeader}>
        <View style={[styles.tile, { backgroundColor: tint }]}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{title}</Text>
          {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
        </View>
        {right}
      </View>
    ) : null}
    {children}
  </Animated.View>
);

/**
 * "How it works": numbered steps across the screen, each with a gradient
 * icon, joined by a line.
 */
export const StepStrip = ({ steps, index = 0 }) => (
  <Animated.View entering={enter(index)} style={styles.strip}>
    {steps.map((step, i) => (
      <View key={step.title} style={styles.stripStep}>
        {i < steps.length - 1 ? <View style={styles.stripLine} /> : null}
        <LinearGradient
          colors={step.colors || GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stripIcon}
        >
          <Icon name={step.icon} size={17} color={colors.white} />
        </LinearGradient>
        <View style={styles.stripNumber}>
          <Text style={styles.stripNumberText}>{i + 1}</Text>
        </View>
        <Text style={styles.stripTitle} numberOfLines={2}>
          {step.title}
        </Text>
        {step.body ? (
          <Text style={styles.stripBody} numberOfLines={3}>
            {step.body}
          </Text>
        ) : null}
      </View>
    ))}
  </Animated.View>
);

/** A small label above a field. */
export const FieldLabel = ({ children, optional }) => (
  <Text style={styles.label}>
    {children}
    {optional ? <Text style={styles.optional}> (optional)</Text> : null}
  </Text>
);

/** Multi-line text field in the AuthField style. */
export const TextArea = ({ icon = 'create-outline', style, ...inputProps }) => (
  <View style={[styles.area, style]}>
    <Icon
      name={icon}
      size={17}
      color={colors.textSecondary}
      style={styles.areaIcon}
    />
    <TextInput
      {...inputProps}
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.textMuted}
      style={styles.areaInput}
    />
  </View>
);

/** Selectable chips; one value. */
export const ChipSelect = ({ options, value, onChange, icons }) => (
  <View style={styles.chips}>
    {options.map(option => {
      const on = option.value === value;
      return (
        <PressableScale
          key={option.value}
          onPress={() => onChange(option.value)}
          scaleTo={0.94}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          style={[styles.chip, on && styles.chipOn]}
        >
          {icons?.[option.value] ? (
            <Icon
              name={icons[option.value]}
              size={13}
              color={on ? colors.white : colors.textSecondary}
            />
          ) : null}
          <Text
            style={[styles.chipText, on && styles.chipTextOn]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </PressableScale>
      );
    })}
  </View>
);

/** Dashed photo drop area; once picked, a preview with replace / remove. */
export const PhotoPicker = ({ photo, onPick, onRemove, label, hint }) =>
  photo ? (
    <Animated.View entering={FadeIn.duration(250)} style={styles.photoCard}>
      <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
      <View style={styles.photoBadge}>
        <Icon name="checkmark-circle" size={14} color="#059669" />
        <Text style={styles.photoBadgeText}>Attached</Text>
      </View>
      <View style={styles.photoActions}>
        <PressableScale
          onPress={onPick}
          scaleTo={0.92}
          style={styles.photoAction}
        >
          <Icon name="swap-horizontal" size={14} color={colors.text} />
          <Text style={styles.photoActionText}>Replace</Text>
        </PressableScale>
        <PressableScale
          onPress={onRemove}
          scaleTo={0.92}
          style={styles.photoAction}
        >
          <Icon name="trash-outline" size={14} color={colors.primary} />
          <Text style={[styles.photoActionText, styles.photoRemove]}>
            Remove
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  ) : (
    <PressableScale onPress={onPick} scaleTo={0.97} style={styles.photoPicker}>
      <View style={styles.photoIcon}>
        <Icon name="image" size={22} color={colors.primary} />
      </View>
      <Text style={styles.photoLabel}>{label}</Text>
      {hint ? <Text style={styles.photoHint}>{hint}</Text> : null}
    </PressableScale>
  );

/** Gradient call to action with a spinner while busy. */
export const GradientButton = ({
  label,
  icon,
  onPress,
  loading,
  disabled,
  style,
}) => (
  <PressableScale
    onPress={loading || disabled ? undefined : onPress}
    disabled={loading || disabled}
    scaleTo={0.96}
    style={[styles.ctaShadow, disabled && styles.ctaDisabled, style]}
  >
    <LinearGradient
      colors={disabled ? ['#c9c9d2', '#b4b4bf'] : GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cta}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={colors.white} /> : null}
          <Text style={styles.ctaText} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </LinearGradient>
  </PressableScale>
);

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleWrap: { flex: 1, marginLeft: 10 },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  cardHint: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  strip: {
    flexDirection: 'row',
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  stripStep: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  stripLine: {
    position: 'absolute',
    top: 19,
    left: '50%',
    right: '-50%',
    height: 2,
    marginHorizontal: 22,
    backgroundColor: '#f0e2dd',
  },
  stripIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripNumber: {
    position: 'absolute',
    top: -4,
    right: '22%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripNumberText: { fontSize: 9, fontWeight: '800', color: colors.primary },
  stripTitle: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  stripBody: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  label: {
    marginBottom: 6,
    marginLeft: 2,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  optional: { fontWeight: typography.weight.medium, color: colors.textMuted },
  area: {
    flexDirection: 'row',
    minHeight: 90,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  areaIcon: { marginTop: 1 },
  areaInput: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 0,
    fontSize: typography.size.md - 1,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  chipTextOn: { color: colors.white },
  photoPicker: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#f3b4a4',
    backgroundColor: '#fff8f6',
  },
  photoIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    marginTop: 8,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  photoHint: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  photoCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f1f1f5',
  },
  photoPreview: { width: '100%', height: 170 },
  photoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  photoBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: '#047857',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    backgroundColor: colors.white,
  },
  photoAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f3f6',
  },
  photoActionText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  photoRemove: { color: colors.primary },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaDisabled: { shadowOpacity: 0, elevation: 0 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  ctaText: {
    flexShrink: 1,
    color: colors.white,
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
  },
});
