import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { BottomActionBar, PressableScale } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { initSslCommerz } from '../../api';
import {
  uploadImageRechargeRequest,
  uploadPaymentRequestApi,
  uploadPaymentRequestApi2,
  uploadPaymentRequest2,
} from '../../firebase/firebase.utils';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { generateBookingId } from '../../utils/ids';
import { BANK_METHOD, buildExistingPayment, buildNewOrderPayment } from '../../utils/order';
import { minimumPayment, validatePayAmount } from '../../utils/dashboard';
import { updateSingleOrderApiRedux } from '../../actions';
import { formatPrice } from '../../utils/format';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify';
import { BANK_DETAILS, DEFAULTS, FEATURES } from '../../constants/config';
import { ROUTES } from '../../navigation/routes';
import { leaveToRoute } from '../../navigation/leaveModal';
import { asText, orderThumbs } from '../dashboard/components/orderHelpers';
import { colors, radius, spacing, typography } from '../../theme';
import { thumbImage } from '../../utils/imageUrl';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

// The website's own payment logos (assets/images/portfolio/payment-logo).
const CITY_BANK_LOGO = require('../../../assets/payment/city-bank.png');
const BKASH_LOGO = require('../../../assets/payment/bkash.png');
const INK = '#1f2340';

/**
 * As on the website, payment is a direct deposit: to ALG's City Bank account
 * or to its bKash merchant number, then a screenshot of the transfer. (The
 * web's bKash gateway and card tabs are switched off; card stays behind
 * FEATURES.cardPayments.)
 */
const METHODS = {
  CITY: 'city',
  BKASH: 'bkash',
  CARD: 'card',
};

/** The payment record's `method`, as the web's deposit form saves it. */
const DEPOSIT_METHOD_NAME = { [METHODS.CITY]: BANK_METHOD, [METHODS.BKASH]: 'Bkash' };

/** Which pipeline the payment belongs to, set by the calling screen. */
export const PAYMENT_TARGETS = {
  ORDER: 'order', // ordersApi — D2D orders
  PRODUCT_REQUEST: 'productRequest', // bookingRequest — buy-for-me
};

/**
 * Payment for a just-placed order (`newOrder`), or for an existing order or
 * product request from My orders (`existing`), where — as on the web — the
 * customer chooses how much to pay now within the web's limits.
 *
 * The web app had four near-identical copies of this modal, one per flow. Here
 * it is one screen that takes a `target` telling it which Firestore collection
 * to write the payment request against.
 *
 * Methods, matching the site's Direct deposit tab: City Bank or the bKash
 * merchant number — transfer manually, upload the slip, an admin verifies it.
 * Card (SSLCommerz in a WebView) exists but is off, as on the web.
 */
const PaymentSheetScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka) || 0;
  useDarkStatusBar();
  // The pay bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const {
    amount: baseAmount = 0,
    target = PAYMENT_TARGETS.ORDER,
    orders = [],
    productRequestArray = [],
    offer = '0%',
    returnRoute,
    // Set right after checkout: the web's new-order payment (see buildNewOrderPayment).
    newOrder,
    // From My orders: `{ kind: 'order' | 'request', total, paid, due }`.
    existing,
  } = route.params || {};

  const [method, setMethod] = useState(METHODS.CITY);
  const isDeposit = method !== METHODS.CARD;
  const depositMethod = DEPOSIT_METHOD_NAME[method] || BANK_METHOD;
  // What to pay now on an existing order — the full due amount to start with.
  const [payNow, setPayNow] = useState(existing ? String(existing.due) : '');
  const records = existing?.kind === 'request' ? productRequestArray : orders;

  const amount = newOrder ? newOrder.payableTotal : existing ? parseInt(payNow, 10) || 0 : baseAmount;
  // Both deposit methods follow the web's deposit rules.
  const payMethod = 'deposit';
  const minimum = existing ? minimumPayment({ kind: existing.kind, method: payMethod, due: existing.due, paid: existing.paid }) : 0;
  const amountError = existing
    ? validatePayAmount({ amount, due: existing.due, minimum, kind: existing.kind, method: payMethod })
    : null;
  const checkAmount = () => {
    if (!amountError) return true;
    notifyError(amountError);
    return false;
  };

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
    if (!checkAmount()) return;
    // As on the web, the slip or transfer screenshot is what's required;
    // a cash deposit at a branch has no transaction ID.
    if (!slip) {
      notifyError('Please upload your transactions copy.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await uploadImageRechargeRequest(slip);
      if (!imageUrl) {
        notifyError('The slip could not be uploaded. Please try again.');
        return;
      }

      let stored;
      if (newOrder) {
        stored = await uploadPaymentRequestApi({
          ...buildNewOrderPayment({ newOrder, orders, currentUser, method: depositMethod }),
          imageUrl,
          transactionId: transactionId.trim(),
          senderNumber: senderNumber.trim(),
        });
        if (!stored) return;
        notifySuccess('Payment submitted', 'Our team member will confirm it soon.');
        leaveToRoute(navigation, returnRoute);
        return;
      }

      if (existing) {
        const paymentObj = {
          ...buildExistingPayment({ existing, records, currentUser, method: depositMethod, payableTotal: amount, taka }),
          imageUrl,
          transactionId: transactionId.trim(),
          senderNumber: senderNumber.trim(),
        };
        if (existing.kind === 'request') {
          stored = await uploadPaymentRequest2(paymentObj);
          if (stored) dispatch({ type: 'UPDATE_BOOKINGS_OF_SINGLE_USER', payload: stored });
        } else {
          stored = await uploadPaymentRequestApi2(paymentObj);
          // Mirror what was saved, so the order shows "awaiting confirmation" and no Pay button.
          if (stored) dispatch(updateSingleOrderApiRedux({ ...orders[0], paymentStatus: 'pending' }));
        }
        if (!stored) return;
        notifySuccess('Payment submitted', 'Our team member will confirm it soon.');
        leaveToRoute(navigation, returnRoute);
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
        method: depositMethod,
        status: 'pending',
        time: Date.now(),
        offer,
        pendingOrders: orders,
        productRequestArray,
      };

      if (target === PAYMENT_TARGETS.PRODUCT_REQUEST) {
        stored = await uploadPaymentRequest2(paymentObj);
      } else if (offer && offer !== '0%') {
        // The discounted advance-payment path also adjusts the order total.
        stored = await uploadPaymentRequestApi(paymentObj);
      } else {
        stored = await uploadPaymentRequestApi2(paymentObj);
      }
      // The upload helpers report their own failure and return nothing.
      if (!stored) return;

      notifySuccess(
        'Payment submitted',
        'Our team will verify your transfer shortly.',
      );
      leaveToRoute(navigation, returnRoute);
    } catch (error) {
      notifyError(error, 'Could not submit your payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const payWithCard = async () => {
    if (!checkAmount()) return;
    setSubmitting(true);
    try {
      const redirectUrl = await initSslCommerz({
        name: currentUser?.displayName || 'ALG customer',
        amount: cardAmount,
        // The web posts "d2d" for order payments.
        from: target === PAYMENT_TARGETS.ORDER ? 'd2d' : target,
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

  const methodCards = [
    {
      key: METHODS.CITY,
      label: 'City Bank',
      hint: 'Direct deposit',
      logo: CITY_BANK_LOGO,
      icon: 'business',
      colors: ['#4fd1a5', '#059669'],
    },
    {
      key: METHODS.BKASH,
      label: 'bKash',
      hint: 'Direct deposit',
      logo: BKASH_LOGO,
      icon: 'phone-portrait',
      colors: ['#f472b6', '#db2777'],
    },
    {
      key: METHODS.CARD,
      label: 'Card',
      hint: `+${DEFAULTS.sslCommerzFeePercent}% fee`,
      icon: 'card',
      colors: ['#7aa8ff', '#4f46e5'],
    },
  ].filter(card => card.key !== METHODS.CARD || FEATURES.cardPayments);

  const charge = method === METHODS.CARD ? cardAmount : amount;
  const cta = isDeposit
    ? { label: 'Submit deposit', icon: 'cloud-upload', onPress: submitDeposit }
    : { label: 'Pay by card', icon: 'card', onPress: payWithCard };

  const copy = (label, value) => {
    Clipboard.setString(`${value}`);
    notifyInfo(`${label} copied`, `${value}`);
  };

  // The web needs only the slip; the transaction ID is an optional extra.
  const depositSteps = [
    { done: true, label: 'Send the money' },
    { done: Boolean(slip), label: 'Upload the slip' },
    { done: Boolean(slip) && !amountError, label: 'Submit' },
  ];

  // What this payment covers, shown as a compact list under the amount.
  const payingFor = (records.length ? records : [...orders, ...productRequestArray]).slice(0, 4).map((record, index) => ({
    key: `${record?.orderId || record?.bookingId || index}`,
    thumb: orderThumbs(record, 1)[0] || (typeof record?.imageUrl === 'string' ? record.imageUrl : ''),
    title: asText(record?.shopName) || asText(record?.productType) || asText(record?.store) || 'Order',
    ref: `#${asText(record?.orderId || record?.bookingId)}`,
  }));
  const moreCount = Math.max(0, (records.length || orders.length + productRequestArray.length) - payingFor.length);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.text} />
          </PressableScale>
          <View style={styles.headerIcon}>
            <Icon name="wallet" size={20} color={colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.headerSub}>Choose how you'd like to pay</Text>
          </View>
          <View style={styles.secureChip}>
            <Icon name="lock-closed" size={11} color="#059669" />
            <Text style={styles.secureText}>Secure</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {/* Amount */}
        <Animated.View entering={FadeInDown.duration(420)}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.amountCard}>
            <View style={[styles.amountBlob, styles.amountBlobA]} />
            <View style={[styles.amountBlob, styles.amountBlobB]} />
            <Text style={styles.amountLabel}>
              {newOrder ? `Pay now (${newOrder.payNowPercent})` : existing ? 'Paying now' : 'Amount due'}
            </Text>
            <Animated.Text key={charge} entering={FadeIn.duration(260)} style={styles.amountValue}>
              {formatPrice(charge, symbol)}
            </Animated.Text>
            {charge > amount ? (
              <Text style={styles.amountSub}>
                {formatPrice(amount, symbol)} + {formatPrice(charge - amount, symbol)} gateway fee
              </Text>
            ) : null}
            {newOrder && newOrder.offer !== '0%' ? (
              <View style={styles.offerChip}>
                <Icon name="gift" size={12} color={colors.primary} />
                <Text style={styles.offerText}>
                  {newOrder.offer} discount added · order total {formatPrice(newOrder.total, symbol)}
                </Text>
              </View>
            ) : null}
            {orders.length > 0 ? (
              <Text style={styles.amountOrders} numberOfLines={1}>
                For {orders.length === 1 ? `order #${orders[0].orderId}` : `${orders.length} orders`}
              </Text>
            ) : null}
          </LinearGradient>
        </Animated.View>

        {/* What this payment covers */}
        {payingFor.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(40).duration(380)} style={styles.coverCard}>
            <View style={styles.coverTop}>
              <View style={styles.coverIcon}>
                <Icon name="bag-check" size={15} color="#4f46e5" />
              </View>
              <Text style={styles.coverTitle}>Paying for</Text>
              <Text style={styles.coverCount}>
                {payingFor.length + moreCount} {payingFor.length + moreCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
            {payingFor.map(row => (
              <View key={row.key} style={styles.coverRow}>
                {row.thumb ? (
                  <Image source={{ uri: thumbImage(row.thumb) }} style={styles.coverThumb} />
                ) : (
                  <View style={[styles.coverThumb, styles.coverThumbEmpty]}>
                    <Icon name="cube-outline" size={16} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.coverText}>
                  <Text style={styles.coverName} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.coverRef} numberOfLines={1}>{row.ref}</Text>
                </View>
              </View>
            ))}
            {moreCount > 0 ? <Text style={styles.coverMore}>+{moreCount} more</Text> : null}
          </Animated.View>
        ) : null}

        {/* Existing order: choose how much to pay now, within the web's limits */}
        {existing ? (
          <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.payNowCard}>
            <View style={styles.payNowTop}>
              <Text style={styles.payNowTitle}>Amount to pay now</Text>
              <Text style={styles.payNowDue}>Due {formatPrice(existing.due, symbol)}</Text>
            </View>
            <View style={[styles.payNowField, amountError && styles.payNowFieldError]}>
              <Text style={styles.payNowCurrency}>{symbol || 'Tk'}</Text>
              <TextInput
                value={payNow}
                onChangeText={text => setPayNow(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.payNowInput}
                accessibilityLabel="Amount to pay now"
              />
            </View>
            <View style={styles.payNowChips}>
              {[
                { label: 'Minimum', value: minimum },
                { label: '80%', value: Math.ceil((existing.due * 80) / 100) },
                { label: 'Full due', value: existing.due },
              ]
                .filter((chip, index, all) => chip.value >= minimum && all.findIndex(c => c.value === chip.value) === index)
                .map(chip => {
                  const on = amount === chip.value;
                  return (
                    <PressableScale key={chip.label} onPress={() => setPayNow(String(chip.value))} scaleTo={0.94} style={[styles.payNowChip, on && styles.payNowChipOn]}>
                      <Text style={[styles.payNowChipText, on && styles.payNowChipTextOn]}>
                        {chip.label} · {formatPrice(chip.value, symbol)}
                      </Text>
                    </PressableScale>
                  );
                })}
            </View>
            <Text style={[styles.payNowHint, amountError && styles.payNowHintError]}>
              {amountError ||
                (existing.paid > 0
                  ? `Already paid ${formatPrice(existing.paid, symbol)} — pay any amount up to the due.`
                  : existing.kind === 'order' && isDeposit
                    ? 'A first bank-deposit payment must cover the full due amount.'
                    : 'Your first payment must be at least 60% of the due amount.')}
            </Text>
          </Animated.View>
        ) : null}

        {/* Methods */}
        <Text style={styles.sectionTitle}>Direct deposit</Text>
        <Text style={styles.sectionSub}>Choose where you'll deposit, then upload the slip or screenshot</Text>
        <View style={styles.methods}>
          {methodCards.map((card, index) => {
            const selected = method === card.key;
            return (
              <Animated.View key={card.key} entering={FadeInDown.delay(80 + index * 60).duration(380)} style={styles.methodWrap}>
                <PressableScale
                  onPress={() => setMethod(card.key)}
                  scaleTo={0.95}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.method, selected && styles.methodOn]}>
                  {selected ? (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.methodTick}>
                      <Icon name="checkmark" size={11} color={colors.white} />
                    </Animated.View>
                  ) : null}
                  {card.logo ? (
                    <View style={styles.methodLogoWrap}>
                      <Image source={card.logo} style={styles.methodLogo} resizeMode="contain" />
                    </View>
                  ) : (
                    <LinearGradient colors={card.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.methodIcon}>
                      <Icon name={card.icon} size={20} color={colors.white} />
                    </LinearGradient>
                  )}
                  <Text style={[styles.methodLabel, selected && styles.methodLabelOn]}>{card.label}</Text>
                  <Text style={styles.methodHint}>{card.hint}</Text>
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        {/* Method details */}
        <Animated.View key={method} entering={FadeInDown.duration(320)} layout={LinearTransition.duration(260)} style={styles.panel}>
          {isDeposit ? (
            <>
              <View style={styles.progress}>
                {depositSteps.map((step, index) => (
                  <React.Fragment key={step.label}>
                    {index > 0 ? <View style={[styles.progressLine, step.done && styles.progressLineOn]} /> : null}
                    <View style={styles.progressStep}>
                      <View style={[styles.progressDot, step.done && styles.progressDotOn]}>
                        {step.done ? (
                          <Icon name="checkmark" size={11} color={colors.white} />
                        ) : (
                          <Text style={styles.progressNumber}>{index + 1}</Text>
                        )}
                      </View>
                      <Text style={[styles.progressLabel, step.done && styles.progressLabelOn]}>{step.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              <Text style={styles.panelTitle}>1. Send {formatPrice(amount, symbol)} to</Text>
              {method === METHODS.BKASH ? (
                <View style={styles.bankCard}>
                  <LinearGradient colors={['#e2136e', '#a3094f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.bankTop}>
                    <View>
                      <Text style={styles.bankName}>ALG LIMITED</Text>
                      <Text style={styles.bankKind}>bKash · Merchant account</Text>
                    </View>
                    <View style={styles.bankLogoWrap}>
                      <Image source={BKASH_LOGO} style={styles.bankLogo} resizeMode="contain" />
                    </View>
                  </View>
                  <CopyRow label="bKash merchant number" value={BANK_DETAILS.bkashMerchant} onCopy={copy} />
                  <View style={styles.bkashSteps}>
                    {[
                      'Open bKash and tap Make Payment',
                      `Enter ${BANK_DETAILS.bkashMerchant} and the amount above`,
                      'Screenshot the confirmation and upload it below',
                    ].map((step, index) => (
                      <View key={step} style={styles.bkashStep}>
                        <View style={styles.bkashStepDot}>
                          <Text style={styles.bkashStepNumber}>{index + 1}</Text>
                        </View>
                        <Text style={styles.bkashStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.bankCard}>
                  <LinearGradient colors={['#1f2a5c', '#2f3e9e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.bankTop}>
                    <View>
                      <Text style={styles.bankName}>ALG LIMITED</Text>
                      <Text style={styles.bankKind}>City Bank · VIP Road branch</Text>
                    </View>
                    <View style={styles.bankLogoWrap}>
                      <Image source={CITY_BANK_LOGO} style={styles.bankLogo} resizeMode="contain" />
                    </View>
                  </View>
                  <CopyRow label="City Bank A/C" value={BANK_DETAILS.cityBankAccount} onCopy={copy} />
                  <CopyRow label="Branch" value={BANK_DETAILS.cityBankBranch} onCopy={copy} />
                  <CopyRow label="Routing" value={BANK_DETAILS.cityBankRouting} onCopy={copy} />
                </View>
              )}
              <Text style={styles.depositHint}>নিন্মোক্ত একাউন্টতে জমা/ট্রান্সফার করুন, তারপর স্লিপ বা স্ক্রিনশট আপলোড করুন।</Text>

              <Text style={styles.panelTitle}>2. Transfer details (optional)</Text>
              <Field
                icon="receipt-outline"
                placeholder="Transaction ID (optional)"
                autoCapitalize="characters"
                value={transactionId}
                onChangeText={setTransactionId}
              />
              <Field
                icon="call-outline"
                placeholder="Sender number (optional)"
                keyboardType="phone-pad"
                maxLength={11}
                value={senderNumber}
                onChangeText={setSenderNumber}
              />

              <Text style={styles.panelTitle}>3. Upload the transfer screenshot</Text>
              {slip ? (
                <Animated.View entering={FadeIn.duration(260)} style={styles.slipCard}>
                  <Image source={{ uri: slip.uri }} style={styles.slipPreview} />
                  <View style={styles.slipBadge}>
                    <Icon name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.slipBadgeText}>Attached</Text>
                  </View>
                  <View style={styles.slipActions}>
                    <PressableScale onPress={pickSlip} scaleTo={0.92} style={styles.slipAction}>
                      <Icon name="swap-horizontal" size={14} color={colors.text} />
                      <Text style={styles.slipActionText}>Replace</Text>
                    </PressableScale>
                    <PressableScale onPress={() => setSlip(null)} scaleTo={0.92} style={styles.slipAction}>
                      <Icon name="trash-outline" size={14} color={colors.primary} />
                      <Text style={[styles.slipActionText, styles.slipRemove]}>Remove</Text>
                    </PressableScale>
                  </View>
                </Animated.View>
              ) : (
                <PressableScale onPress={pickSlip} scaleTo={0.97} style={styles.slipPicker}>
                  <View style={styles.slipIcon}>
                    <Icon name="cloud-upload" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.slipLabel}>Tap to attach the screenshot</Text>
                  <Text style={styles.slipHint}>জমার ছবি/স্ক্রিনশট আপলোড করুন</Text>
                </PressableScale>
              )}
            </>
          ) : null}

          {method === METHODS.CARD ? (
            <>
              <View style={styles.gatewayHero}>
                <LinearGradient colors={['#7aa8ff', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gatewayIcon}>
                  <Icon name="card" size={26} color={colors.white} />
                </LinearGradient>
                <Text style={styles.gatewayTitle}>Pay by card</Text>
                <Text style={styles.gatewayBody}>
                  Visa, Mastercard, Amex and local cards through SSLCommerz's secure checkout.
                </Text>
                <View style={styles.cardBrands}>
                  {['VISA', 'Mastercard', 'AMEX', 'Nexus'].map(brand => (
                    <View key={brand} style={styles.brand}>
                      <Text style={styles.brandText}>{brand}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <FeeBreakdown
                amount={amount}
                total={cardAmount}
                label={`Gateway fee (${DEFAULTS.sslCommerzFeePercent}%)`}
                symbol={symbol}
              />
            </>
          ) : null}
        </Animated.View>

        <View style={styles.trust}>
          {[
            { icon: 'shield-checkmark', label: 'Verified by our team' },
            { icon: 'lock-closed', label: 'Encrypted' },
            { icon: 'chatbubbles', label: '24/7 support' },
          ].map(item => (
            <View key={item.label} style={styles.trustItem}>
              <Icon name={item.icon} size={13} color={colors.primary} />
              <Text style={styles.trustText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomActionBar style={styles.bar}>
        <View style={styles.barTotals}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {isDeposit ? `Direct deposit · ${method === METHODS.BKASH ? 'bKash' : 'City Bank'}` : 'Card total'}
          </Text>
          <Animated.Text key={charge} entering={FadeIn} style={styles.barValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatPrice(charge, symbol)}
          </Animated.Text>
        </View>
        <PressableScale onPress={submitting ? undefined : cta.onPress} disabled={submitting} scaleTo={0.95} style={styles.ctaShadow}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name={cta.icon} size={16} color={colors.white} />
                <Text style={styles.ctaText}>{cta.label}</Text>
              </>
            )}
          </LinearGradient>
        </PressableScale>
      </BottomActionBar>
    </KeyboardAvoidingView>
  );
};

/** A bank detail on the account card, with a copy button. */
const CopyRow = ({ label, value, onCopy }) => (
  <View style={styles.copyRow}>
    <View style={styles.copyText}>
      <Text style={styles.copyLabel}>{label}</Text>
      <Text style={styles.copyValue} selectable>
        {value}
      </Text>
    </View>
    <PressableScale onPress={() => onCopy(label, value)} scaleTo={0.88} hitSlop={6} style={styles.copyButton} accessibilityLabel={`Copy ${label}`}>
      <Icon name="copy-outline" size={14} color={colors.white} />
      <Text style={styles.copyButtonText}>Copy</Text>
    </PressableScale>
  </View>
);

/** Text field in the auth / checkout style. */
const Field = ({ icon, style, ...inputProps }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused, style]}>
      <Icon name={icon} size={17} color={focused ? colors.primary : colors.textSecondary} />
      <TextInput
        {...inputProps}
        style={styles.fieldInput}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
};

/** Amount, gateway fee and total for bKash / card. */
const FeeBreakdown = ({ amount, total, label, symbol }) => (
  <View style={styles.fees}>
    <View style={styles.feeRow}>
      <Text style={styles.feeLabel}>Amount</Text>
      <Text style={styles.feeValue}>{formatPrice(amount, symbol)}</Text>
    </View>
    <View style={styles.feeRow}>
      <Text style={styles.feeLabel}>{label}</Text>
      <Text style={styles.feeValue}>{formatPrice(total - amount, symbol)}</Text>
    </View>
    <View style={[styles.feeRow, styles.feeTotal]}>
      <Text style={styles.feeTotalLabel}>You pay</Text>
      <Text style={styles.feeTotalValue}>{formatPrice(total, symbol)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
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
  headerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.text },
  headerSub: { marginTop: 1, fontSize: typography.size.xs, color: colors.textSecondary },
  secureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#d1fae5',
  },
  secureText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#047857' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  coverCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  coverTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  coverIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2ff' },
  coverTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  coverCount: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.textMuted },
  coverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  coverThumb: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f1f5' },
  coverThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  coverText: { flex: 1, marginLeft: 10 },
  coverName: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  coverRef: { marginTop: 1, fontSize: 11, color: colors.textMuted },
  coverMore: { marginTop: 4, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  payNowCard: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  payNowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  payNowTitle: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  payNowDue: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  payNowField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  payNowFieldError: { borderColor: '#fda4af', backgroundColor: '#fff1f2' },
  payNowCurrency: { marginRight: 8, fontSize: typography.size.md, fontWeight: '800', color: colors.textSecondary },
  payNowInput: { flex: 1, paddingVertical: 0, fontSize: 22, fontWeight: '800', color: colors.text },
  payNowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  payNowChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#f3f3f6' },
  payNowChipOn: { backgroundColor: colors.primary },
  payNowChipText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.textSecondary },
  payNowChipTextOn: { color: colors.white },
  payNowHint: { marginTop: 10, fontSize: typography.size.xs, lineHeight: 17, color: colors.textMuted },
  payNowHintError: { color: '#e11d48', fontWeight: typography.weight.bold },
  amountCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    overflow: 'hidden',
  },
  amountBlob: { position: 'absolute', borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  amountBlobA: { width: 160, height: 160, top: -70, right: -40 },
  amountBlobB: { width: 110, height: 110, bottom: -50, left: -30 },
  amountLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: 'rgba(255,255,255,0.9)' },
  amountValue: { marginTop: 4, fontSize: 36, fontWeight: '800', color: colors.white },
  amountSub: { marginTop: 2, fontSize: typography.size.xs, color: 'rgba(255,255,255,0.85)' },
  offerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  offerText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  amountOrders: { marginTop: 10, fontSize: typography.size.xs, color: 'rgba(255,255,255,0.8)' },
  sectionSub: { marginTop: -6, marginBottom: 12, fontSize: typography.size.xs + 1, color: colors.textMuted },
  sectionTitle: { marginTop: spacing.lg, marginBottom: 10, fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  methods: { flexDirection: 'row', gap: 10 },
  methodWrap: { flex: 1 },
  method: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  methodOn: {
    borderColor: colors.primary,
    backgroundColor: '#fff8f6',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  methodTick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  methodLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  methodLogo: { width: 48, height: 48 },
  methodLabel: { marginTop: 8, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  methodLabelOn: { color: colors.primary },
  methodHint: { marginTop: 2, fontSize: 10.5, color: colors.textMuted },
  panel: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  progress: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  progressStep: { alignItems: 'center', width: 84 },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#d9d9e3',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotOn: { borderColor: '#059669', backgroundColor: '#059669' },
  progressNumber: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
  progressLabel: { marginTop: 4, fontSize: 10, textAlign: 'center', color: colors.textMuted },
  progressLabelOn: { color: '#047857', fontWeight: typography.weight.bold },
  progressLine: { flex: 1, height: 2, marginTop: 10, marginHorizontal: -28, backgroundColor: '#e4e4ec' },
  progressLineOn: { backgroundColor: '#059669' },
  panelTitle: { marginTop: 4, marginBottom: 10, fontSize: typography.size.sm + 1, fontWeight: '800', color: colors.text },
  bkashSteps: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.3)', gap: 8 },
  bkashStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bkashStepDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  bkashStepNumber: { fontSize: 10.5, fontWeight: '800', color: colors.white },
  bkashStepText: { flex: 1, fontSize: typography.size.xs + 1, color: 'rgba(255,255,255,0.92)' },
  depositHint: { marginTop: -6, marginBottom: 14, fontSize: typography.size.xs, lineHeight: 17, color: colors.textMuted },
  bankCard: { marginBottom: 14, padding: 14, borderRadius: 18, overflow: 'hidden' },
  bankTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bankName: { fontSize: typography.size.sm, fontWeight: '800', letterSpacing: 1.5, color: colors.white },
  bankKind: { marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  bankLogoWrap: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  bankLogo: { width: 40, height: 40 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  copyText: { flex: 1 },
  copyLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)' },
  copyValue: { marginTop: 1, fontSize: typography.size.md, fontWeight: '800', letterSpacing: 1, color: colors.white },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  copyButtonText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.white },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  fieldInput: { flex: 1, paddingVertical: 0, fontSize: typography.size.sm + 1, color: colors.text },
  slipPicker: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#f3b4a4',
    backgroundColor: '#fff8f6',
  },
  slipIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  slipLabel: { marginTop: 8, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  slipHint: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  slipCard: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#f1f1f5' },
  slipPreview: { width: '100%', height: 180 },
  slipBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  slipBadgeText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#047857' },
  slipActions: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: colors.white },
  slipAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f3f6',
  },
  slipActionText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.text },
  slipRemove: { color: colors.primary },
  gatewayHero: { alignItems: 'center', paddingVertical: 6 },
  gatewayIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gatewayTitle: { marginTop: 10, fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  gatewayBody: { marginTop: 4, fontSize: typography.size.sm, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  cardBrands: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  brand: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e4e4ec' },
  brandText: { fontSize: 10.5, fontWeight: '800', color: colors.textSecondary },
  fees: { marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: '#f7f7fa' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
  feeValue: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  feeTotal: { marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dcdce4' },
  feeTotalLabel: { fontSize: typography.size.md, fontWeight: '800', color: colors.text },
  feeTotalValue: { fontSize: typography.size.md, fontWeight: '800', color: colors.primary },
  trust: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: spacing.lg },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustText: { marginLeft: 4, fontSize: typography.size.xs, color: colors.textSecondary },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTotals: { flex: 1 },
  barLabel: { fontSize: typography.size.xxs + 1, color: colors.textMuted },
  barValue: { fontSize: typography.size.lg + 1, fontWeight: '800', color: colors.primary },
  ctaShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, minWidth: 160, paddingHorizontal: 18, borderRadius: 16 },
  ctaText: { color: colors.white, fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold },
});

export default PaymentSheetScreen;
