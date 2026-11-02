import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from '@react-native-firebase/auth';

import { PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import AuthField from '../auth/components/AuthField';
import { auth } from '../../firebase/app';
import { sendResetPasswordEmail } from '../../firebase/firebase.utils';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { notifyError, notifySuccess } from '../../utils/notify';
import { passwordStrength } from './passwordStrength';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** Four segments that fill and recolour with the password's strength. */
const StrengthMeter = ({ strength }) => {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(strength.score / 4, {
      duration: 320,
      easing: EASE,
    });
  }, [strength.score, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={styles.meter}>
      <View style={styles.meterTop}>
        <Text style={styles.meterLabel}>Password strength</Text>
        <Text style={[styles.meterValue, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            { backgroundColor: strength.color },
            fillStyle,
          ]}
        />
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.meterGap, { left: `${i * 25}%` }]} />
        ))}
      </View>
      <View style={styles.checks}>
        {strength.checks.map(check => (
          <View key={check.key} style={styles.check}>
            <Icon
              name={
                check.passed
                  ? 'checkmark-circle'
                  : check.required
                  ? 'alert-circle-outline'
                  : 'ellipse-outline'
              }
              size={14}
              color={
                check.passed
                  ? '#059669'
                  : check.required
                  ? '#f97316'
                  : colors.textMuted
              }
            />
            <Text
              style={[styles.checkText, check.passed && styles.checkTextOn]}
            >
              {check.label}
              {check.required ? ' (required)' : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Password management.
 *
 * Firebase requires a recent sign-in to change a password, so the current one
 * is re-entered and used to reauthenticate first. Phone-only accounts have no
 * password at all, so they are shown the reset-by-email route instead.
 */
const ProfileSecurityScreen = () => {
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  useDarkStatusBar();
  useHideSupportFab();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const rawEmail = auth.currentUser?.email || currentUser?.email;
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const hasPassword = Boolean(email);
  const strength = passwordStrength(newPassword);
  const matches = confirmPassword.length > 0 && confirmPassword === newPassword;
  const mismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const ready = Boolean(currentPassword) && strength.score > 0 && matches;

  const change = async () => {
    if (saving) return;
    if (newPassword.length < 6) {
      notifyError('Your new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notifyError("The new passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notifySuccess('Password updated');
      navigation.goBack();
    } catch (error) {
      notifyError(
        error,
        'Could not change your password. Check your current one.',
      );
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (sendingReset) return;
    if (!email) {
      notifyError('Add an email address to your profile first.');
      return;
    }
    setSendingReset(true);
    try {
      await sendResetPasswordEmail(email);
      notifySuccess('Check your email', 'A password reset link is on its way.');
    } catch (error) {
      notifyError(error, 'Could not send the reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Security"
        subtitle="Password and sign-in"
        icon="lock-closed"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* Account status */}
        <Animated.View entering={FadeIn.duration(380)}>
          <LinearGradient
            colors={['#1f2a5c', '#2f3e9e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBlob} />
            <View style={styles.heroIcon}>
              <Icon
                name={hasPassword ? 'shield-checkmark' : 'phone-portrait'}
                size={26}
                color={colors.white}
              />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>
                {hasPassword ? 'Email & password' : 'Phone sign-in'}
              </Text>
              <Text style={styles.heroSub} numberOfLines={1}>
                {hasPassword ? email : 'One-time codes sent to your mobile'}
              </Text>
            </View>
            <View style={styles.heroChip}>
              <View style={styles.heroDot} />
              <Text style={styles.heroChipText}>Protected</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {hasPassword ? (
          <>
            <Animated.View
              entering={FadeInUp.delay(100).duration(400).easing(EASE)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.tile, styles.tileKey]}>
                  <Icon name="key" size={15} color="#4f46e5" />
                </View>
                <Text style={styles.cardTitle}>Change password</Text>
              </View>

              <Text style={styles.label}>Current password</Text>
              <AuthField
                icon="lock-closed-outline"
                placeholder="Your current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secure
                autoComplete="password"
              />

              <Text style={styles.label}>New password</Text>
              <AuthField
                icon="key-outline"
                placeholder="Choose a new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secure
                autoComplete="new-password"
              />
              {newPassword ? (
                <Animated.View entering={FadeIn.duration(250)}>
                  <StrengthMeter strength={strength} />
                </Animated.View>
              ) : null}

              <Text style={styles.label}>Confirm new password</Text>
              <AuthField
                icon="shield-checkmark-outline"
                placeholder="Type it again"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
                autoComplete="new-password"
              />
              {matches || mismatch ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={styles.match}
                >
                  <Icon
                    name={matches ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={matches ? '#059669' : '#e11d48'}
                  />
                  <Text
                    style={[styles.matchText, matches ? styles.matchOk : styles.matchBad]}
                  >
                    {matches ? 'Passwords match' : "Passwords don't match yet"}
                  </Text>
                </Animated.View>
              ) : null}

              <PressableScale
                onPress={change}
                disabled={saving}
                scaleTo={0.96}
                style={[styles.ctaShadow, !ready && styles.ctaIdle]}
              >
                <LinearGradient
                  colors={GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Icon
                        name="checkmark-circle"
                        size={18}
                        color={colors.white}
                      />
                      <Text style={styles.ctaText}>Update password</Text>
                    </>
                  )}
                </LinearGradient>
              </PressableScale>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(180).duration(400).easing(EASE)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.tile, styles.tileMail]}>
                  <Icon name="mail" size={15} color="#c026d3" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Forgot your password?</Text>
                  <Text style={styles.cardHint}>
                    We'll email a reset link to {email}
                  </Text>
                </View>
              </View>
              <PressableScale
                onPress={sendReset}
                scaleTo={0.97}
                style={styles.secondary}
              >
                {sendingReset ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Icon
                      name="paper-plane-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.secondaryText}>
                      Email me a reset link
                    </Text>
                  </>
                )}
              </PressableScale>
            </Animated.View>
          </>
        ) : (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400).easing(EASE)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.tile, styles.tileKey]}>
                <Icon name="chatbubble-ellipses" size={15} color="#4f46e5" />
              </View>
              <Text style={styles.cardTitle}>No password needed</Text>
            </View>
            <Text style={styles.body}>
              You signed in with your mobile number, so there's no password on
              this account. You'll keep signing in with a one-time code.
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.delay(260).duration(400).easing(EASE)}
          style={styles.tips}
        >
          <Text style={styles.tipsTitle}>Stay safe</Text>
          {[
            {
              icon: 'eye-off-outline',
              text: 'ALG will never ask for your password or OTP.',
            },
            {
              icon: 'repeat-outline',
              text: "Don't reuse a password from another site.",
            },
            {
              icon: 'warning-outline',
              text: 'Only pay through the app or our official accounts.',
            },
          ].map(tip => (
            <View key={tip.text} style={styles.tip}>
              <Icon name={tip.icon} size={14} color={colors.primary} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, marginHorizontal: 12 },
  heroTitle: {
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.white,
  },
  heroSub: {
    marginTop: 2,
    fontSize: typography.size.xs + 1,
    color: 'rgba(255,255,255,0.8)',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(52,211,153,0.2)',
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  heroChipText: { fontSize: 10.5, fontWeight: '800', color: '#a7f3d0' },
  card: {
    marginTop: spacing.md,
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
  cardHeaderText: { flex: 1 },
  tile: {
    width: 30,
    height: 30,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileKey: { backgroundColor: '#eef2ff' },
  tileMail: { backgroundColor: '#fdeefe' },
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
  label: {
    marginBottom: 6,
    marginLeft: 2,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  meter: {
    marginTop: -2,
    marginBottom: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f7f7fa',
  },
  meterTop: { flexDirection: 'row', justifyContent: 'space-between' },
  meterLabel: { fontSize: typography.size.xs, color: colors.textSecondary },
  meterValue: { fontSize: typography.size.xs, fontWeight: '800' },
  meterTrack: {
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: '#e6e6ee',
    overflow: 'hidden',
  },
  meterFill: { height: 6, borderRadius: 3 },
  meterGap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: '#f7f7fa',
  },
  checks: { marginTop: 10, gap: 5 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkText: { fontSize: typography.size.xs, color: colors.textMuted },
  checkTextOn: { color: '#047857', fontWeight: typography.weight.semiBold },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -4,
    marginBottom: 10,
    marginLeft: 2,
  },
  matchOk: { color: '#059669' },
  matchBad: { color: '#e11d48' },
  matchText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
  },
  ctaShadow: {
    marginTop: 6,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaIdle: { opacity: 0.6 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  ctaText: {
    color: colors.white,
    fontSize: typography.size.md - 1,
    fontWeight: typography.weight.bold,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  secondaryText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  body: {
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  tips: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fff8f6',
    borderWidth: 1,
    borderColor: '#ffe3da',
  },
  tipsTitle: {
    marginBottom: 8,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.text,
  },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  tipText: {
    flex: 1,
    fontSize: typography.size.xs + 1,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});

export default ProfileSecurityScreen;
