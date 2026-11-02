import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';

import { colors, typography } from '../theme';

/**
 * A green "FREE" pill, shown in place of "Tk 0" when a charge (the China
 * local courier, typically) costs nothing.
 */
const FreeBadge = ({ label = 'FREE', size = 'md', style }) => {
  const small = size === 'sm';
  return (
    <Animated.View entering={FadeIn.duration(260).easing(Easing.out(Easing.cubic))} style={style}>
      <LinearGradient
        colors={['#34d399', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pill, small && styles.pillSmall]}
      >
        <Icon name="sparkles" size={small ? 10 : 12} color={colors.white} />
        <Text style={[styles.text, small && styles.textSmall]}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pillSmall: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: typography.size.xs + 1, fontWeight: '800', letterSpacing: 0.8, color: colors.white },
  textSmall: { fontSize: 10, letterSpacing: 0.6 },
});

export default FreeBadge;
