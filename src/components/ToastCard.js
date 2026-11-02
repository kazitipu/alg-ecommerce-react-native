import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, typography } from '../theme';

const INK = '#1f2340';

/** Colours and fallback icon per toast type. */
export const TOAST_LOOKS = {
  success: { gradient: ['#34d399', '#059669'], tint: '#ecfdf5', accent: '#059669', icon: 'checkmark-circle', title: 'Done' },
  error: { gradient: ['#ff8a7a', '#e11d48'], tint: '#fff1f2', accent: '#e11d48', icon: 'alert-circle', title: 'Oops!' },
  info: { gradient: ['#7aa8ff', '#4f46e5'], tint: '#eef2ff', accent: '#4f46e5', icon: 'information-circle', title: 'Heads up' },
};

/**
 * Shopping-flavoured icons picked from the message, so "Item added to cart"
 * shows a cart and "Payment received" a card. First match wins.
 */
const ICON_RULES = [
  [/wishlist/i, 'heart'],
  [/cart/i, 'cart'],
  [/compare/i, 'git-compare'],
  [/payment|bkash|card/i, 'card'],
  [/coupon|discount/i, 'pricetag'],
  [/refund/i, 'cash'],
  [/otp|sms|code/i, 'chatbubble-ellipses'],
  [/password/i, 'lock-closed'],
  [/logged in|sign|account|profile/i, 'person-circle'],
  [/email/i, 'mail'],
  [/address/i, 'location'],
  [/invoice|pdf/i, 'document-text'],
  [/order|parcel|booking/i, 'cube'],
  [/copied|link/i, 'link'],
  [/photo|image/i, 'image'],
];

export const pickToastIcon = (type, text1 = '', text2 = '') => {
  const look = TOAST_LOOKS[type] || TOAST_LOOKS.info;
  if (type === 'error') return look.icon;
  const text = `${text1} ${text2}`;
  const rule = ICON_RULES.find(([pattern]) => pattern.test(text));
  return rule ? rule[1] : look.icon;
};

/** Small dots that burst out of the icon on success. */
const Sparkle = ({ angle, color, delay }) => {
  const burst = useSharedValue(0);
  useEffect(() => {
    burst.value = withDelay(delay, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [burst, delay]);
  const style = useAnimatedStyle(() => {
    const distance = interpolate(burst.value, [0, 1], [0, 30]);
    return {
      opacity: interpolate(burst.value, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: interpolate(burst.value, [0, 0.4, 1], [0.4, 1.1, 0.5]) },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.sparkle, { backgroundColor: color }, style]} />;
};

const SPARKLES = [
  { angle: -Math.PI / 2, color: '#fbbf24', delay: 120 },
  { angle: -Math.PI / 6, color: '#f472b6', delay: 160 },
  { angle: Math.PI / 6, color: '#60a5fa', delay: 200 },
  { angle: (5 * Math.PI) / 6, color: '#34d399', delay: 180 },
  { angle: (-5 * Math.PI) / 6, color: '#fb7185', delay: 140 },
];

/**
 * The app-wide toast: a floating white card with a gradient icon tile that
 * pops in (and shakes for errors, bursts for successes), a title and message
 * that slide in, and a bar along the bottom counting down until it hides.
 * Tap to dismiss, or swipe it away.
 */
const ToastCard = ({ type = 'info', text1, text2, hide, props = {} }) => {
  const look = TOAST_LOOKS[type] || TOAST_LOOKS.info;
  const icon = props.icon || pickToastIcon(type, text1, text2);
  const duration = props.duration || 3500;
  const title = text1 || look.title;

  const pop = useSharedValue(0);
  const shake = useSharedValue(0);
  const ring = useSharedValue(0);
  const progress = useSharedValue(1);

  useEffect(() => {
    pop.value = 0;
    pop.value = withSpring(1, { damping: 9, stiffness: 220 });
    ring.value = 0;
    ring.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), 2, false);
    progress.value = 1;
    progress.value = withTiming(0, { duration, easing: Easing.linear });
    if (type === 'error') {
      shake.value = withDelay(
        180,
        withSequence(
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 70 }),
          withTiming(-5, { duration: 60 }),
          withTiming(5, { duration: 60 }),
          withSpring(0, { damping: 8 }),
        ),
      );
    }
  }, [props.id, type, duration, pop, ring, progress, shake]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pop.value, [0, 1], [0.3, 1]) },
      { rotate: `${interpolate(pop.value, [0, 1], [-30, 0])}deg` },
    ],
  }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.4, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.6]) }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View style={[styles.shadow, cardStyle]}>
      <Pressable onPress={hide} accessibilityRole="alert" accessibilityLabel={`${title}. ${text2 || ''}`} style={styles.card}>
        <LinearGradient
          colors={[look.tint, colors.white]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.stripe, { backgroundColor: look.accent }]} />

        <View style={styles.iconArea}>
          <Animated.View pointerEvents="none" style={[styles.ring, { backgroundColor: look.accent }, ringStyle]} />
          {type === 'success' ? SPARKLES.map(s => <Sparkle key={`${props.id}-${s.angle}`} {...s} />) : null}
          <Animated.View style={tileStyle}>
            <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
              <Icon name={icon} size={22} color={colors.white} />
            </LinearGradient>
          </Animated.View>
        </View>

        <View style={styles.text}>
          <Animated.Text key={`t-${props.id}`} entering={FadeInRight.delay(80).duration(280)} style={styles.title} numberOfLines={1}>
            {title}
          </Animated.Text>
          {text2 ? (
            <Animated.Text key={`m-${props.id}`} entering={FadeIn.delay(160).duration(300)} style={styles.message} numberOfLines={3}>
              {text2}
            </Animated.Text>
          ) : null}
        </View>

        <View style={styles.close}>
          <Icon name="close" size={14} color="#9a9aa6" />
        </View>

        <View style={styles.track}>
          <Animated.View style={[styles.progress, progressStyle]}>
            <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/** Renderers for `<Toast config={toastConfig} />`. */
export const toastConfig = {
  success: props => <ToastCard {...props} type="success" />,
  error: props => <ToastCard {...props} type="error" />,
  info: props => <ToastCard {...props} type="info" />,
};

const styles = StyleSheet.create({
  shadow: {
    width: '92%',
    maxWidth: 480,
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(31, 35, 64, 0.06)',
  },
  stripe: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  iconArea: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 46, height: 46, borderRadius: 16 },
  sparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  tile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, marginLeft: 12, marginRight: 6 },
  title: { fontSize: typography.size.md - 1, fontWeight: '800', color: INK },
  message: { marginTop: 2, fontSize: typography.size.sm - 1, lineHeight: 18, color: colors.textSecondary },
  close: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(31, 35, 64, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(31, 35, 64, 0.05)' },
  progress: { height: 3, overflow: 'hidden', borderTopRightRadius: 2, borderBottomRightRadius: 2 },
});

export default ToastCard;
