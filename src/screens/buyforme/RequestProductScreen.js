import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import {
  BottomActionBar,
  PressableScale,
  ScreenHeader,
} from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import AuthField from '../auth/components/AuthField';
import { setProductRequestRedux } from '../../actions';
import { getAllD2DRates, uploadImageProduct } from '../../firebase/firebase.utils';
import { useAuth, useAuthGuard, useDarkStatusBar } from '../../hooks';
import { BUCKETS } from '../../utils/dashboard';
import { notifyError, notifyInfo } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';
import {
  FieldLabel,
  GradientButton,
  PhotoPicker,
  SectionCard,
  StepStrip,
  TextArea,
  enter,
} from './components/ServiceUI';
import {
  CountryPicker,
  ProductTypeField,
  ProductTypeSheet,
  ProgressRing,
  RequestSent,
  ReviewCard,
  StorePicker,
} from './components/RequestUI';
import {
  QUANTITY_PRESETS,
  VARIANT_TEMPLATES,
  appendTemplate,
  countryForStore,
  extractUrl,
  requiredProgress,
  storeFromUrl,
} from './requestHelpers';

const STEPS = [
  {
    icon: 'create',
    title: 'Describe it',
    body: 'Store, type, link',
    colors: ['#ffb35c', '#f97316'],
  },
  {
    icon: 'search',
    title: 'We source it',
    body: 'From trusted sellers',
    colors: ['#c4a1ff', '#7c3aed'],
  },
  {
    icon: 'pricetag',
    title: 'You get a quote',
    body: 'Price & shipping',
    colors: ['#7aa8ff', '#4f46e5'],
  },
  {
    icon: 'cube',
    title: 'We deliver',
    body: 'To your door',
    colors: ['#4ade80', '#059669'],
  },
];

/** The web form's stores and origin countries (`request-product.jsx`). */
export const STORES = [
  'AliExpress',
  'Gearbest',
  'Taobao',
  'Flipkart',
  'Amazon (India)',
  'Amazon (USA)',
  'Amazon (UAE)',
  'Best Buy',
  'Alibaba',
  'Pingduoduo',
  'Taobao (Direct)',
  'Walmart',
  'eBay',
  'JLCPCB',
  'Noon',
  'Myntra',
  'Others',
].map(store => ({ value: store, label: store }));

export const COUNTRIES = [
  { value: 'china', label: 'China' },
  { value: 'uk', label: 'UK' },
  { value: 'usa', label: 'USA' },
  { value: 'hongkong', label: 'Hong Kong' },
  { value: 'thailand', label: 'Thailand' },
  { value: 'india', label: 'India' },
];

/** Product types for the chosen country, with their 5 kg+ air rate, as the web lists them. */
export const rateOptions = rates =>
  (Array.isArray(rates) ? rates : [])
    .filter(rate => rate?.id)
    .map(rate => ({ value: String(rate.id), label: String(rate.id).trim(), rate: rate.eleven ?? '' }))
    .filter(option => option.label);

const blank = value => !`${value ?? ''}`.trim();

/** What the web requires: store, country, product type, quantity and description. */
export const missingField = form => {
  if (blank(form?.store)) return 'Choose the store';
  if (blank(form?.country)) return 'Choose the origin country';
  if (blank(form?.productType)) return 'Choose the product type';
  if (!(parseInt(form?.productQuantity, 10) > 0)) return 'Enter the quantity';
  if (blank(form?.productVariant)) return 'Describe colour, size and pieces';
  return null;
};

export const canSendRequest = form => !missingField(form);

/**
 * The `bookingRequest` document, field for field as the web's form saves it:
 * the request starts at stage 1 with `orderStatus: 'Pending'`, which is what
 * puts it in the website's (and app's) "Pending" tab.
 */
export const buildProductRequest = ({ form, shippingRate, imageUrl, currentUser, now = new Date() }) => ({
  imageUrl: imageUrl || '',
  date: now.toLocaleDateString('en-GB'),
  time: now.getTime(),
  productQuantity: `${parseInt(form.productQuantity, 10)}`,
  productUrl: form.productUrl.trim(),
  productVariant: form.productVariant.trim(),
  productType: form.productType,
  shippingRate: `${shippingRate ?? ''}`,
  country: form.country,
  store: form.store,
  userId: currentUser?.id,
  displayName: currentUser?.displayName || '',
  shipmentStatusScore: 1,
  status: 'Pending',
  orderStatus: 'Pending',
});

/** The quantity stepper value, never below 1 (empty text means "not set"). */
const stepQuantity = (text, delta) => {
  const current = parseInt(text, 10) || 0;
  return `${Math.max(1, current + delta)}`;
};

