import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useDispatch, useSelector } from 'react-redux';

import { BottomSheet, Button, Input, SegmentedControl } from '../../components';
import {
  deleteShipForMeListRedux,
  getAllD2DRatesRedux,
  getAllShipForMeListRedux,
  setShipForMeRedux,
  uploadShipForMeListRedux,
} from '../../actions';
import { useAuth, useAuthGuard } from '../../hooks';
import {
  SHIP_FROM_BY_METHOD,
  SHIP_METHODS,
  getValidToDate,
  quoteFreight,
} from '../../utils/freight';
import { generateBookingId } from '../../utils/ids';
import { formatPrice } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';

const CONTENT_TYPES = ['none', 'liquid', 'powder', 'battery'];

/**
 * "Ship for me" — for customers who bought abroad themselves and only need ALG
 * to forward the goods to Bangladesh.
 *
 * Two steps, as on the web: get a freight quote, then build up a list of
 * parcels and submit them together as a booking request. No payment happens
 * here — an agent follows up.
 */
const ShipForMeScreen = () => {
  const dispatch = useDispatch();
  const requireAuth = useAuthGuard();
  const { currentUser, isSignedIn } = useAuth();

  const d2dRates = useSelector(state => state.bookingRequests.d2dRates);
  const shipForMeList = useSelector(state => state.shipForMeList.shipForMeList);
  const symbol = useSelector(state => state.data.symbol);

  const [method, setMethod] = useState(SHIP_METHODS.SEA);
  const [shipFrom, setShipFrom] = useState('china');
  const [weight, setWeight] = useState('');
  const [productType, setProductType] = useState('');
  const [quote, setQuote] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [parcel, setParcel] = useState(emptyParcel());
  const [submitting, setSubmitting] = useState(false);

  // Rates are stored per method+country, so a change reloads them.
  useEffect(() => {
    dispatch(getAllD2DRatesRedux(method, shipFrom));
    setProductType('');
    setQuote(null);
  }, [dispatch, method, shipFrom]);

  useEffect(() => {
    if (isSignedIn) dispatch(getAllShipForMeListRedux(currentUser.id));
  }, [dispatch, isSignedIn, currentUser?.id]);

  const calculate = () => {
    if (!weight || !productType) {
      notifyError('Choose a product type and enter a weight.');
      return;
    }
    const result = quoteFreight({ weight, productTypeId: productType, rates: d2dRates, method });
    if (!result) {
      notifyError('We could not quote that. Check the weight and try again.');
      return;
    }
    setQuote(result);
  };

  const addParcel = () =>
    requireAuth(async () => {
      if (!parcel.productName.trim()) {
        notifyError('Please give the product a name.');
        return;
      }

      setSubmitting(true);
      try {
        await dispatch(
          uploadShipForMeListRedux({
            ...parcel,
            userId: currentUser.id,
            displayName: currentUser.displayName,
            method,
            shipFrom,
            time: Date.now(),
          }),
        );
        setParcel(emptyParcel());
        setFormVisible(false);
        notifySuccess('Parcel added to your list');
      } catch (error) {
        notifyError(error, 'Could not add that parcel.');
      } finally {
        setSubmitting(false);
      }
    });

  /** Turns every draft parcel into a booking, then clears the drafts. */
  const submitBooking = () =>
    requireAuth(async () => {
      if (!shipForMeList?.length) {
        notifyError('Add at least one parcel first.');
        return;
      }

      setSubmitting(true);
      try {
        for (const draft of shipForMeList) {
          const bookingId = generateBookingId();
          await dispatch(
            setShipForMeRedux({
              ...draft,
              bookingId,
              userId: currentUser.id,
              displayName: currentUser.displayName,
              bookingStatus: 'Pending',
              shipmentMethod: 'D2D',
              shipmentStatusScore: 1,
              validTo: getValidToDate().toISOString(),
              time: Date.now(),
            }),
          );
          await dispatch(deleteShipForMeListRedux(draft));
        }

        notifySuccess(
          'Booking received',
          'Your booking is successful! Our agent will contact you soon.',
        );
      } catch (error) {
        notifyError(error, 'Could not submit your booking.');
      } finally {
        setSubmitting(false);
      }
    });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get a shipping rate</Text>

          <Text style={styles.label}>Shipping method</Text>
          <SegmentedControl
            value={method}
            onChange={setMethod}
            segments={[
              { value: SHIP_METHODS.SEA, label: 'By sea' },
              { value: SHIP_METHODS.AIR, label: 'By air' },
            ]}
          />

          <Text style={styles.label}>Shipping from</Text>
          <SegmentedControl
            scrollable
            value={shipFrom}
            onChange={setShipFrom}
            segments={SHIP_FROM_BY_METHOD[method].map(country => ({
              value: country,
              label: country.toUpperCase(),
            }))}
          />

          <Text style={styles.label}>Product type</Text>
          {d2dRates?.length > 0 ? (
            <SegmentedControl
              scrollable
              value={productType}
              onChange={setProductType}
              segments={d2dRates.map(rate => ({
                value: rate.id,
                label: rate.name || rate.productType || rate.id,
              }))}
            />
          ) : (
            <Text style={styles.muted}>Loading rates…</Text>
          )}

          <Input
            label="Total weight (kg)"
            placeholder="e.g. 25"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            style={styles.weightInput}
          />

          <Button title="Calculate" variant="secondary" onPress={calculate} />

          {quote ? (
            <View style={styles.quote}>
              <Text style={styles.quoteLabel}>Estimated freight</Text>
              <Text style={styles.quoteValue}>{formatPrice(quote.result, symbol)}</Text>
              <Text style={styles.quoteMeta}>
                {formatPrice(quote.perKg, symbol)} per kg · {method === SHIP_METHODS.SEA ? 'sea' : 'air'} from{' '}
                {shipFrom.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.cardTitle}>Your parcels</Text>
            <Pressable onPress={() => setFormVisible(true)} hitSlop={8}>
              <Text style={styles.addLink}>+ Add parcel</Text>
            </Pressable>
          </View>

          {shipForMeList?.length > 0 ? (
            shipForMeList.map(draft => (
              <View key={draft.bookingId} style={styles.parcelRow}>
                <View style={styles.parcelInfo}>
                  <Text style={styles.parcelName}>{draft.productName}</Text>
                  <Text style={styles.parcelMeta}>
                    {draft.cartonQuantity || 1} carton(s) · {draft.productQuantity || 1} pcs
                    {draft.totalCbm ? ` · ${draft.totalCbm} cm³` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => dispatch(deleteShipForMeListRedux(draft))}
                  hitSlop={8}>
                  <Icon name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              Add the parcels you want shipped, then send them to us as one booking.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our warehouse address</Text>
          <Text style={styles.muted}>
            Once your booking is approved our agent will share the warehouse
            address for {shipFrom.toUpperCase()} so you can send your goods there.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <Button
          title={`Request booking${shipForMeList?.length ? ` (${shipForMeList.length})` : ''}`}
          onPress={submitBooking}
          loading={submitting}
        />
      </View>

      <BottomSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        title="Add a parcel"
        fullHeight>
        <Input
          label="Product name"
          placeholder="What are you shipping?"
          value={parcel.productName}
          onChangeText={value => setParcel({ ...parcel, productName: value })}
        />
        <Input
          label="Product link (optional)"
          placeholder="https://…"
          autoCapitalize="none"
          value={parcel.productLink}
          onChangeText={value => setParcel({ ...parcel, productLink: value })}
        />
        <Input
          label="Cartons"
          placeholder="1"
          keyboardType="number-pad"
          value={parcel.cartonQuantity}
          onChangeText={value => setParcel({ ...parcel, cartonQuantity: value })}
        />
        <Input
          label="Total pieces"
          placeholder="1"
          keyboardType="number-pad"
          value={parcel.productQuantity}
          onChangeText={value => setParcel({ ...parcel, productQuantity: value })}
        />
        <Input
          label="Total cost"
          placeholder="0"
          keyboardType="number-pad"
          value={parcel.totalCost}
          onChangeText={value => setParcel({ ...parcel, totalCost: value })}
        />
        <Input
          label="Total CBM (cm³)"
          placeholder="0"
          keyboardType="number-pad"
          value={parcel.totalCbm}
          onChangeText={value => setParcel({ ...parcel, totalCbm: value })}
        />

        <Text style={styles.label}>Contains</Text>
        <SegmentedControl
          scrollable
          value={parcel.contains}
          onChange={value => setParcel({ ...parcel, contains: value })}
          segments={CONTENT_TYPES.map(type => ({ value: type, label: type }))}
        />

        <Text style={styles.label}>Brand</Text>
        <SegmentedControl
          value={parcel.brandType}
          onChange={value => setParcel({ ...parcel, brandType: value })}
          segments={[
            { value: 'non-brand', label: 'Non-brand' },
            { value: 'brand', label: 'Brand' },
          ]}
        />

        <Input
          label="Description (optional)"
          placeholder="Anything else we should know?"
          multiline
          value={parcel.description}
          onChangeText={value => setParcel({ ...parcel, description: value })}
          style={styles.descriptionInput}
        />

        <Button title="Add to my list" onPress={addParcel} loading={submitting} />
      </BottomSheet>
    </View>
  );
};

const emptyParcel = () => ({
  productName: '',
  productLink: '',
  cartonQuantity: '',
  productQuantity: '',
  totalCost: '',
  totalCbm: '',
  contains: 'none',
  brandType: 'non-brand',
  description: '',
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  weightInput: { marginTop: spacing.md },
  muted: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  quote: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  quoteLabel: { fontSize: typography.size.xs, color: colors.primary },
  quoteValue: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  quoteMeta: { fontSize: typography.size.xs, color: colors.textSecondary },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addLink: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  parcelInfo: { flex: 1 },
  parcelName: { fontSize: typography.size.sm, color: colors.text },
  parcelMeta: { fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 },
  descriptionInput: { minHeight: 80 },
  bar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

export default ShipForMeScreen;
