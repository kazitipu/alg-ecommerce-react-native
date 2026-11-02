import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from './PressableScale';
import { colors, typography, spacing } from '../theme';

const INK = '#1f2340';

/**
 * The header used by the redesigned screens: a soft peach gradient, a round
 * back (or close) button, a gradient-coloured icon tile, title and subtitle,
 * and an optional element on the right. Children render below the title row
 * (search fields, tabs, summary chips).
 *
 * Screens using it set `headerShown: false` in the screen registry.
 */
const ScreenHeader = ({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  right,
  onBack,
  backIcon = 'chevron-back',
  hideBack = false,
  children,
  style,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const canGoBack = !hideBack && (onBack || navigation.canGoBack());

  return (
    <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }, style]}>
      <View style={styles.row}>
        {canGoBack ? (
          <PressableScale
            onPress={onBack || (() => navigation.goBack())}
            scaleTo={0.88}
            hitSlop={8}
            style={styles.back}
            accessibilityLabel={backIcon === 'close' ? 'Close' : 'Back'}>
            <Icon name={backIcon} size={20} color={colors.text} />
          </PressableScale>
        ) : null}
        {icon ? (
          <View style={[styles.icon, { backgroundColor: iconColor }]}>
            <Icon name={icon} size={19} color={colors.white} />
          </View>
        ) : null}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 36,
    height: 36,
    marginRight: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginLeft: 10 },
  title: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 1, fontSize: typography.size.xs, color: colors.textSecondary },
});

export default ScreenHeader;
