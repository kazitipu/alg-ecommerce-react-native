import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';

import { Button } from '../../components';
import { logout } from '../../firebase/firebase.utils';
import { useAuth } from '../../hooks';
import { CONTACT } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/** Everything the web app kept in the header dropdown and the footer columns. */
const SECTIONS = [
  {
    title: 'My account',
    items: [
      { label: 'My orders', icon: 'cube-outline', route: ROUTES.DASHBOARD, protected: true },
      { label: 'Wishlist', icon: 'heart-outline', route: ROUTES.WISHLIST, protected: true },
      { label: 'My information', icon: 'person-outline', route: ROUTES.PROFILE_INFORMATION, protected: true },
      { label: 'Security', icon: 'lock-closed-outline', route: ROUTES.PROFILE_SECURITY, protected: true },
    ],
  },
  {
    title: 'Our services',
    items: [
      { label: 'Buy for me', icon: 'cart-outline', route: ROUTES.BUY_FOR_ME },
      { label: 'Ship for me', icon: 'boat-outline', route: ROUTES.SHIP_FOR_ME },
      { label: 'Request a product', icon: 'search-outline', route: ROUTES.REQUEST_PRODUCT },
      { label: 'Track an order', icon: 'navigate-outline', route: ROUTES.TRACK_ORDER },
    ],
  },
  {
    title: 'Help centre',
    items: [
      { label: 'Notices', icon: 'megaphone-outline', route: ROUTES.NOTICES },
      { label: 'How to order', icon: 'help-buoy-outline', route: ROUTES.HOW_TO_ORDER },
      { label: 'FAQ', icon: 'help-circle-outline', route: ROUTES.FAQ },
      { label: 'Tax & shipping', icon: 'calculator-outline', route: ROUTES.TAX_AND_SHIPPING },
      { label: 'Contact us', icon: 'call-outline', route: ROUTES.CONTACT },
    ],
  },
  {
    title: 'About ALG',
    items: [
      { label: 'About us', icon: 'information-circle-outline', route: ROUTES.ABOUT_US },
      { label: 'Privacy policy', icon: 'shield-checkmark-outline', route: ROUTES.PRIVACY },
      { label: 'Return & refunds', icon: 'return-down-back-outline', route: ROUTES.REFUND },
      { label: 'Terms & conditions', icon: 'document-text-outline', route: ROUTES.TERMS },
    ],
  },
];

const AccountScreen = () => {
  const navigation = useNavigation();
  const { currentUser, isSignedIn } = useAuth();

  const open = item => {
    if (item.protected && !isSignedIn) {
      navigation.navigate(ROUTES.LOGIN);
      return;
    }
    navigation.navigate(item.route);
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Icon name="person" size={28} color={colors.white} />
        </View>

        <View style={styles.headerBody}>
          {isSignedIn ? (
            <>
              <Text style={styles.name}>
                {currentUser.displayName || currentUser.mobileNo || 'ALG customer'}
              </Text>
              <Text style={styles.meta}>
                {currentUser.email || currentUser.mobileNo}
                {currentUser.userId ? ` · ID ${currentUser.userId}` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.name}>Welcome to ALG</Text>
              <Text style={styles.meta}>Sign in to track your orders</Text>
            </>
          )}
        </View>

        {!isSignedIn ? (
          <Button
            title="Sign in"
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            style={styles.signIn}
          />
        ) : null}
      </View>

      {SECTIONS.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          <View style={styles.card}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => open(item)}
                style={({ pressed }) => [
                  styles.row,
                  index < section.items.length - 1 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}>
                <Icon name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Talk to us</Text>
        <View style={styles.contactRow}>
          <ContactButton
            icon="logo-whatsapp"
            label="WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}`)}
          />
          <ContactButton
            icon="call"
            label="Call us"
            onPress={() => Linking.openURL(`tel:${CONTACT.hotline}`)}
          />
        </View>
      </View>

      {isSignedIn ? (
        <Button
          title="Sign out"
          variant="secondary"
          onPress={confirmSignOut}
          style={styles.signOut}
        />
      ) : null}
    </ScrollView>
  );
};

const ContactButton = ({ icon, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}>
    <Icon name={icon} size={20} color={colors.primary} />
    <Text style={styles.contactLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1, marginLeft: spacing.md },
  name: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  meta: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  signIn: { minWidth: 100, height: 40 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowLabel: { flex: 1, fontSize: typography.size.md, color: colors.text },
  pressed: { opacity: 0.85 },
  contactRow: { flexDirection: 'row', gap: spacing.sm },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  contactLabel: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  signOut: { marginTop: spacing.sm },
});

export default AccountScreen;
