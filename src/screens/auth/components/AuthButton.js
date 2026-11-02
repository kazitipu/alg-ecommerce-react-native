import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';

import PressableScale from '../../../components/PressableScale';
import { colors, typography } from '../../../theme';

export const AUTH_GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** The gradient call-to-action used across the sign-in screens. */
const AuthButton = ({ label, icon, onPress, loading }) => (
  <PressableScale onPress={loading ? undefined : onPress} scaleTo={0.96} style={styles.shadow}>
    <LinearGradient colors={AUTH_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.text}>{label}</Text>
          <View style={styles.arrow}>
            <Icon name={icon} size={15} color={colors.primary} />
          </View>
        </>
      )}
    </LinearGradient>
  </PressableScale>
);

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  button: { flexDirection: 'row', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold, letterSpacing: 0.3 },
  arrow: {
    width: 28,
    height: 28,
    marginLeft: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AuthButton;
