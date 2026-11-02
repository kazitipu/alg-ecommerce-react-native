import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  FadeInDown,
  FadeInUp,
  LinearTransition,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from './components/AuthButton';
import AuthField from './components/AuthField';
import GoogleLogo from './components/GoogleLogo';
import PressableScale from '../../components/PressableScale';
import RouteChip from '../../components/RouteChip';
import { useHideSupportFab } from '../../components/SupportFab';
import {
  createUserProfileDocument,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from '../../firebase/firebase.utils';
import useDarkStatusBar from '../../hooks/useDarkStatusBar';
import { leaveAuth, leaveAuthToHome } from '../../navigation/authExit';
import { ROUTES } from '../../navigation/routes';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';
import { appAlert } from '../../utils/appAlert';

const logoMark = require('../../assets/logo-mark.png');
const logoWordmark = require('../../assets/logo-wordmark.png');

const MODES = { SIGN_IN: 'signIn', SIGN_UP: 'signUp' };
const TAB_WIDTH = 130;

/** Logo mark that breathes gently, with two orbiting accents. */
const HeroLogo = () => {
  const breathe = useSharedValue(1);
  const spin = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1);
    spin.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(breathe);
      cancelAnimation(spin);
    };
  }, [breathe, spin]);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <View style={styles.heroLogo}>
      <Animated.View style={[styles.orbit, orbitStyle]}>
        <View style={[styles.orbitDot, styles.orbitDotA]} />
        <View style={[styles.orbitDot, styles.orbitDotB]} />
      </Animated.View>
      <Animated.View style={[styles.logoCircle, logoStyle]}>
        <Image source={logoMark} style={styles.logoMark} />
      </Animated.View>
    </View>
  );
};

