import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { OrderCard, PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import {
  getAllBookingsOfSingleUserRedux,
  getAllOrdersApiRedux,
} from '../../actions';
import { useAuth, useDarkStatusBar } from '../../hooks';
import {
  BUCKETS,
  BUCKET_LABELS,
  PAYMENT_FILTERS,
  SUB_TABS,
  canPay,
  canRefund,
  filterByPayment,
  hasInvoice,
  searchRecords,
} from '../../utils/dashboard';
import { formatPrice } from '../../utils/format';
import { FLOWS, ROUTES } from '../../navigation/routes';
import {
  BUCKET_ORDER,
  bucketCounts,
  flowSummary,
  recordsFor,
  subTabCounts,
} from './components/orderHelpers';
import RefundSheet from './components/RefundSheet';
import useOrderActions from './components/useOrderActions';
import { colors, radius, spacing, typography } from '../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const EASE = Easing.out(Easing.cubic);

const BUCKET_LOOKS = {
  [BUCKETS.REQUESTS]: {
    icon: 'document-text',
    empty: 'No requests waiting',
    hint: 'Product requests and bookings awaiting approval show up here.',
  },
  [BUCKETS.ORDERS]: {
    icon: 'receipt',
    empty: 'No active orders',
    hint: 'Orders we are buying or waiting on payment for appear here.',
  },
  [BUCKETS.FORWARDING]: {
    icon: 'airplane',
    empty: 'Nothing on the way',
    hint: 'Parcels travelling from China to Bangladesh appear here.',
  },
  [BUCKETS.DELIVERED]: {
    icon: 'home',
    empty: 'No deliveries yet',
    hint: 'Everything that reaches your door is listed here.',
  },
};

const validBucket = value =>
  BUCKET_ORDER.includes(value) ? value : BUCKETS.ORDERS;
const firstTab = bucket => SUB_TABS[bucket]?.[0]?.key;
/**
 * The customer dashboard for Buy & Ship orders and requests. Chips pick the
 * stage; `route.params.bucket` opens it on a given stage (the Account page
 * links straight to them). Ship for me is no longer offered, as on the website.
 */
const flow = FLOWS.BUY_AND_SHIP;

const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { currentUser, isSignedIn } = useAuth();
  useDarkStatusBar();
  useHideSupportFab();

  const symbol = useSelector(state => state.data.symbol);
  const bookings = useSelector(
    state => state.bookingRequests.bookingsArrayOfSingleUser,
  );
  const ordersApi = useSelector(state => state.orders.ordersApi);

  const [bucket, setBucket] = useState(() => validBucket(route.params?.bucket));
  const [subTab, setSubTab] = useState(() => firstTab(validBucket(route.params?.bucket)));
  const [query, setQuery] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Switching section opens its first tab, as the web's pages do.
  const openBucket = value => {
    setBucket(value);
    setSubTab(firstTab(value));
  };

  // A new deep link (e.g. tapping "Delivered" on the Account page again) re-targets the list.
  useEffect(() => {
    if (route.params?.bucket) openBucket(validBucket(route.params.bucket));
  }, [route.params?.bucket]);

  const load = useCallback(() => {
    if (!isSignedIn) return;
    dispatch(getAllOrdersApiRedux(currentUser.id));
    dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
  }, [dispatch, isSignedIn, currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  const sources = useMemo(
    () => ({ ordersApi, bookings }),
    [ordersApi, bookings],
  );

  /** The web's rule: requests from `bookingRequest`, the other sections from `ordersApi`. */
  const sectionRecords = useMemo(
    () => recordsFor(flow, bucket, sources, subTab),
    [bucket, sources, subTab],
  );
  const records = useMemo(
    () => searchRecords(filterByPayment(sectionRecords, payFilter), query),
    [sectionRecords, payFilter, query],
  );
  const counts = useMemo(() => bucketCounts(flow, sources), [sources]);
  const tabCounts = useMemo(() => subTabCounts(bucket, sources), [bucket, sources]);
  const summary = useMemo(() => flowSummary(flow, sources), [sources]);
  const tabs = SUB_TABS[bucket] || [];
  const isRequest = bucket === BUCKETS.REQUESTS;

  const { payFor, refundFor, refunding, openRefund, closeRefund, submitRefund } = useOrderActions({ onDone: load });

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="My orders"
          subtitle="Track every shipment"
          icon="receipt"
        />
        <Animated.View
          entering={FadeInUp.duration(400).easing(EASE)}
          style={styles.locked}
        >
          <View style={styles.lockedIcon}>
            <Icon name="lock-closed" size={30} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Sign in to see your orders</Text>
          <Text style={styles.lockedText}>
            Track every shipment from request through to delivery.
          </Text>
          <PressableScale
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            scaleTo={0.95}
            style={styles.ctaShadow}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Icon name="log-in-outline" size={16} color={colors.white} />
              <Text style={styles.ctaText}>Sign in</Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      </View>
    );
  }

  const look = BUCKET_LOOKS[bucket];

  const header = (
    <View>
      {/* Summary strip */}
      <Animated.View entering={FadeIn.duration(350)} style={styles.summary}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryInner}
        >
          <View style={styles.summaryBlob} />
          <SummaryStat icon="layers" value={summary.total} label="All" />
          <View style={styles.summaryDivider} />
          <SummaryStat
            icon="airplane"
            value={summary.inTransit}
            label="In transit"
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            icon="wallet"
            value={formatPrice(summary.due, symbol)}
            label="Due"
          />
        </LinearGradient>
      </Animated.View>

      {/* Stage chips with counts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {BUCKET_ORDER.map(value => {
          const on = value === bucket;
          return (
            <PressableScale
              key={value}
              onPress={() => openBucket(value)}
              scaleTo={0.95}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Icon
                name={
                  on
                    ? BUCKET_LOOKS[value].icon
                    : `${BUCKET_LOOKS[value].icon}-outline`
                }
                size={14}
                color={on ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {BUCKET_LABELS[value]}
              </Text>
              <View style={[styles.count, on && styles.countOn]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>
                  {counts[value] || 0}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* The web's tabs inside the section, with counts */}
      {tabs.length > 1 ? (
        <View style={styles.tabs}>
          {tabs.map(tab => {
            const on = tab.key === subTab;
            return (
              <PressableScale
                key={tab.key}
                onPress={() => setSubTab(tab.key)}
                scaleTo={0.96}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{tab.label}</Text>
                <Text style={[styles.tabCount, on && styles.tabCountOn]}>{tabCounts[tab.key] || 0}</Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}

      {/* Search and payment filter */}
      <View style={styles.search}>
        <Icon name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Order no., tracking no., date or product type"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {query ? (
          <PressableScale onPress={() => setQuery('')} scaleTo={0.85} hitSlop={8}>
            <Icon name="close-circle" size={16} color={colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {PAYMENT_FILTERS.map(filter => {
          const on = filter.key === payFilter;
          return (
            <PressableScale
              key={filter.key}
              onPress={() => setPayFilter(filter.key)}
              scaleTo={0.94}
              style={[styles.filter, on && styles.filterOn]}
            >
              <Text style={[styles.filterText, on && styles.filterTextOn]}>{filter.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My orders"
        subtitle="Requests, orders and deliveries"
        icon="receipt"
      />

      <FlatList
        key={`${bucket}-${subTab}`}
        data={records}
        keyExtractor={(item, index) =>
          `${item.orderId || item.bookingId || index}`
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeInUp.duration(380).easing(EASE)}
            style={styles.empty}
          >
            <View style={styles.emptyIcon}>
              <Icon name={look.icon} size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {query || payFilter !== 'all' ? 'Nothing matches' : look.empty}
            </Text>
            <Text style={styles.emptyText}>
              {query || payFilter !== 'all' ? 'Try another search or payment filter.' : look.hint}
            </Text>
            <PressableScale
              onPress={() => navigation.navigate(ROUTES.TAB_HOME)}
              scaleTo={0.95}
              style={styles.ctaShadow}
            >
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Icon name="bag-handle" size={16} color={colors.white} />
                <Text style={styles.ctaText}>Start shopping</Text>
              </LinearGradient>
            </PressableScale>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInUp.delay(Math.min(index, 6) * 70)
              .duration(380)
              .easing(EASE)}
          >
            <OrderCard
              order={item}
              symbol={symbol}
              onPress={() =>
                navigation.navigate(ROUTES.TRACKING_DETAILS, {
                  order: item,
                  flow,
                  isRequest: bucket === BUCKETS.REQUESTS,
                })
              }
              onPay={canPay(item, bucket) ? () => payFor(item, isRequest) : undefined}
              onTrack={() =>
                navigation.navigate(ROUTES.TRACKING_DETAILS, {
                  order: item,
                  flow,
                  isRequest: bucket === BUCKETS.REQUESTS,
                })
              }
              onInvoice={
                hasInvoice(item)
                  ? () =>
                      navigation.navigate(ROUTES.INVOICE, {
                        order: item,
                        flow,
                        isRequest: bucket === BUCKETS.REQUESTS,
                      })
                  : undefined
              }
              onRefund={canRefund(item) ? () => openRefund(item) : undefined}
            />
          </Animated.View>
        )}
      />

      <RefundSheet
        visible={Boolean(refundFor)}
        order={refundFor}
        isRequest={isRequest}
        symbol={symbol}
        submitting={refunding}
        onClose={closeRefund}
        onSubmit={submitRefund}
      />
    </View>
  );
};

const SummaryStat = ({ icon, value, label }) => (
  <View style={styles.stat}>
    <Icon name={icon} size={14} color="rgba(255,255,255,0.85)" />
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  summary: { marginTop: 4 },
  summaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  summaryBlob: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statValue: {
    marginTop: 3,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  chips: { gap: 8, paddingVertical: 14 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: '#ececf1' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12 },
  tabOn: {
    backgroundColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  tabTextOn: { color: colors.primary, fontWeight: '800' },
  tabCount: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  tabCountOn: { color: colors.primary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: typography.size.sm, color: colors.text },
  filters: { gap: 6, paddingTop: 10, paddingBottom: 12 },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: '#ececf1' },
  filterOn: { backgroundColor: '#1f2340', borderColor: '#1f2340' },
  filterText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  filterTextOn: { color: colors.white },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  chipTextOn: { color: colors.white, fontWeight: typography.weight.bold },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  countTextOn: { color: colors.white },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  ctaText: {
    color: colors.white,
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
  },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
  },
  lockedIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    marginTop: spacing.md,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  lockedText: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default DashboardScreen;
