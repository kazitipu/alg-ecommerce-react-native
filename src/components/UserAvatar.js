import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

/** Up to two initials from a name or email. */
export const initialsOf = value => {
  const words = String(value || '')
    .replace(/@.*/, '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (words.length === 0) return 'A';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
};

/**
 * The customer's avatar: their profile photo (`photoURL`) when they have one,
 * otherwise their initials. The container's own style (size, radius, border,
 * background) is kept, so each screen keeps its look.
 */
const UserAvatar = ({ user, name, style, textStyle, initials, children }) => {
  const [broken, setBroken] = useState(false);
  const uri = typeof user?.photoURL === 'string' ? user.photoURL : '';
  const showPhoto = Boolean(uri) && !broken;

  return (
    <View style={[styles.base, style]}>
      {showPhoto ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(true)} />
      ) : (
        <Text style={textStyle}>{initials || initialsOf(name || user?.displayName || user?.email)}</Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});

export default UserAvatar;
