import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { Easing, FadeIn, FadeInLeft, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { PressableScale } from '../../components';
import { getAllBookingsOfSingleUserRedux, getAllOrdersApiRedux } from '../../actions';
import { logout } from '../../firebase/firebase.utils';
import UserAvatar from '../../components/UserAvatar';
import ConfirmSheet from '../../components/ConfirmSheet';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { CONTACT } from '../../constants/config';
import { BUCKETS, filterByBucket, getOrderTotals, sourceFor } from '../../utils/dashboard';
import { selectCartCount } from '../../utils/cartCount';
import { formatPrice } from '../../utils/format';
import { notifyInfo } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const EASE = Easing.out(Easing.cubic);
const text = value => (value === undefined || value === null || typeof value === 'object' ? '' : String(value));

/** The order pipeline, linking straight into the matching My orders tab. */
const ORDER_SHORTCUTS = [
  { bucket: BUCKETS.REQUESTS, label: 'Requests', icon: 'document-text', colors: ['#fdba74', '#f97316'] },
  { bucket: BUCKETS.ORDERS, label: 'Orders', icon: 'bag-handle', colors: ['#c4a1ff', '#7c3aed'] },
  { bucket: BUCKETS.FORWARDING, label: 'On the way', icon: 'airplane', colors: ['#7dd3fc', '#0284c7'] },
  { bucket: BUCKETS.DELIVERED, label: 'Delivered', icon: 'checkmark-done', colors: ['#6ee7b7', '#059669'] },
];

/** The ALG services, as gradient tiles. */
const SERVICES = [
  { label: 'Buy for me', hint: 'We buy it for you', icon: 'cart', route: ROUTES.BUY_FOR_ME, colors: ['#ff8a5c', '#e8344a'] },
  { label: 'Request a product', hint: "Can't find it? Ask", icon: 'search', route: ROUTES.REQUEST_PRODUCT, colors: ['#f472b6', '#c026d3'] },
  { label: 'Track an order', hint: 'Live status', icon: 'navigate', route: ROUTES.TRACK_ORDER, colors: ['#34d399', '#059669'] },
];

const SECTIONS = [
  {
    title: 'Account settings',
    items: [
      { label: 'My information', hint: 'Profile, company & addresses', icon: 'person', tint: '#eef2ff', color: '#4f46e5', route: ROUTES.PROFILE_INFORMATION, protected: true },
      { label: 'Security', hint: 'Password & sign-in', icon: 'lock-closed', tint: '#e8f7f1', color: '#059669', route: ROUTES.PROFILE_SECURITY, protected: true },
      { label: 'Wishlist', hint: 'Saved products', icon: 'heart', tint: '#fdeefe', color: '#db2777', route: ROUTES.WISHLIST, protected: true, badge: 'wishlist' },
    ],
  },
  {
    title: 'Help centre',
    items: [
      { label: 'Notices', hint: 'Updates from ALG', icon: 'megaphone', tint: '#fff6dc', color: '#e08a00', route: ROUTES.NOTICES },
      { label: 'How to order', hint: 'Step-by-step guide', icon: 'help-buoy', tint: '#fff2e5', color: '#f97316', route: ROUTES.HOW_TO_ORDER },
      { label: 'FAQ', hint: 'Common questions', icon: 'help-circle', tint: '#e8f4ff', color: '#2563eb', route: ROUTES.FAQ },
      { label: 'Tax & shipping', hint: 'Rates and customs', icon: 'calculator', tint: '#eef0f6', color: '#1f2340', route: ROUTES.TAX_AND_SHIPPING },
      { label: 'Contact us', hint: 'Phone, email & office', icon: 'call', tint: '#e8f7f1', color: '#059669', route: ROUTES.CONTACT },
    ],
  },
  {
    title: 'About ALG',
    items: [
      { label: 'About us', icon: 'information-circle', tint: '#fff0ec', color: colors.primary, route: ROUTES.ABOUT_US },
      { label: 'Privacy policy', icon: 'shield-checkmark', tint: '#eef2ff', color: '#4f46e5', route: ROUTES.PRIVACY },
      { label: 'Return & refunds', icon: 'return-down-back', tint: '#fff6dc', color: '#e08a00', route: ROUTES.REFUND },
      { label: 'Terms & conditions', icon: 'document-text', tint: '#eef0f6', color: '#1f2340', route: ROUTES.TERMS },
    ],
  },
];

const initialsOf = name =>
  text(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'A';

/**
 * Order counts for the shortcut row, read the way My orders (and the website)
 * reads them: requests from `bookingRequest`, the other sections from `ordersApi`.
 */
export const orderCounts = (ordersApi, bookings) =>
  Object.fromEntries(
    ORDER_SHORTCUTS.map(({ bucket }) => [
      bucket,
      filterByBucket(sourceFor(bucket) === 'bookings' ? bookings : ordersApi, bucket).length,
    ]),
  );

/** Account hub: profile, order pipeline, services, settings and help. */
const AccountScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { currentUser, isSignedIn } = useAuth();
  useDarkStatusBar();

  const ordersApi = useSelector(state => state.orders.ordersApi);
  const bookings = useSelector(state => state.bookingRequests.bookingsArrayOfSingleUser);
  const wishlistCount = useSelector(state => (state.wishlist.list || []).length);
  const cartCount = useSelector(state => selectCartCount(state.cartList.cart));
  const symbol = useSelector(state => state.data.symbol);

  // The shortcut counts need the user's orders even before My orders opens.
  useEffect(() => {
    if (!isSignedIn || !currentUser?.id) return;
    dispatch(getAllOrdersApiRedux(currentUser.id));
    dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
  }, [dispatch, isSignedIn, currentUser?.id]);

  const counts = useMemo(() => orderCounts(ordersApi, bookings), [ordersApi, bookings]);
  const due = useMemo(
    () => (ordersApi || []).reduce((total, order) => total + getOrderTotals(order).due, 0),
    [ordersApi],
  );

  const name = text(currentUser?.displayName) || text(currentUser?.mobileNo) || 'ALG customer';
  const email = text(currentUser?.email) || text(currentUser?.mobileNo);
  const customerId = text(currentUser?.userId);

  const requireSignIn = () => navigation.navigate(ROUTES.LOGIN);

  const open = item => {
    if (item.protected && !isSignedIn) {
      requireSignIn();
      return;
    }
    navigation.navigate(item.route);
  };

  // My orders lives in the Orders tab; open it on the chosen bucket.
  const openOrders = bucket => {
    if (!isSignedIn) {
      requireSignIn();
      return;
    }
    navigation.navigate(ROUTES.TAB_ORDERS, {
      screen: ROUTES.DASHBOARD,
      params: bucket ? { bucket } : undefined,
    });
  };

  // Asked in the app's own sheet rather than the system dialog.
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const confirmSignOut = () => setSignOutOpen(true);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  const copyId = () => {
    Clipboard.setString(customerId);
    notifyInfo('Customer ID copied', customerId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile hero */}
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />

        <Animated.View entering={FadeInLeft.duration(450).easing(EASE)} style={styles.identity}>
          {isSignedIn ? (
            <PressableScale
              onPress={() => navigation.navigate(ROUTES.PROFILE_INFORMATION)}
              scaleTo={0.94}
              accessibilityLabel="Change profile photo"
            >
              <UserAvatar user={currentUser} initials={initialsOf(name)} style={styles.avatar} textStyle={styles.avatarText} />
              <View style={styles.avatarCamera}>
                <Icon name="camera" size={11} color={colors.white} />
              </View>
            </PressableScale>
          ) : (
            <View style={styles.avatar}>
              <Icon name="person" size={28} color={colors.primary} />
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={1}>
              {isSignedIn ? name : 'Welcome to ALG'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {isSignedIn ? email : 'Shop from China, delivered in Bangladesh'}
            </Text>
            {isSignedIn && customerId ? (
              <PressableScale onPress={copyId} scaleTo={0.94} style={styles.idChip}>
                <Icon name="id-card" size={11} color={colors.white} />
                <Text style={styles.idText}>ID {customerId}</Text>
                <Icon name="copy-outline" size={11} color={colors.white} />
              </PressableScale>
            ) : null}
          </View>
          {isSignedIn ? (
            <PressableScale onPress={() => navigation.navigate(ROUTES.PROFILE_INFORMATION)} scaleTo={0.9} style={styles.edit} accessibilityLabel="Edit profile">
              <Icon name="create-outline" size={18} color={colors.white} />
            </PressableScale>
          ) : null}
        </Animated.View>

        {isSignedIn ? (
          <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.stats}>
            <Stat value={(ordersApi || []).length} label="Orders" onPress={() => openOrders()} />
            <View style={styles.statDivider} />
            <Stat value={wishlistCount} label="Wishlist" onPress={() => navigation.navigate(ROUTES.WISHLIST)} />
            <View style={styles.statDivider} />
            <Stat value={cartCount} label="In cart" onPress={() => navigation.navigate(ROUTES.TAB_CART)} />
            <View style={styles.statDivider} />
            <Stat value={formatPrice(due, symbol)} label="Due" onPress={() => openOrders(BUCKETS.ORDERS)} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.authRow}>
            <PressableScale onPress={requireSignIn} scaleTo={0.96} style={styles.authPrimary}>
              <Icon name="log-in-outline" size={16} color={colors.primary} />
              <Text style={styles.authPrimaryText}>Sign in</Text>
            </PressableScale>
            <PressableScale onPress={requireSignIn} scaleTo={0.96} style={styles.authSecondary}>
              <Text style={styles.authSecondaryText}>Create account</Text>
            </PressableScale>
          </Animated.View>
        )}
      </LinearGradient>

      {/* Order pipeline */}
      <Animated.View entering={FadeInUp.delay(120).duration(420).easing(EASE)} style={[styles.card, styles.lifted]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>My orders</Text>
          <PressableScale onPress={() => openOrders()} scaleTo={0.94} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View all</Text>
            <Icon name="chevron-forward" size={13} color={colors.primary} />
          </PressableScale>
        </View>
        <View style={styles.pipeline}>
          {ORDER_SHORTCUTS.map(shortcut => (
            <PressableScale key={shortcut.bucket} onPress={() => openOrders(shortcut.bucket)} scaleTo={0.92} style={styles.pipeItem}>
              <View>
                <LinearGradient colors={shortcut.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pipeIcon}>
                  <Icon name={shortcut.icon} size={20} color={colors.white} />
                </LinearGradient>
                {isSignedIn && counts[shortcut.bucket] > 0 ? (
                  <View style={styles.pipeBadge}>
                    <Text style={styles.pipeBadgeText}>{counts[shortcut.bucket] > 99 ? '99+' : counts[shortcut.bucket]}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.pipeLabel}>{shortcut.label}</Text>
            </PressableScale>
          ))}
        </View>
      </Animated.View>

      {/* Services */}
      <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.sectionTitle}>
        Our services
      </Animated.Text>
      <View style={styles.services}>
        {SERVICES.map((service, index) => (
          <Animated.View key={service.label} entering={FadeInUp.delay(220 + index * 60).duration(380).easing(EASE)} style={styles.serviceWrap}>
            <PressableScale onPress={() => navigation.navigate(service.route)} scaleTo={0.96} style={styles.service}>
              <LinearGradient colors={service.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.serviceIcon}>
                <Icon name={service.icon} size={20} color={colors.white} />
              </LinearGradient>
              <Text style={styles.serviceLabel} numberOfLines={1}>
                {service.label}
              </Text>
              <Text style={styles.serviceHint} numberOfLines={1}>
                {service.hint}
              </Text>
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      {/* Settings, help and about */}
      {SECTIONS.map((section, sectionIndex) => (
        <Animated.View key={section.title} entering={FadeInUp.delay(320 + sectionIndex * 70).duration(400).easing(EASE)}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item, index) => (
              <PressableScale
                key={item.label}
                onPress={() => open(item)}
                scaleTo={0.98}
                style={[styles.row, index < section.items.length - 1 && styles.rowDivider]}>
                <View style={[styles.rowIcon, { backgroundColor: item.tint }]}>
                  <Icon name={item.icon} size={16} color={item.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
                </View>
                {item.badge === 'wishlist' && wishlistCount > 0 ? <Text style={styles.rowCount}>{wishlistCount}</Text> : null}
                {item.protected && !isSignedIn ? <Icon name="lock-closed" size={12} color={colors.textMuted} style={styles.rowLock} /> : null}
                <Icon name="chevron-forward" size={16} color={colors.textMuted} />
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* Talk to us */}
      <Animated.View entering={FadeInUp.delay(540).duration(400).easing(EASE)}>
        <Text style={styles.sectionTitle}>Talk to us</Text>
        <View style={styles.contactRow}>
          <PressableScale
            onPress={() => Linking.openURL(`https://wa.me/${CONTACT.whatsapp.replace('+', '')}`).catch(() => {})}
            scaleTo={0.96}
            style={[styles.contact, styles.contactWhatsapp]}>
            <Icon name="logo-whatsapp" size={20} color={colors.white} />
            <View>
              <Text style={styles.contactTitle}>WhatsApp</Text>
              <Text style={styles.contactHint}>Chat with support</Text>
            </View>
          </PressableScale>
          <PressableScale onPress={() => Linking.openURL(`tel:${CONTACT.hotline}`).catch(() => {})} scaleTo={0.96} style={[styles.contact, styles.contactCall]}>
            <Icon name="call" size={19} color={colors.white} />
            <View>
              <Text style={styles.contactTitle}>Call us</Text>
              <Text style={styles.contactHint}>{CONTACT.hotline}</Text>
            </View>
          </PressableScale>
        </View>
      </Animated.View>

      {isSignedIn ? (
        <PressableScale onPress={confirmSignOut} scaleTo={0.97} style={styles.signOut}>
          <Icon name="log-out-outline" size={18} color={colors.primary} />
          <Text style={styles.signOutText}>Sign out</Text>
        </PressableScale>
      ) : null}

      <Text style={styles.footer}>ALG · Shop from China, delivered to your door</Text>

      <ConfirmSheet
        visible={signOutOpen}
        icon="log-out-outline"
        title="Sign out of ALG?"
        message="Your cart, wishlist and orders stay saved to your account. Sign in again any time with your phone number."
        preview={
          isSignedIn
            ? {
                image: typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '',
                icon: 'person',
                title: name || 'Your account',
                subtitle: currentUser?.email || currentUser?.mobileNo || '',
              }
            : null
        }
        confirmLabel="Sign out"
        confirmIcon="log-out-outline"
        cancelLabel="Stay signed in"
        busy={signingOut}
        onConfirm={signOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </ScrollView>
  );
};

const Stat = ({ value, label, onPress }) => (
  <PressableScale onPress={onPress} scaleTo={0.92} style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </PressableScale>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { paddingBottom: spacing.xl },
  hero: { paddingHorizontal: spacing.md, paddingBottom: 44, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  blobA: { width: 240, height: 240, top: -90, right: -80 },
  blobB: { width: 170, height: 170, bottom: -60, left: -60 },
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 23, fontWeight: '800', color: colors.primary },
  avatarCamera: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  identityText: { flex: 1, marginLeft: 14 },
  name: { fontSize: typography.size.xl, fontWeight: '800', color: colors.white },
  email: { marginTop: 1, fontSize: typography.size.sm, color: 'rgba(255,255,255,0.9)' },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  idText: { fontSize: 11, fontWeight: typography.weight.bold, color: colors.white },
  edit: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)' },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statValue: { fontSize: typography.size.lg, fontWeight: '800', color: colors.white },
  statLabel: { marginTop: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.3)' },
  authRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  authPrimary: { flex: 1, flexDirection: 'row', gap: 6, height: 46, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  authPrimaryText: { fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.primary },
  authSecondary: { flex: 1, height: 46, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  authSecondaryText: { fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold, color: colors.white },
  card: {
    marginHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  lifted: { marginTop: -28, padding: 14, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { flex: 1, fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  pipeline: { flexDirection: 'row' },
  pipeItem: { flex: 1, alignItems: 'center' },
  pipeIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pipeBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#1f2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipeBadgeText: { fontSize: 9.5, fontWeight: '800', color: colors.white },
  pipeLabel: { marginTop: 6, fontSize: 11, fontWeight: typography.weight.semiBold, color: colors.text },
  sectionTitle: { marginTop: spacing.lg, marginBottom: 10, marginHorizontal: spacing.md + 2, fontSize: typography.size.md - 1, fontWeight: '800', color: colors.text },
  services: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md - 5 },
  serviceWrap: { width: '33.333%', padding: 5 },
  service: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  serviceIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceLabel: { marginTop: 10, fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  serviceHint: { marginTop: 1, fontSize: 11, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececf1' },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginLeft: 12 },
  rowLabel: { fontSize: typography.size.sm + 1, fontWeight: typography.weight.semiBold, color: colors.text },
  rowHint: { marginTop: 1, fontSize: 11, color: colors.textMuted },
  rowCount: {
    marginRight: 6,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    backgroundColor: '#db2777',
  },
  rowLock: { marginRight: 6 },
  contactRow: { flexDirection: 'row', gap: 10, marginHorizontal: spacing.md },
  contact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20 },
  contactWhatsapp: { backgroundColor: '#25d366' },
  contactCall: { backgroundColor: '#1f2340' },
  contactTitle: { fontSize: typography.size.sm, fontWeight: '800', color: colors.white },
  contactHint: { marginTop: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ffd4cc',
    backgroundColor: '#fff8f6',
  },
  signOutText: { fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.primary },
  footer: { marginTop: spacing.lg, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});

export default AccountScreen;
