import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import AuthButton from './components/AuthButton';
import PressableScale from '../../components/PressableScale';
import { useHideSupportFab } from '../../components/SupportFab';
import { sendOtpRedux } from '../../actions';
import { sendOtpSms } from '../../api';
import useDarkStatusBar from '../../hooks/useDarkStatusBar';
import { ROUTES } from '../../navigation/routes';
import { OTP_TEXT, isValidBdMobile, otpRequestFailure, readOtpResponse } from '../../utils/otp';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';
import { appAlert } from '../../utils/appAlert';

/**
 * Sign in / up with phone — the web's `request_phone_popup` on the login page.
 *
 * The number is 11 digits starting with 0 (the +88 prefix is fixed). "Get OTP"
 * asks the backend to text a code; on success the number is kept in Redux and
 * the OTP screen opens. Gateway errors use the web's messages and clear the
 * number (except "No valid number found"); network errors keep it.
 */
const PhoneLoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();
  useHideSupportFab();

  const isSignUp = route.params?.mode === 'signUp';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleGetOtp = async () => {
    const number = phoneNumber.trim();
    if (!isValidBdMobile(number)) {
      appAlert('', OTP_TEXT.invalidNumber);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const result = readOtpResponse(await sendOtpSms(number));
      if (!result.ok) {
        if (result.clearNumber) setPhoneNumber('');
        notifyError(result.message);
        return;
      }
      notifySuccess(OTP_TEXT.sent);
      dispatch(sendOtpRedux(number));
      setPhoneNumber('');
      navigation.navigate(ROUTES.OTP_VERIFY, { number, redirectBack: route.params?.redirectBack });
    } catch (error) {
      notifyError(otpRequestFailure(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#ffe7e0', '#fff4f0', '#f6f6f8']} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.blob, styles.blobA]} />
          <View style={[styles.blob, styles.blobB]} />
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} style={styles.back} accessibilityLabel="Back">
            <Icon name="chevron-back" size={20} color={colors.text} />
          </PressableScale>

          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.heroCenter}>
            <View style={styles.heroIcon}>
              <Icon name="phone-portrait" size={34} color={colors.white} />
            </View>
            <Text style={styles.heroTitle}>{isSignUp ? 'Sign up with Phone' : 'Sign in with Phone'}</Text>
            <Text style={styles.heroSub}>We'll text you a one-time code to verify your number.</Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} style={styles.card}>
          <Text style={styles.label}>Enter your Mobile no</Text>
          <View style={[styles.field, focused && styles.fieldFocused]}>
            <View style={styles.prefix}>
              <Text style={styles.flag}>🇧🇩</Text>
              <Text style={styles.prefixText}>+88</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={text => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
              placeholder="Your Mobile no"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={11}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleGetOtp}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={styles.input}
            />
          </View>
          <Text style={styles.hint}>11 digits starting with 0, e.g. 01XXXXXXXXX</Text>

          <AuthButton label="Get OTP" icon="chatbubble-ellipses" onPress={handleGetOtp} loading={loading} />
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
  blobB: { width: 160, height: 160, bottom: -40, left: -50, backgroundColor: 'rgba(14, 154, 114, 0.12)' },
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
    backgroundColor: '#0e9a72',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0e9a72',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTitle: { marginTop: 16, fontSize: typography.size.xxl, fontWeight: '800', color: colors.text },
  heroSub: { marginTop: 4, fontSize: typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
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
  label: { marginBottom: 10, fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
    overflow: 'hidden',
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 12,
    borderRightWidth: 1.5,
    borderRightColor: '#ececf1',
    backgroundColor: '#efeff4',
  },
  flag: { fontSize: 16 },
  prefixText: { marginLeft: 6, fontSize: typography.size.md - 1, fontWeight: typography.weight.bold, color: colors.text },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: typography.size.md,
    letterSpacing: 1,
    color: colors.text,
  },
  hint: { marginTop: 8, marginBottom: spacing.md, fontSize: typography.size.xs, color: colors.textMuted },
});

export default PhoneLoginScreen;
