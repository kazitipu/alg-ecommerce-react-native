import React from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';

import { CONTACT } from '../constants/config';
import { colors, radius, shadow, spacing } from '../theme';

/**
 * Floating WhatsApp button, replacing the web's `react-floating-whatsapp`
 * widget. A deep link opens the real WhatsApp app rather than embedding a chat.
 */
const SupportFab = () => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Chat with ALG on WhatsApp"
    onPress={() =>
      Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}`)
    }
    style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
    <Icon name="logo-whatsapp" size={26} color={colors.white} />
  </Pressable>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 88,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
});

export default SupportFab;
