import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { Button, Input, SegmentedControl } from '../../components';
import { createBkashPayment, initSslCommerz } from '../../api';
import {
  uploadImageRechargeRequest,
  uploadPaymentRequestApi,
  uploadPaymentRequestApi2,
  uploadPaymentRequest2,
  uploadShipmentPaymentRequest,
} from '../../firebase/firebase.utils';
import { useAuth } from '../../hooks';
import { generateBookingId } from '../../utils/ids';
import { formatPrice } from '../../utils/format';
import { notifyError, notifySuccess } from '../../utils/notify';
import { BANK_DETAILS, DEFAULTS } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

const METHODS = {
  DEPOSIT: 'deposit',
  MOBILE: 'mobile',
  CARD: 'card',
};

/** Which pipeline the payment belongs to, set by the calling screen. */
export const PAYMENT_TARGETS = {
  ORDER: 'order', // ordersApi — D2D orders
  PRODUCT_REQUEST: 'productRequest', // bookingRequest — buy-for-me
  SHIPMENT: 'shipment', // shipForMe — ship-for-me
};

/**
 * Payment for an order, a product request or a shipment booking.
 *
 * The web app had four near-identical copies of this modal, one per flow. Here
 * it is one screen that takes a `target` telling it which Firestore collection
 * to write the payment request against.
 *
 * Three methods, matching the site:
 *  - Direct deposit: transfer manually, upload the slip, an admin verifies it
 *  - Mobile banking: bKash tokenized checkout in a WebView
 *  - Card: SSLCommerz hosted checkout in a WebView (2.5% fee, as on the web)
 */
const PaymentSheetScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUser } = useAuth();
  const symbol = useSelector(state => state.data.symbol);

  const {
    amount = 0,
    target = PAYMENT_TARGETS.ORDER,
    orders = [],
    productRequestArray = [],
    offer = '0%',
    returnRoute,
  } = route.params || {};

  const [method, setMethod] = useState(METHODS.DEPOSIT);
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [slip, setSlip] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const cardAmount = useMemo(
    () => Math.round(amount * (1 + DEFAULTS.sslCommerzFeePercent / 100)),
    [amount],
  );

  const pickSlip = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (asset) setSlip(asset);
  };

  /** Files a manual payment request against the right collection. */
  const submitDeposit = async () => {
    if (!transactionId.trim()) {
      notifyError('Please enter the transaction ID.');
      return;
    }
    if (!slip) {
      notifyError('Please attach a screenshot of your transfer.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await uploadImageRechargeRequest(slip);
      if (!imageUrl) {
        notifyError('The slip could not be uploaded. Please try again.');
        return;
      }

      const paymentId = generateBookingId();
      const paymentObj = {
        paymentId,
        userId: currentUser?.id,
        displayName: currentUser?.displayName,
        amount,
        transactionId: transactionId.trim(),
        senderNumber: senderNumber.trim(),
        imageUrl,
        method: 'Direct Deposit',
        status: 'pending',
        time: Date.now(),
        offer,
        pendingOrders: orders,
        productRequestArray,
      };

      if (target === PAYMENT_TARGETS.SHIPMENT) {
        await uploadShipmentPaymentRequest(paymentObj);
      } else if (target === PAYMENT_TARGETS.PRODUCT_REQUEST) {
        await uploadPaymentRequest2(paymentObj);
      } else if (offer && offer !== '0%') {
        // The discounted advance-payment path also adjusts the order total.
        await uploadPaymentRequestApi(paymentObj);
      } else {
        await uploadPaymentRequestApi2(paymentObj);
      }

      notifySuccess(
        'Payment submitted',
        'Our team will verify your transfer shortly.',
      );
      if (returnRoute) navigation.replace(returnRoute);
      else navigation.goBack();
    } catch (error) {
      notifyError(error, 'Could not submit your payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const payWithBkash = async () => {
    setSubmitting(true);
    try {
      const data = await createBkashPayment({
        amount,
        userId: currentUser?.id,
        displayName: currentUser?.displayName,
        orders,
        productRequestArray,
        target,
      });

      if (!data?.bkashURL) {
        notifyError('bKash did not return a checkout link. Please try again.');
        return;
      }

      navigation.replace(ROUTES.PAYMENT_WEBVIEW, {
        url: data.bkashURL,
        onCompleteRoute: returnRoute,
      });
    } catch (error) {
      notifyError(error, 'Could not start the bKash payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const payWithCard = async () => {
    setSubmitting(true);
    try {
      const redirectUrl = await initSslCommerz({
        name: currentUser?.displayName || 'ALG customer',
        amount: cardAmount,
        from: target,
      });

      const url = typeof redirectUrl === 'string' ? redirectUrl : redirectUrl?.url;
      if (!url) {
        notifyError('The card gateway did not return a checkout link.');
        return;
      }

      navigation.replace(ROUTES.PAYMENT_WEBVIEW, {
        url,
        onCompleteRoute: returnRoute,
      });
    } catch (error) {
      notifyError(error, 'Could not start the card payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount due</Text>
        <Text style={styles.amountValue}>{formatPrice(amount, symbol)}</Text>
      </View>

      <SegmentedControl
        scrollable
        value={method}
        onChange={setMethod}
        segments={[
          { value: METHODS.DEPOSIT, label: 'Direct deposit' },
          { value: METHODS.MOBILE, label: 'bKash' },
          { value: METHODS.CARD, label: 'Card' },
        ]}
        style={styles.methods}
      />

      {method === METHODS.DEPOSIT ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Send the money, then tell us</Text>

          <View style={styles.bankBox}>
            <BankRow label="City Bank A/C" value={BANK_DETAILS.cityBankAccount} />
            <BankRow label="Routing" value={BANK_DETAILS.cityBankRouting} />
            <BankRow label="bKash merchant" value={BANK_DETAILS.bkashMerchant} />
          </View>

          <Input
            label="Transaction ID"
            placeholder="e.g. 8N7A6B5C4D"
            autoCapitalize="characters"
            value={transactionId}
            onChangeText={setTransactionId}
          />
          <Input
            label="Sender number (optional)"
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            value={senderNumber}
            onChangeText={setSenderNumber}
          />

          <Pressable style={styles.slipPicker} onPress={pickSlip}>
            {slip ? (
              <Image source={{ uri: slip.uri }} style={styles.slipPreview} />
            ) : (
              <>
                <Icon name="cloud-upload-outline" size={24} color={colors.primary} />
                <Text style={styles.slipLabel}>Attach transfer screenshot</Text>
              </>
            )}
          </Pressable>

          <Button
            title="Submit payment"
            onPress={submitDeposit}
            loading={submitting}
            style={styles.submit}
          />
        </View>
      ) : null}

      {method === METHODS.MOBILE ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pay with bKash</Text>
          <Text style={styles.panelBody}>
            You'll complete the payment on bKash's secure checkout, then come
            straight back here.
          </Text>
          <Button
            title={`Pay ${formatPrice(amount, symbol)} with bKash`}
            onPress={payWithBkash}
            loading={submitting}
            style={styles.submit}
          />
        </View>
      ) : null}

      {method === METHODS.CARD ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pay by card</Text>
          <Text style={styles.panelBody}>
            Card payments carry a {DEFAULTS.sslCommerzFeePercent}% gateway fee.
          </Text>

          <View style={styles.feeRow}>
            <Text style={styles.rowLabel}>Order amount</Text>
            <Text style={styles.rowValue}>{formatPrice(amount, symbol)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.rowLabel}>Gateway fee</Text>
            <Text style={styles.rowValue}>{formatPrice(cardAmount - amount, symbol)}</Text>
          </View>
          <View style={[styles.feeRow, styles.feeTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(cardAmount, symbol)}</Text>
          </View>

          <Button
            title="Continue to card payment"
            onPress={payWithCard}
            loading={submitting}
            style={styles.submit}
          />
        </View>
      ) : null}
    </ScrollView>
  );
};

const BankRow = ({ label, value }) => (
  <View style={styles.bankRow}>
    <Text style={styles.bankLabel}>{label}</Text>
    <Text style={styles.bankValue} selectable>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  amountLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  amountValue: {
    marginTop: spacing.xs,
    fontSize: typography.size.xxxl,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  methods: { marginTop: spacing.md },
  panel: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  panelTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  panelBody: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  bankBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  bankLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  bankValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  slipPicker: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slipPreview: { width: '100%', height: '100%' },
  slipLabel: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  submit: { marginTop: spacing.md },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  feeTotal: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rowLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.size.sm, color: colors.text },
  totalLabel: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  totalValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
});

export default PaymentSheetScreen;
