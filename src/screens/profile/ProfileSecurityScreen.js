import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from '@react-native-firebase/auth';

import { Button, Input, Screen } from '../../components';
import { auth } from '../../firebase/app';
import { sendResetPasswordEmail } from '../../firebase/firebase.utils';
import { useAuth } from '../../hooks';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, spacing, typography } from '../../theme';

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const email = auth.currentUser?.email || currentUser?.email;
  const hasPassword = Boolean(email);

  const change = async () => {
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
      notifyError(error, 'Could not change your password. Check your current one.');
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    if (!email) {
      notifyError('Add an email address to your profile first.');
      return;
    }
    try {
      await sendResetPasswordEmail(email);
      notifySuccess('Check your email', 'A password reset link is on its way.');
    } catch (error) {
      notifyError(error, 'Could not send the reset email.');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Security</Text>

      {hasPassword ? (
        <>
          <Text style={styles.sub}>
            Choose a new password for {email}.
          </Text>

          <Input
            label="Current password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <Input
            label="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Input
            label="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Button title="Change password" onPress={change} loading={saving} />

          <Button
            title="Email me a reset link instead"
            variant="ghost"
            onPress={sendReset}
            style={styles.secondary}
          />
        </>
      ) : (
        <Text style={styles.sub}>
          You signed in with your mobile number, so there's no password on this
          account. You'll keep signing in with a one-time code.
        </Text>
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
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  secondary: { marginTop: spacing.sm },
});

export default ProfileSecurityScreen;
