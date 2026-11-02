import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import PressableScale from './PressableScale';
import { CONTACT } from '../constants/config';
import { colors, radius, spacing, typography } from '../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const INK = '#1f2340';

/** After this many failed retries the screen suggests restarting the app. */
const RETRY_HINT_AFTER = 2;

/** A parcel that bobs, with a warning badge that wobbles and dots orbiting it. */
const Illustration = () => {
  const bob = useSharedValue(0);
  const wobble = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-8, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1);
    wobble.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 120 }),
        withTiming(12, { duration: 140 }),
        withTiming(-6, { duration: 120 }),
        withTiming(0, { duration: 120 }),
        withTiming(0, { duration: 1600 }),
      ),
      -1,
    );
    spin.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(bob);
      cancelAnimation(wobble);
      cancelAnimation(spin);
    };
  }, [bob, wobble, spin]);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + bob.value / 40 }], opacity: 0.6 + bob.value / 40 }));

  return (
    <View style={styles.art}>
      <Animated.View style={[styles.orbit, orbitStyle]}>
        <View style={[styles.orbitDot, styles.orbitDotA]} />
        <View style={[styles.orbitDot, styles.orbitDotB]} />
        <View style={[styles.orbitDot, styles.orbitDotC]} />
      </Animated.View>
      <Animated.View style={boxStyle}>
        <LinearGradient colors={['#ffe7e0', '#ffd0c2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.box}>
          <Icon name="cube" size={52} color={colors.primary} />
        </LinearGradient>
        <Animated.View style={[styles.badge, badgeStyle]}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badgeInner}>
            <Icon name="alert" size={18} color={colors.white} />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.artShadow, shadowStyle]} />
    </View>
  );
};

/** What the customer sees in place of a screen that crashed. */
const ErrorFallback = ({ error, retries, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const message = error?.message || String(error);
  // A short reference the customer can quote to support.
  const [ref] = useState(() => `ALG-${Date.now().toString(36).toUpperCase()}`);

  const contactSupport = () => {
    const text = encodeURIComponent(`Hi ALG, the app showed an error (${ref}): ${message}`);
    Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}?text=${text}`).catch(() => {});
  };

  const copyDetails = () => Clipboard.setString(`${ref}\n${message}`);

  return (
    <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={styles.container}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(14)}>
          <Illustration />
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(120).duration(400)} style={styles.title}>
          Oops! Something went wrong
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.message}>
          This screen ran into a problem — your cart, orders and payments are safe. Try again, and if it keeps
          happening our team is one tap away.
        </Animated.Text>

        {retries >= RETRY_HINT_AFTER ? (
          <Animated.View entering={FadeIn} style={styles.hint}>
            <Icon name="refresh-circle" size={16} color="#c25e00" />
            <Text style={styles.hintText}>Still not working? Close the app completely and open it again.</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(280).duration(400)} style={styles.actions}>
          <PressableScale onPress={onRetry} scaleTo={0.96} style={styles.primaryShadow}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
              <Icon name="refresh" size={17} color={colors.white} />
              <Text style={styles.primaryText}>Try again</Text>
            </LinearGradient>
          </PressableScale>

          <PressableScale onPress={contactSupport} scaleTo={0.97} style={styles.secondary}>
            <View style={styles.whatsapp}>
              <Icon name="logo-whatsapp" size={16} color={colors.white} />
            </View>
            <Text style={styles.secondaryText}>Chat with support</Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400)} style={styles.details}>
          <PressableScale onPress={() => setShowDetails(!showDetails)} scaleTo={0.98} style={styles.detailsHeader}>
            <Icon name="code-slash" size={14} color={colors.textSecondary} />
            <Text style={styles.detailsTitle}>Error details</Text>
            <Text style={styles.reference}>{ref}</Text>
            <Icon name={showDetails ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          </PressableScale>
          {showDetails ? (
            <Animated.View entering={FadeInDown.duration(250)}>
              <Text style={styles.detailsBody} selectable>
                {message}
              </Text>
              <PressableScale onPress={copyDetails} scaleTo={0.95} style={styles.copy}>
                <Icon name="copy-outline" size={13} color={colors.primary} />
                <Text style={styles.copyText}>Copy details</Text>
              </PressableScale>
            </Animated.View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

/**
 * Catches render errors so a single bad screen shows a recoverable message
 * instead of a white screen. The web app had no equivalent — an exception there
 * simply blanked the page.
 */
class ErrorBoundary extends React.Component {
  state = { error: null, retries: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[alg] render error', error, info?.componentStack);
  }

  reset = () => this.setState(previous => ({ error: null, retries: previous.retries + 1 }));

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} retries={this.state.retries} onRetry={this.reset} />;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', borderRadius: radius.full },
  blobA: { width: 260, height: 260, top: -90, right: -90, backgroundColor: 'rgba(255, 122, 90, 0.16)' },
  blobB: { width: 200, height: 200, bottom: -60, left: -70, backgroundColor: 'rgba(108, 123, 255, 0.10)' },
  // Rendered outside the safe-area provider, so the top inset is a fixed allowance.
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  art: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 170, height: 170 },
  orbitDot: { position: 'absolute', borderRadius: radius.full },
  orbitDotA: { top: 4, left: 80, width: 12, height: 12, backgroundColor: '#ffc23d' },
  orbitDotB: { bottom: 18, right: 14, width: 9, height: 9, backgroundColor: '#6c7bff' },
  orbitDotC: { bottom: 30, left: 8, width: 7, height: 7, backgroundColor: '#34d399' },
  box: {
    width: 104,
    height: 104,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  badge: { position: 'absolute', top: -10, right: -10 },
  badgeInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artShadow: { width: 80, height: 10, marginTop: 14, borderRadius: 5, backgroundColor: '#f0d6cf' },
  title: { marginTop: spacing.md, fontSize: typography.size.xxl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  message: {
    marginTop: 8,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff4e6',
  },
  hintText: { flex: 1, fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: '#c25e00' },
  actions: { alignSelf: 'stretch', marginTop: spacing.lg, gap: 10 },
  primaryShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  primary: { flexDirection: 'row', gap: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  whatsapp: {
    width: 28,
    height: 28,
    marginRight: 8,
    borderRadius: 9,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  details: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(31, 35, 64, 0.06)',
  },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailsTitle: { flex: 1, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.textSecondary },
  reference: { fontSize: typography.size.xs, fontWeight: typography.weight.semiBold, color: colors.textMuted },
  detailsBody: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f3f3f6',
    fontSize: typography.size.xs,
    lineHeight: 17,
    color: INK,
  },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  copyText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
});

export default ErrorBoundary;