/** Sign in / Sign up switch with a sliding white pill. */
const ModeSwitch = ({ mode, onChange }) => {
  const position = useSharedValue(mode === MODES.SIGN_IN ? 0 : 1);
  useEffect(() => {
    position.value = withSpring(mode === MODES.SIGN_IN ? 0 : 1, { damping: 16, stiffness: 200 });
  }, [mode, position]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * TAB_WIDTH }] }));

  return (
    <View style={styles.switch}>
      <Animated.View style={[styles.switchPill, pillStyle]} />
      {[
        { key: MODES.SIGN_IN, label: 'Sign in', icon: 'log-in-outline' },
        { key: MODES.SIGN_UP, label: 'Sign up', icon: 'person-add-outline' },
      ].map(tab => (
        <PressableScale key={tab.key} onPress={() => onChange(tab.key)} scaleTo={0.95} style={styles.switchTab}>
          <Icon name={tab.icon} size={15} color={mode === tab.key ? colors.primary : colors.textSecondary} />
          <Text style={[styles.switchText, mode === tab.key && styles.switchTextOn]}>{tab.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
};

/**
 * Sign in and sign up, following the web login page (`pages/login.jsx`):
 *  - email + password sign in, with "forgot password"
 *  - sign up with name, email, mobile, password and confirmation ("passwords
 *    don't match"), creating the `users/{uid}` profile
 *  - sign in / up with phone on its own screen (the web's phone popup), then
 *    the OTP screen
 *  - Google sign-in
 * Where success lands follows the web: email sign in and sign up go to Home;
 * Google returns to wherever sign-in was asked for (`redirectBack`, the web's
 * `location.state.from`), or Home otherwise.
 */
const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();
  useHideSupportFab();

  const [mode, setMode] = useState(MODES.SIGN_IN);
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    mobileNo: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(null);
  const update = key => value => setForm(previous => ({ ...previous, [key]: value }));

  // Like the web, switching between sign in and sign up clears the email and
  // password.
  const switchMode = next => {
    if (next === mode) return;
    setForm(previous => ({ ...previous, email: '', password: '' }));
    setMode(next);
  };

  const handleSignIn = async () => {
    if (!form.email.trim() || !form.password) {
      notifyError('Please enter your email and password.');
      return;
    }
    setLoading('email');
    try {
      // The auth listener in App.js picks the session up and fills Redux.
      await signInWithEmail(form.email.trim(), form.password);
      notifySuccess('Successfully logged in!');
      leaveAuthToHome(navigation);
    } catch (error) {
      appAlert('', error?.message || String(error));
    } finally {
      setLoading(null);
    }
  };

  const handleSignUp = async () => {
    const { displayName, email, mobileNo, password, confirmPassword } = form;
    if (!displayName.trim() || !email.trim() || !password) {
      notifyError('Please fill in your name, email and password.');
      return;
    }
    if (password !== confirmPassword) {
      appAlert('', "passwords don't match");
      return;
    }
    setLoading('email');
    try {
      const { user } = await registerWithEmail(email.trim(), password);
      await createUserProfileDocument(user, { displayName: displayName.trim(), mobileNo: mobileNo.trim() });
      notifySuccess('Successfully created your account');
      leaveAuthToHome(navigation);
    } catch (error) {
      appAlert('', error?.message || String(error));
      notifyError('there was an erro occurred creating your account. try again later');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    try {
      const credential = await signInWithGoogle();
      if (credential) {
        notifySuccess('Successfully logged in!');
        if (route.params?.redirectBack) leaveAuth(navigation);
        else leaveAuthToHome(navigation);
      }
    } catch (error) {
      appAlert('', error?.message || String(error));
    } finally {
      setLoading(null);
    }
  };

  const isSignIn = mode === MODES.SIGN_IN;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#ffe7e0', '#fff4f0', '#f6f6f8']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.blob, styles.blobA]} />
          <View style={[styles.blob, styles.blobB]} />
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} style={styles.close} accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.text} />
          </PressableScale>

          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.heroCenter}>
            <HeroLogo />
            <Image source={logoWordmark} style={styles.wordmark} />
            <Text style={styles.heroTitle}>{isSignIn ? 'Welcome back 👋' : 'Create your account'}</Text>
            <Text style={styles.heroSub}>
              {isSignIn ? 'Sign in to order, track and manage your shipments.' : 'Shop from China, delivered to your door in Bangladesh.'}
            </Text>
            <RouteChip width={56} style={styles.heroChip} />
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} layout={LinearTransition.springify().damping(18)} style={styles.card}>
          <ModeSwitch mode={mode} onChange={switchMode} />

          <Animated.View key={mode} entering={FadeIn.duration(260)} style={styles.form}>
            {isSignIn ? (
              <>
                <AuthField icon="mail-outline" placeholder="Enter your Email" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                <AuthField icon="lock-closed-outline" placeholder="Enter your Password" value={form.password} onChangeText={update('password')} secure autoComplete="password" />
                <PressableScale onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)} scaleTo={0.95} style={styles.forgot}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </PressableScale>
                <AuthButton label="Sign in" icon="arrow-forward" onPress={handleSignIn} loading={loading === 'email'} />
              </>
            ) : (
              <>
                <AuthField icon="person-outline" placeholder="Display Name" value={form.displayName} onChangeText={update('displayName')} autoComplete="name" />
                <AuthField icon="mail-outline" placeholder="Enter your Email" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                <AuthField icon="call-outline" placeholder="Your Mobile no" value={form.mobileNo} onChangeText={update('mobileNo')} keyboardType="phone-pad" autoComplete="tel" />
                <AuthField icon="lock-closed-outline" placeholder="Enter your Password" value={form.password} onChangeText={update('password')} secure />
                <AuthField icon="shield-checkmark-outline" placeholder="Confirm Password" value={form.confirmPassword} onChangeText={update('confirmPassword')} secure />
                <AuthButton label="Create Account" icon="sparkles" onPress={handleSignUp} loading={loading === 'email'} />
              </>
            )}
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <PressableScale onPress={handleGoogle} scaleTo={0.97} style={styles.social}>
            {loading === 'google' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.socialIcon}>
                  <GoogleLogo size={20} />
                </View>
                <Text style={styles.socialText}>Continue with Google</Text>
              </>
            )}
          </PressableScale>

          <PressableScale
            onPress={() =>
              navigation.navigate(ROUTES.PHONE_LOGIN, {
                mode: isSignIn ? MODES.SIGN_IN : MODES.SIGN_UP,
                redirectBack: route.params?.redirectBack,
              })
            }
            scaleTo={0.97}
            style={styles.social}>
            <View style={[styles.socialIcon, styles.phoneIcon]}>
              <Icon name="phone-portrait" size={17} color={colors.white} />
            </View>
            <Text style={styles.socialText}>{isSignIn ? 'Sign in with Phone' : 'Sign up with Phone'}</Text>
            <Icon name="chevron-forward" size={16} color={colors.textSecondary} style={styles.socialChevron} />
          </PressableScale>

          <PressableScale onPress={() => switchMode(isSignIn ? MODES.SIGN_UP : MODES.SIGN_IN)} scaleTo={0.97} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {isSignIn ? 'Not registered? ' : 'Already have an account? '}
              <Text style={styles.toggleLink}>{isSignIn ? 'Create an account' : 'Sign in'}</Text>
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400)} style={styles.trust}>
          {[
            { icon: 'shield-checkmark', label: 'Secure payment' },
            { icon: 'navigate', label: 'Live tracking' },
            { icon: 'chatbubbles', label: '24/7 support' },
          ].map(item => (
            <View key={item.label} style={styles.trustItem}>
              <Icon name={item.icon} size={15} color={colors.primary} />
              <Text style={styles.trustText}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  scroll: { paddingBottom: spacing.xl },
  hero: { paddingHorizontal: spacing.md, paddingBottom: 56, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: radius.full },
  blobA: { width: 220, height: 220, top: -80, right: -70, backgroundColor: 'rgba(255, 122, 90, 0.18)' },
  blobB: { width: 160, height: 160, bottom: -40, left: -50, backgroundColor: 'rgba(108, 123, 255, 0.12)' },
  close: {
    alignSelf: 'flex-end',
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f2340',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroCenter: { alignItems: 'center' },
  heroLogo: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 96, height: 96 },
  orbitDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  orbitDotA: { top: 0, left: 43, backgroundColor: '#ffc23d' },
  orbitDotB: { bottom: 6, right: 6, width: 8, height: 8, backgroundColor: '#6c7bff' },
  logoCircle: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoMark: { width: 44, height: 44 },
  wordmark: { width: 120, height: 19, marginTop: 10 },
  heroTitle: { marginTop: 14, fontSize: typography.size.xxl, fontWeight: '800', color: colors.text },
  heroSub: { marginTop: 4, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  heroChip: { alignSelf: 'center', marginTop: 12 },
  card: {
    marginTop: -36,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 28,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  switch: { flexDirection: 'row', alignSelf: 'center', padding: 4, borderRadius: 16, backgroundColor: '#f3f3f6' },
  switchPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: TAB_WIDTH,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  switchTab: { width: TAB_WIDTH, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  switchText: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  switchTextOn: { color: colors.primary, fontWeight: typography.weight.bold },
  form: { marginTop: spacing.md },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 14, paddingVertical: 4 },
  forgotText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: '#7a4cf5' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md + 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#dcdce4' },
  dividerText: { marginHorizontal: 10, fontSize: typography.size.xs, color: colors.textMuted },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  socialIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#f7f7fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneIcon: { backgroundColor: '#0e9a72' },
  socialText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  socialChevron: { position: 'absolute', right: 16 },
  toggle: { alignSelf: 'center', marginTop: 6, paddingVertical: 6 },
  toggleText: { fontSize: typography.size.sm, color: colors.textSecondary },
  toggleLink: { color: colors.primary, fontWeight: typography.weight.bold },
  trust: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: spacing.lg },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustText: { marginLeft: 4, fontSize: typography.size.xs, color: colors.textSecondary },
});

export default LoginScreen;