const EMPTY_FORM = {
  store: '',
  country: '',
  productType: '',
  productUrl: '',
  productQuantity: '',
  productVariant: '',
};

/**
 * "Request a product" — the web's "Request for Product" form: store, origin
 * country, product type (with its shipping rate for that country), link,
 * quantity, description and a photo. Creates the same `bookingRequest`
 * document as the website, so it lands in "My requests → Pending".
 *
 * Extras over the web: pasting a link picks the store (and its usual
 * country), a searchable product-type sheet, quantity presets, description
 * templates, a review card and a confirmation screen.
 */
const RequestProductScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const requireAuth = useAuthGuard();
  const { currentUser } = useAuth();
  useDarkStatusBar();
  // The send bar takes the bottom of the screen, so the WhatsApp button steps aside.
  useHideSupportFab();

  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [typeSheet, setTypeSheet] = useState(false);
  const [detected, setDetected] = useState('');
  const [sent, setSent] = useState(null);

  const update = key => value =>
    setForm(previous => ({ ...previous, [key]: value }));

  // Product types and rates depend on the origin country, as on the web.
  useEffect(() => {
    if (!form.country) return undefined;
    let alive = true;
    setRatesLoading(true);
    setForm(previous => ({ ...previous, productType: '' }));
    getAllD2DRates('air', form.country).then(list => {
      if (!alive) return;
      setRates(rateOptions(list));
      setRatesLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [form.country]);

  const chosenType = rates.find(option => option.value === form.productType);
  const countryLabel = COUNTRIES.find(country => country.value === form.country)?.label || '';

  const missing = missingField(form);
  const ready = !missing;
  const progress = requiredProgress(form);

  /** A link names its store; pick it (and the store's usual country) when the fields are still empty. */
  const applyLink = text => {
    update('productUrl')(text);
    const store = storeFromUrl(text);
    if (!store) {
      setDetected('');
      return;
    }
    setDetected(store);
    setForm(previous => ({
      ...previous,
      productUrl: text,
      store: previous.store || store,
      country: previous.country || countryForStore(store),
    }));
  };

  const pasteLink = async () => {
    const text = await Clipboard.getString();
    const url = extractUrl(text);
    if (!url) {
      notifyInfo('No link copied', 'Copy the product link first, then tap Paste.');
      return;
    }
    applyLink(url);
  };

  const pickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (asset) setPhoto(asset);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setPhoto(null);
    setRates([]);
    setDetected('');
    setSent(null);
  };

  const viewRequests = () => {
    reset();
    navigation.navigate(ROUTES.TAB_ORDERS, {
      screen: ROUTES.DASHBOARD,
      params: { bucket: BUCKETS.REQUESTS },
    });
  };

  const submit = () =>
    requireAuth(async () => {
      if (submitting) return;
      if (missing) {
        notifyError(missing);
        return;
      }

      setSubmitting(true);
      try {
        // Storage first: the booking stores the URL, never the local file.
        const imageUrl = photo ? await uploadImageProduct(photo) : null;
        if (photo && !imageUrl) {
          notifyError('The photo could not be uploaded. Try again, or remove it to send without a photo.');
          return;
        }

        const saved = await dispatch(
          setProductRequestRedux(
            buildProductRequest({ form, shippingRate: chosenType?.rate, imageUrl, currentUser }),
          ),
        );
        // The save already showed its own error.
        if (!saved) return;

        setSent(`${parseInt(form.productQuantity, 10)} pcs of ${chosenType?.label || form.productType} from ${form.store}`);
      } catch (error) {
        notifyError(error, 'Could not send your request.');
      } finally {
        setSubmitting(false);
      }
    });

  if (sent) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Request a product" subtitle="Sent to our sourcing team" icon="search" />
        <RequestSent summary={sent} onViewRequests={viewRequests} onAnother={reset} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Request a product"
        subtitle="We'll find it and quote you"
        icon="search"
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero */}
        <Animated.View entering={enter(0)}>
          <LinearGradient colors={['#1f2340', '#3b2a5c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroBlob} />
            <View style={styles.heroBlobSmall} />
            <Text style={styles.heroEyebrow}>BUY & SHIP FOR ME</Text>
            <Text style={styles.heroTitle}>Can't order it yourself?{'\n'}We'll buy it for you.</Text>
            <Text style={styles.heroBody}>From any store in China, the USA, the UK, India and more — delivered to your door.</Text>
            <View style={styles.heroChips}>
              {[
                ['shield-checkmark', 'Trusted sellers'],
                ['time', 'Quote in 24h'],
                ['airplane', 'Air shipping'],
              ].map(([icon, label]) => (
                <View key={label} style={styles.heroChip}>
                  <Icon name={icon} size={12} color="#ffb59c" />
                  <Text style={styles.heroChipText}>{label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        <StepStrip steps={STEPS} index={1} />

        {/* Link first: it can fill the store and country */}
        <SectionCard
          index={2}
          icon="link"
          tint="#e0f2fe"
          color="#0284c7"
          title="Got a link?"
          hint="Paste it and we'll pick the store for you"
        >
          <View style={styles.linkRow}>
            <AuthField
              icon="link-outline"
              placeholder="Enter product URL here"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={form.productUrl}
              onChangeText={applyLink}
              style={styles.linkField}
            />
            <PressableScale onPress={pasteLink} scaleTo={0.92} style={styles.paste} accessibilityLabel="Paste link">
              <Icon name="clipboard" size={17} color={colors.white} />
              <Text style={styles.pasteText}>Paste</Text>
            </PressableScale>
          </View>
          {detected ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.detected}>
              <Icon name="sparkles" size={13} color="#0284c7" />
              <Text style={styles.detectedText}>
                Looks like <Text style={styles.detectedStrong}>{detected}</Text>
                {form.store && form.store !== detected ? ` — you chose ${form.store}` : ' — store selected'}
              </Text>
            </Animated.View>
          ) : (
            <Text style={styles.optionalNote}>Optional — but a link helps us find the exact item.</Text>
          )}
        </SectionCard>

        {/* Where from */}
        <SectionCard
          index={3}
          icon="storefront"
          tint="#fff2e5"
          color="#f97316"
          title="Where is it from?"
          hint="The store and the country it ships from"
          right={form.store && form.country ? <DoneTick /> : null}
        >
          <FieldLabel>Product store</FieldLabel>
          <StorePicker stores={STORES} value={form.store} onChange={update('store')} />
          <FieldLabel>Origin country</FieldLabel>
          <CountryPicker countries={COUNTRIES} value={form.country} onChange={update('country')} />
        </SectionCard>

        {/* What */}
        <SectionCard
          index={4}
          icon="pricetags"
          tint="#eef2ff"
          color="#4f46e5"
          title="What is it?"
          hint="The type sets the shipping rate"
          right={chosenType ? <DoneTick /> : null}
        >
          <ProductTypeField
            country={form.country}
            loading={ratesLoading}
            count={rates.length}
            chosen={chosenType}
            onOpen={() => setTypeSheet(true)}
          />
        </SectionCard>

        {/* How many */}
        <SectionCard
          index={5}
          icon="layers"
          tint="#ecfdf5"
          color="#059669"
          title="Quantity & description"
          hint="Colour, size and pieces for each variant"
          right={parseInt(form.productQuantity, 10) > 0 && form.productVariant.trim() ? <DoneTick /> : null}
        >
          <FieldLabel>Product quantity</FieldLabel>
          <View style={styles.stepperRow}>
            <PressableScale
              onPress={() =>
                update('productQuantity')(stepQuantity(form.productQuantity, -1))
              }
              scaleTo={0.9}
              style={styles.stepBtn}
              accessibilityLabel="Fewer"
            >
              <Icon name="remove" size={18} color={colors.text} />
            </PressableScale>
            <AuthField
              icon="cube-outline"
              placeholder="Total pcs"
              keyboardType="number-pad"
              value={form.productQuantity}
              onChangeText={text =>
                update('productQuantity')(text.replace(/[^0-9]/g, ''))
              }
              style={styles.stepField}
            />
            <PressableScale
              onPress={() => update('productQuantity')(stepQuantity(form.productQuantity, 1))}
              scaleTo={0.9}
              style={[styles.stepBtn, styles.stepBtnAdd]}
              accessibilityLabel="More"
            >
              <Icon name="add" size={18} color={colors.white} />
            </PressableScale>
          </View>
          <View style={styles.presets}>
            {QUANTITY_PRESETS.map(preset => {
              const on = parseInt(form.productQuantity, 10) === preset;
              return (
                <PressableScale
                  key={preset}
                  onPress={() => update('productQuantity')(`${preset}`)}
                  scaleTo={0.92}
                  style={[styles.preset, on && styles.presetOn]}
                >
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{preset} pcs</Text>
                </PressableScale>
              );
            })}
          </View>

          <FieldLabel>Product description (colour, size, pcs)</FieldLabel>
          <TextArea
            placeholder="Ex: color: red, size: M, pcs: 20"
            value={form.productVariant}
            onChangeText={update('productVariant')}
          />
          <View style={styles.templates}>
            <Text style={styles.templatesLabel}>Add:</Text>
            {VARIANT_TEMPLATES.map(template => (
              <PressableScale
                key={template}
                onPress={() => update('productVariant')(appendTemplate(form.productVariant, template))}
                scaleTo={0.92}
                style={styles.template}
              >
                <Icon name="add" size={12} color="#059669" />
                <Text style={styles.templateText}>{template.replace(':', '').trim()}</Text>
              </PressableScale>
            ))}
          </View>
        </SectionCard>

        {/* Photo */}
        <SectionCard
          index={6}
          icon="images"
          tint="#fdeefe"
          color="#c026d3"
          title="Photo"
          hint="Optional — a screenshot helps us find the exact product"
          right={photo ? <DoneTick /> : null}
        >
          <PhotoPicker
            photo={photo}
            onPick={pickPhoto}
            onRemove={() => setPhoto(null)}
            label="Upload image"
            hint="Screenshot or picture of the product"
          />
        </SectionCard>

        {/* Review */}
        <SectionCard
          index={7}
          icon="clipboard"
          tint="#fff1f2"
          color="#e11d48"
          title="Review your request"
          hint={ready ? 'Everything looks good — send it when ready' : missing}
        >
          <ReviewCard form={form} chosen={chosenType} photo={photo} countryLabel={countryLabel} />
        </SectionCard>

        <Animated.View entering={enter(8)} style={styles.note}>
          <Icon name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Our sourcing team usually replies with a quote within 24 hours.
          </Text>
        </Animated.View>
      </ScrollView>

      <BottomActionBar style={styles.bar}>
        <ProgressRing done={progress.done} total={progress.total} />
        <View style={styles.barText}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {ready ? 'Ready to send' : missing}
          </Text>
          <Text style={styles.barValue}>
            {progress.done} of {progress.total} required
          </Text>
        </View>
        <GradientButton
          label="Send"
          icon="paper-plane"
          onPress={submit}
          loading={submitting}
          disabled={!ready}
          style={styles.barButton}
        />
      </BottomActionBar>

      <ProductTypeSheet
        visible={typeSheet}
        options={rates}
        value={form.productType}
        country={form.country}
        onPick={value => {
          update('productType')(value);
          setTypeSheet(false);
        }}
        onClose={() => setTypeSheet(false)}
      />
    </KeyboardAvoidingView>
  );
};

const DoneTick = () => (
  <Animated.View entering={FadeIn.duration(200)} style={styles.doneTick}>
    <Icon name="checkmark" size={13} color={colors.white} />
  </Animated.View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  hero: { marginTop: spacing.sm, padding: 18, borderRadius: 24, overflow: 'hidden' },
  heroBlob: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,138,92,0.28)',
  },
  heroBlobSmall: {
    position: 'absolute',
    bottom: -30,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.35)',
  },
  heroEyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: '#ffb59c' },
  heroTitle: { marginTop: 6, fontSize: 21, lineHeight: 27, fontWeight: '900', color: colors.white },
  heroBody: { marginTop: 6, fontSize: typography.size.sm, lineHeight: 19, color: 'rgba(255,255,255,0.78)' },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroChipText: { fontSize: 11, fontWeight: typography.weight.bold, color: colors.white },
  linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  linkField: { flex: 1 },
  paste: {
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
  },
  pasteText: { marginTop: 1, fontSize: 10.5, fontWeight: '800', color: colors.white },
  detected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
  },
  detectedText: { flex: 1, fontSize: 12, color: '#075985' },
  detectedStrong: { fontWeight: '800' },
  optionalNote: { marginTop: 8, fontSize: 11.5, color: colors.textMuted },
  doneTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
  },
  stepperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepBtn: {
    width: 46,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnAdd: { backgroundColor: colors.primary },
  stepField: { flex: 1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#fafafc',
  },
  presetOn: { borderColor: colors.primary, backgroundColor: '#fff3ef' },
  presetText: { fontSize: 12, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  presetTextOn: { color: colors.primary, fontWeight: '800' },
  templates: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  templatesLabel: { fontSize: 12, color: colors.textMuted },
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  templateText: { fontSize: 12, fontWeight: typography.weight.bold, color: '#059669' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  noteText: { fontSize: typography.size.xs, color: colors.textMuted },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barText: { flex: 1 },
  barLabel: {
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.text,
  },
  barValue: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  barButton: { minWidth: 110, borderRadius: radius.lg },
});

export default RequestProductScreen;
