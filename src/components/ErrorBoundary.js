import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import Button from './Button';
import { colors, spacing, typography } from '../theme';

/**
 * Catches render errors so a single bad screen shows a recoverable message
 * instead of a white screen. The web app had no equivalent — an exception there
 * simply blanked the page.
 */
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[alg] render error', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Icon name="warning-outline" size={56} color={colors.primary} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          Sorry — that screen ran into a problem. You can try again, and if it
          keeps happening please let our team know.
        </Text>
        <Button title="Try again" onPress={this.reset} style={styles.action} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: spacing.md,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});

export default ErrorBoundary;
