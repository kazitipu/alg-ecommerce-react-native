import React, { useCallback, useSyncExternalStore } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { CONTACT } from '../constants/config';
import { colors, radius, shadow, spacing } from '../theme';

/**
 * Screens with their own bottom action bar (product detail) hide the button
 * while focused. The button lives outside the navigator, so a tiny shared
 * store carries how many focused screens currently want it hidden.
 */
let hideRequests = 0;
const listeners = new Set();
const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setHideRequests = next => {
  hideRequests = Math.max(0, next);
  listeners.forEach(listener => listener());
};

/** Hides the WhatsApp button while the calling screen is focused. */
export const useHideSupportFab = () =>
  useFocusEffect(
    useCallback(() => {
      setHideRequests(hideRequests + 1);
      return () => setHideRequests(hideRequests - 1);
    }, []),
  );

/**
 * Floating WhatsApp button, replacing the web's `react-floating-whatsapp`
 * widget. A deep link opens the real WhatsApp app rather than embedding a chat.
 */
const SupportFab = () => {
  const hidden = useSyncExternalStore(subscribe, () => hideRequests > 0);
  if (hidden) return null;

  return (
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
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    // Clears the floating tab bar and its raised centre button.
    bottom: 132,
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
