import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { colors, spacing } from '../theme';

/**
 * Page container. `scroll` wraps the content in a ScrollView and keeps it clear
 * of the keyboard, which forms need on small screens.
 */
const Screen = ({ children, scroll = false, contentStyle, style }) => {
  if (!scroll) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg },
});

export default Screen;
