import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { Button, Input, Screen, StatusTimeline } from '../../components';
import { getOrderTrackingResultRedux } from '../../actions';
import { notifyError } from '../../utils/notify';
import { formatDate } from '../../utils/format';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Public order tracking — no sign-in needed, matching the website.
 *
 * The lookup accepts either a document id or a courier tracking number and
 * searches all three pipelines (orders, shipments, product requests).
 */
const TrackOrderScreen = () => {
  const dispatch = useDispatch();
  const result = useSelector(state => state.orders.orderTrackingResult);

  const [trackingNo, setTrackingNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!trackingNo.trim()) {
      notifyError('Enter your order or tracking number.');
      return;
    }

    setSearching(true);
    try {
      await dispatch(getOrderTrackingResultRedux(trackingNo.trim()));
      setSearched(true);
    } catch (error) {
      notifyError(error, 'Could not look that up.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.heading}>Track your order</Text>
      <Text style={styles.sub}>
        Enter your order number or the tracking number we gave you.
      </Text>

      <Input
        placeholder="e.g. 4829173 or a tracking number"
        autoCapitalize="characters"
        autoCorrect={false}
        value={trackingNo}
        onChangeText={setTrackingNo}
        onSubmitEditing={search}
        returnKeyType="search"
      />

      <Button title="Track" onPress={search} loading={searching} />

      {searched && !result ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>
            We couldn't find anything for that number. Double-check it, or
            contact us and we'll look it up for you.
          </Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.card}>
          <Text style={styles.reference}>
            #{result.orderId || result.bookingId}
          </Text>
          {result.trackingNo ? (
            <Text style={styles.meta}>Tracking: {result.trackingNo}</Text>
          ) : null}
          {result.orderedDate || result.time ? (
            <Text style={styles.meta}>
              Placed {result.orderedDate || formatDate(result.time)}
            </Text>
          ) : null}

          <View style={styles.timeline}>
            <StatusTimeline order={result} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  sub: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  notFound: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  notFoundText: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reference: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  meta: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  timeline: { marginTop: spacing.md },
});

export default TrackOrderScreen;
