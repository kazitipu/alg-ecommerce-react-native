import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadow, spacing } from '../theme';

/** Surface container. Becomes pressable when `onPress` is supplied. */
const Card = ({ children, onPress, style, ...rest }) => {
  if (!onPress) {
    return (
      <View style={[styles.card, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      {...rest}>
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.9 },
});

export default Card;
