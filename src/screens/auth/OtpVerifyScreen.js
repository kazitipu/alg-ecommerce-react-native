import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import AuthButton from './components/AuthButton';
import PressableScale from '../../components/PressableScale';
import { useHideSupportFab } from '../../components/SupportFab';
import { verifyOtpRedux } from '../../actions';
import useDarkStatusBar from '../../hooks/useDarkStatusBar';
import { leaveAuth } from '../../navigation/authExit';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';

/** The code is deleted from Firestore after 60 seconds, so the timer matches. */
const OTP_VALIDITY_SECONDS = 60;

/**
 * The web's `OtpModal`: enter the texted code within 60 seconds and proceed.
 * Once it expires the user goes back to request a new one ("OTP expired.Try
 * again!"). Success closes the whole sign-in flow and returns to where it
 * started, like the web's `history.goBack()`.
 */
const OtpVerifyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();
  useHideSupportFab();

  // The number is passed on navigation, but Redux holds it too, as on the web.
  const storedNumber = useSelector(state => state.user.otpNumber);
  const number = route.params?.number || storedNumber;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_VALIDITY_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleProceed = async () => {
    if (loading) return;
    if (!otp.trim()) {
      notifyError('Please enter your OTP.');
      return;
    }
    setLoading(true);
    const user = await dispatch(verifyOtpRedux(number, otp.trim()));
    setLoading(false);
    if (user) {
      notifySuccess('Successfully logged in!');
      leaveAuth(navigation);
    }
  };

  const expired = secondsLeft <= 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#ffe7e0', '#fff4f0', '#f6f6f8']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.blob, styles.blobA]} />
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} style={styles.back} accessibilityLabel="Back">
            <Icon name="chevron-back" size={20} color={colors.text} />
          </PressableScale>

          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.heroCenter}>
            <View style={styles.heroIcon}>
              <Icon name="chatbubble-ellipses" size={32} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>Enter your OTP</Text>
            <Text style={styles.heroSub}>
              We sent a code to <Text style={styles.number}>+88 {number}</Text>
            </Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} style={styles.card}>
          <TextInput
            value={otp}
            onChangeText={text => setOtp(text.replace(/[^0-9]/g, ''))}
            placeholder="Enter your OTP here"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleProceed}
            // The big, spaced-out digits only apply once typing starts, so the
            // placeholder fits on one line and the cursor sits in the middle.
            style={[styles.input, !otp && styles.inputEmpty]}
          />

          {expired ? (
            <PressableScale onPress={() => navigation.goBack()} scaleTo={0.96} style={styles.status}>
              <Icon name="alert-circle" size={15} color={colors.error} />
              <Text style={[styles.statusText, styles.expiredText]}>OTP expired.Try again!</Text>
            </PressableScale>
          ) : (
            <View style={styles.status}>
              <Icon name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.statusText}>OTP expires in {secondsLeft}s</Text>
            </View>
          )}

          <AuthButton label="Proceed" icon="arrow-forward" onPress={handleProceed} loading={loading} />
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
  back: {
    alignSelf: 'flex-start',
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
  heroCenter: { alignItems: 'center', marginTop: spacing.sm },
  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTitle: { marginTop: 16, fontSize: typography.size.xxl, fontWeight: '800', color: colors.text },
  heroSub: { marginTop: 4, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  number: { fontWeight: typography.weight.bold, color: colors.text },
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
  input: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
    paddingHorizontal: 16,
    paddingVertical: 0,
    textAlign: 'center',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    letterSpacing: 6,
    color: colors.text,
  },
  inputEmpty: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    letterSpacing: 0,
  },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: spacing.md },
  statusText: { fontSize: typography.size.sm, color: colors.textSecondary },
  expiredText: { color: colors.error, fontWeight: typography.weight.bold },
});

export default OtpVerifyScreen;
