import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { EmptyState, OrderCard, SegmentedControl } from '../../components';
import {
  getAllBookingsOfSingleUserRedux,
  getAllOrdersApiRedux,
  getAllShipForMeOfSingleUserRedux,
  uploadRefundApplyRedux,
} from '../../actions';
import { useAuth } from '../../hooks';
import { BUCKETS, BUCKET_LABELS, filterByBucket, getOrderTotals } from '../../utils/dashboard';
import { generateBookingId } from '../../utils/ids';
import { notifySuccess } from '../../utils/notify';
import { FLOWS, ROUTES } from '../../navigation/routes';
import { PAYMENT_TARGETS } from '../payment';
import { colors, spacing } from '../../theme';

const FLOW_SEGMENTS = [
  { value: FLOWS.BUY_AND_SHIP, label: 'Buy & Ship' },
  { value: FLOWS.SHIP_FOR_ME, label: 'Ship for me' },
];

const BUCKET_SEGMENTS = [
  BUCKETS.REQUESTS,
  BUCKETS.ORDERS,
  BUCKETS.FORWARDING,
  BUCKETS.DELIVERED,
].map(value => ({ value, label: BUCKET_LABELS[value] }));

/**
 * The customer dashboard — one screen for both freight pipelines.
 *
 * The web app had two duplicated route trees of four screens each, and its
 * ship-for-me sidebar linked at the buy-and-ship URLs, leaving those screens
 * reachable only by typing the address. Here a segmented control switches flow
 * and a second one switches stage, so everything is reachable.
 */
const DashboardScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { currentUser, isSignedIn } = useAuth();

  const symbol = useSelector(state => state.data.symbol);
  const bookings = useSelector(state => state.bookingRequests.bookingsArrayOfSingleUser);
  const shipForMe = useSelector(state => state.bookingRequests.shipForMeOfSingleUser);
  const ordersApi = useSelector(state => state.orders.ordersApi);

  const [flow, setFlow] = useState(FLOWS.BUY_AND_SHIP);
  const [bucket, setBucket] = useState(BUCKETS.ORDERS);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!isSignedIn) return;
    dispatch(getAllOrdersApiRedux(currentUser.id));
    dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
    dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id));
  }, [dispatch, isSignedIn, currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  /** Ship-for-me reads one collection; buy-and-ship splits orders from requests. */
  const records = useMemo(() => {
    if (flow === FLOWS.SHIP_FOR_ME) return filterByBucket(shipForMe, bucket);
    const source = bucket === BUCKETS.ORDERS ? ordersApi : bookings;
    return filterByBucket(source, bucket);
  }, [flow, bucket, shipForMe, ordersApi, bookings]);

  const paymentTarget =
    flow === FLOWS.SHIP_FOR_ME
      ? PAYMENT_TARGETS.SHIPMENT
      : bucket === BUCKETS.ORDERS
      ? PAYMENT_TARGETS.ORDER
      : PAYMENT_TARGETS.PRODUCT_REQUEST;

  const payFor = order => {
    const { due } = getOrderTotals(order);
    navigation.navigate(ROUTES.PAYMENT_SHEET, {
      amount: due,
      target: paymentTarget,
      orders: paymentTarget === PAYMENT_TARGETS.ORDER ? [order] : [],
      productRequestArray:
        paymentTarget === PAYMENT_TARGETS.ORDER ? [] : [order],
      returnRoute: ROUTES.DASHBOARD,
    });
  };

  const applyRefund = async order => {
    const isProductRequest = paymentTarget !== PAYMENT_TARGETS.ORDER;
    await dispatch(
      uploadRefundApplyRedux({
        refundId: generateBookingId(),
        order,
        productRequest: isProductRequest,
        userId: currentUser.id,
        displayName: currentUser.displayName,
      }),
    );
    notifySuccess('Refund requested', 'Our team will review it shortly.');
  };

  if (!isSignedIn) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Sign in to see your orders"
        message="Track every shipment from request through to delivery."
        actionLabel="Sign in"
        onAction={() => navigation.navigate(ROUTES.LOGIN)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <SegmentedControl segments={FLOW_SEGMENTS} value={flow} onChange={setFlow} />
        <SegmentedControl
          scrollable
          segments={BUCKET_SEGMENTS}
          value={bucket}
          onChange={setBucket}
          style={styles.bucketControl}
        />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item, index) => `${item.orderId || item.bookingId || index}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={`Nothing in ${BUCKET_LABELS[bucket].toLowerCase()}`}
            message="Anything you order or book will appear here as it moves through the pipeline."
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            symbol={symbol}
            onPress={() =>
              navigation.navigate(ROUTES.TRACKING_DETAILS, { order: item, flow })
            }
            onPay={() => payFor(item)}
            onTrack={() =>
              navigation.navigate(ROUTES.TRACKING_DETAILS, { order: item, flow })
            }
            onInvoice={() =>
              navigation.navigate(ROUTES.INVOICE, { order: item, flow })
            }
            onRefund={
              bucket === BUCKETS.DELIVERED ? undefined : () => applyRefund(item)
            }
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  controls: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bucketControl: { marginTop: spacing.sm },
  list: { padding: spacing.md, flexGrow: 1 },
});

export default DashboardScreen;
