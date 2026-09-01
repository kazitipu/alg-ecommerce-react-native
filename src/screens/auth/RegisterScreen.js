import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button, Input, Screen } from '../../components';
import {
  createUserProfileDocument,
  registerWithEmail,
} from '../../firebase/firebase.utils';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, spacing, typography } from '../../theme';

/**
 * Email signup. Creating the auth user is only half the job — the profile
 * document in `users/{uid}` is what the rest of the app reads, and it also
 * allocates the sequential customer number.
 */
const RegisterScreen = () => {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    mobileNo: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const update = key => value => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const { displayName, email, mobileNo, password, confirmPassword } = form;

    if (!displayName.trim() || !email.trim() || !password) {
      notifyError('Please fill in your name, email and password.');
      return;
    }
    if (password !== confirmPassword) {
      notifyError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await registerWithEmail(email.trim(), password);
      await createUserProfileDocument(user, {
        displayName: displayName.trim(),
        mobileNo: mobileNo.trim(),
      });

      notifySuccess('Successfully created your account');
      navigation.goBack();
    } catch (error) {
      notifyError(error, 'There was an error creating your account. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.sub}>Shop from 1688 and ship to Bangladesh with ALG.</Text>

      <Input
        label="Full name"
        placeholder="Your name"
        value={form.displayName}
        onChangeText={update('displayName')}
      />
      <Input
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={form.email}
        onChangeText={update('email')}
      />
      <Input
        label="Mobile number"
        placeholder="01XXXXXXXXX"
        keyboardType="phone-pad"
        value={form.mobileNo}
        onChangeText={update('mobileNo')}
      />
      <Input
        label="Password"
        placeholder="At least 6 characters"
        secureTextEntry
        value={form.password}
        onChangeText={update('password')}
      />
      <Input
        label="Confirm password"
        placeholder="Repeat your password"
        secureTextEntry
        value={form.confirmPassword}
        onChangeText={update('confirmPassword')}
      />

      <Button title="Create account" onPress={handleSubmit} loading={loading} />
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

export default RegisterScreen;
