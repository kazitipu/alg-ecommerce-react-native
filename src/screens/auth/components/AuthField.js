import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { colors, typography } from '../../../theme';

/**
 * Text field for the auth screens: a leading icon in a tinted tile, a border
 * that warms to the brand colour on focus, and a show / hide toggle for
 * passwords.
 */
const AuthField = ({ icon, secure, style, ...inputProps }) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, focus]);

  const frameStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ['#ececf1', colors.primary]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ['#f7f7fa', '#ffffff']),
  }));
  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focus.value, [0, 1], ['#ececf3', colors.primarySoft]),
  }));

  return (
    <Animated.View style={[styles.frame, frameStyle, style]}>
      <Animated.View style={[styles.tile, tileStyle]}>
        <Icon name={icon} size={17} color={focused ? colors.primary : colors.textSecondary} />
      </Animated.View>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={hidden}
        onFocus={event => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
      />
      {secure ? (
        <PressableScale
          onPress={() => setHidden(!hidden)}
          scaleTo={0.85}
          hitSlop={10}
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          style={styles.eye}>
          <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
        </PressableScale>
      ) : (
        <View style={styles.eyeSpace} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingLeft: 6,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, marginLeft: 10, paddingVertical: 0, fontSize: typography.size.md - 1, color: colors.text },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyeSpace: { width: 12 },
});

export default AuthField;
