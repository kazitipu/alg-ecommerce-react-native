import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button, Input, Screen } from '../../components';
import { sendResetPasswordEmail } from '../../firebase/firebase.utils';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, spacing, typography } from '../../theme';

/**
 * Firebase sends the reset link; the link itself opens in the phone's browser
 * on the project's auth domain, which is the same page the website uses.
 */
const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      notifyError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetPasswordEmail(email.trim());
      notifySuccess(
        'Check your email',
        'A password reset link has been sent to your email address.',
      );
      navigation.goBack();
    } catch (error) {
      notifyError(error, 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Reset your password</Text>
      <Text style={styles.sub}>
        Enter the email on your account and we'll send you a reset link.
      </Text>

      <Input
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <Button title="Send reset link" onPress={handleSubmit} loading={loading} />
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
});

export default ForgotPasswordScreen;
