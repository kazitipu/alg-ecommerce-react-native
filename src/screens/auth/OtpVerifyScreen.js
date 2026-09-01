import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { Button, Input, Screen } from '../../components';
import { verifyOtpRedux } from '../../actions';
import { sendOtpSms } from '../../api';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, spacing, typography } from '../../theme';

/** The code is deleted from Firestore after 60 seconds, so the timer matches. */
const OTP_VALIDITY_SECONDS = 60;

const OtpVerifyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // The number is passed on navigation, but Redux holds it too so a resumed
  // screen still knows which number is being verified.
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

  const handleVerify = async () => {
    if (!otp.trim()) {
      notifyError('Please enter the code we sent you.');
      return;
    }

    setLoading(true);
    const user = await dispatch(verifyOtpRedux(number, otp.trim()));
    setLoading(false);

    if (user) {
      notifySuccess('Successfully logged in!');
      navigation.getParent()?.goBack() ?? navigation.goBack();
    }
  };

  const handleResend = async () => {
    try {
      await sendOtpSms(number);
      setOtp('');
      setSecondsLeft(OTP_VALIDITY_SECONDS);
      notifySuccess('A new OTP is on its way.');
    } catch (error) {
      notifyError(error, 'Could not resend the OTP.');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Verify your number</Text>
      <Text style={styles.sub}>
        We sent a code to <Text style={styles.number}>{number}</Text>.
      </Text>

      <Input
        label="Verification code"
        placeholder="6-digit code"
        keyboardType="number-pad"
        autoComplete="sms-otp"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      <Button title="Verify and continue" onPress={handleVerify} loading={loading} />

      {secondsLeft > 0 ? (
        <Text style={styles.timer}>
          Your code expires in {secondsLeft}s
        </Text>
      ) : (
        <Pressable onPress={handleResend} style={styles.resend}>
          <Text style={styles.resendText}>Code expired — send a new one</Text>
        </Pressable>
      )}
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
  number: { fontWeight: typography.weight.semiBold, color: colors.text },
  timer: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  resend: { marginTop: spacing.md, alignSelf: 'center' },
  resendText: {
    color: colors.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
  },
});

export default OtpVerifyScreen;
