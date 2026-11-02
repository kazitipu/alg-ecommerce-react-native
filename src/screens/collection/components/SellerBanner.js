import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { colors, typography } from '../../../theme';

const EASE = Easing.out(Easing.cubic);

/** Two-letter badge for a seller name ("Hangzhou Ali…" → "HA"). */
export const sellerInitials = name => {
  const words = String(name || '')
    .replace(/[-_.,()[\]{}|/\\&+*'"!?:;]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'S';
  if (words.length === 1) return [...words[0]].slice(0, 2).join('').toUpperCase();
  return ([...words[0]][0] + [...words[1]][0]).toUpperCase();
};

/**
 * The seller's storefront card at the top of their product list: name,
 * how many products have loaded (of the total), and what buying from them
 * through ALG includes.
 */
const SellerBanner = ({ name, count, total, loading }) => (
  <Animated.View entering={FadeInDown.duration(380).easing(EASE)} style={styles.wrap}>
    <LinearGradient colors={['#262a4a', '#1a1d33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.blob} />
      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sellerInitials(name)}</Text>
          <View style={styles.badgeStore}>
            <Icon name="storefront" size={10} color="#1f2340" />
          </View>
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>Seller store</Text>
          <Text style={styles.name} numberOfLines={2}>
            {name || 'Seller'}
          </Text>
          <View style={styles.countRow}>
            {loading ? <ActivityIndicator size="small" color="#ffc23d" /> : <Icon name="cube" size={12} color="#ffc23d" />}
            <Text style={styles.count}>
              {loading
                ? 'Loading products…'
                : total > count
                  ? `${count} of ${total} products`
                  : `${count} ${count === 1 ? 'product' : 'products'}`}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.perks}>
        {[
          { icon: 'shield-checkmark', label: 'Verified by ALG' },
          { icon: 'airplane', label: 'Ships to BD' },
          { icon: 'wallet', label: 'Pay in taka' },
        ].map(perk => (
          <View key={perk.label} style={styles.perk}>
            <Icon name={perk.icon} size={11} color="#ffc23d" />
            <Text style={styles.perkText}>{perk.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  </Animated.View>
);

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  card: { padding: 16, borderRadius: 22, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 194, 61, 0.12)',
  },
  top: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc23d',
  },
  badgeText: { fontSize: typography.size.lg, fontWeight: '800', color: '#1f2340' },
  badgeStore: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#262a4a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: { flex: 1, marginLeft: 14 },
  label: { fontSize: 10, fontWeight: typography.weight.bold, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' },
  name: { marginTop: 2, fontSize: typography.size.md, fontWeight: '800', color: colors.white },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  count: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: 'rgba(255,255,255,0.85)' },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  perkText: { fontSize: 10.5, fontWeight: typography.weight.semiBold, color: 'rgba(255,255,255,0.85)' },
});

export default SellerBanner;
