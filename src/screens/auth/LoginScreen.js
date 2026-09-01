import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { Button, Input, Screen } from '../../components';
import { ROUTES } from '../../navigation/routes';
import { sendOtpRedux } from '../../actions';
import { signInWithEmail, signInWithGoogle } from '../../firebase/firebase.utils';
import { sendOtpSms } from '../../api';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';

const TABS = { PHONE: 'phone', EMAIL: 'email' };

/**
 * Sign in by phone or by email.
 *
 * Phone is the default because it is ALG's primary flow: the backend texts a
 * code, mirrors it into `otpSms/{number}`, and the verify screen exchanges it
 * for a Firebase custom token. No reCAPTCHA is involved, unlike Firebase's own
 * phone auth.
 */
const LoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [tab, setTab] = useState(TABS.PHONE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const number = phoneNumber.trim();
    if (!number) {
      notifyError('Please enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      await sendOtpSms(number);
      dispatch(sendOtpRedux(number));
      notifySuccess('An OTP was sent to you successfully!');
      navigation.navigate(ROUTES.OTP_VERIFY, { number });
    } catch (error) {
      notifyError(error, 'Could not send the OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      notifyError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      // The auth listener in App.js picks the session up and fills Redux.
      await signInWithEmail(email.trim(), password);
      notifySuccess('Successfully logged in!');
      navigation.goBack();
    } catch (error) {
      notifyError(error, 'Could not sign in. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const credential = await signInWithGoogle();
    setLoading(false);
    if (credential) {
      notifySuccess('Successfully logged in!');
      navigation.goBack();
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.sub}>Sign in to track orders and manage shipments.</Text>

      <View style={styles.tabs}>
        {[
          { key: TABS.PHONE, label: 'Mobile' },
          { key: TABS.EMAIL, label: 'Email' },
        ].map(item => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.tab, tab === item.key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === TABS.PHONE ? (
        <>
          <Input
            label="Mobile number"
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <Button title="Get OTP" onPress={handleSendOtp} loading={loading} />
        </>
      ) : (
        <>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign in" onPress={handleEmailLogin} loading={loading} />

          <Pressable
            onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
            style={styles.link}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </Pressable>
        </>
      )}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Button
        title="Continue with Google"
        variant="secondary"
        onPress={handleGoogleLogin}
        disabled={loading}
      />

      <Pressable
        onPress={() => navigation.navigate(ROUTES.REGISTER)}
        style={styles.footer}>
        <Text style={styles.footerText}>
          New to ALG? <Text style={styles.footerLink}>Create an account</Text>
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  sub: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.white },
  tabLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  tabLabelActive: { color: colors.primary, fontWeight: typography.weight.semiBold },
  link: { marginTop: spacing.md, alignSelf: 'center' },
  linkText: { color: colors.primary, fontSize: typography.size.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    fontSize: typography.size.sm,
  },
  footer: { marginTop: spacing.lg, alignSelf: 'center' },
  footerText: { fontSize: typography.size.sm, color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: typography.weight.semiBold },
});

export default LoginScreen;
