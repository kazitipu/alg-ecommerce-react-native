import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../../components/PressableScale';
import { colors, typography } from '../../../theme';
import { COUNTRY_FLAGS, POPULAR_STORES, storeInitials } from '../requestHelpers';
import { EASE, GRADIENT } from './ServiceUI';

const INK = '#1f2340';

/** Soft colours for store badges, picked by name so each store keeps its own. */
const BADGE_TINTS = [
  ['#fff2e5', '#f97316'],
  ['#eef2ff', '#4f46e5'],
  ['#ecfdf5', '#059669'],
  ['#fdeefe', '#c026d3'],
  ['#e0f2fe', '#0284c7'],
  ['#fff1f2', '#e11d48'],
];
const tintFor = name => BADGE_TINTS[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BADGE_TINTS.length];

/** Store chips: the popular ones first, the rest behind "Show all". */
export const StorePicker = ({ stores, value, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const popular = stores.filter(store => POPULAR_STORES.includes(store.value));
  const others = stores.filter(store => !POPULAR_STORES.includes(store.value));
  // A store picked from a pasted link stays visible even when collapsed.
  const shown = expanded ? [...popular, ...others] : [...popular, ...others.filter(store => store.value === value)];

  return (
    <View>
      <View style={styles.storeGrid}>
        {shown.map(store => {
          const on = store.value === value;
          const [tint, ink] = tintFor(store.value);
          return (
            <Animated.View key={store.value} entering={FadeIn.duration(220)}>
              <PressableScale
                onPress={() => onChange(store.value)}
                scaleTo={0.94}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.store, on && styles.storeOn]}
              >
                <View style={[styles.badge, on ? styles.badgeOn : { backgroundColor: tint }]}>
                  <Text style={[styles.badgeText, { color: on ? colors.white : ink }]}>{storeInitials(store.value)}</Text>
                </View>
                <Text style={[styles.storeText, on && styles.storeTextOn]} numberOfLines={1}>
                  {store.label}
                </Text>
                {on ? <Icon name="checkmark-circle" size={14} color={colors.white} /> : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
      <PressableScale onPress={() => setExpanded(open => !open)} scaleTo={0.96} style={styles.more}>
        <Text style={styles.moreText}>{expanded ? 'Show fewer stores' : `Show all ${stores.length} stores`}</Text>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
      </PressableScale>
    </View>
  );
};

/** Origin countries as flag tiles. */
export const CountryPicker = ({ countries, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countries}>
    {countries.map(country => {
      const on = country.value === value;
      return (
        <PressableScale
          key={country.value}
          onPress={() => onChange(country.value)}
          scaleTo={0.93}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          style={[styles.country, on && styles.countryOn]}
        >
          <Text style={styles.flag}>{COUNTRY_FLAGS[country.value] || '🌐'}</Text>
          <Text style={[styles.countryText, on && styles.countryTextOn]}>{country.label}</Text>
          {on ? (
            <View style={styles.countryCheck}>
              <Icon name="checkmark" size={10} color={colors.white} />
            </View>
          ) : null}
        </PressableScale>
      );
    })}
  </ScrollView>
);

/** The chosen product type as a card, or the button that opens the picker. */
export const ProductTypeField = ({ country, loading, count, chosen, onOpen }) => {
  if (!country) {
    return (
      <View style={styles.typeEmpty}>
        <Icon name="earth-outline" size={16} color={colors.textMuted} />
        <Text style={styles.typeEmptyText}>Choose the origin country to see product types</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.typeEmpty}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.typeEmptyText}>Loading product types…</Text>
      </View>
    );
  }
  if (!count) {
    return (
      <View style={styles.typeEmpty}>
        <Icon name="alert-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.typeEmptyText}>No product types for this country yet</Text>
      </View>
    );
  }
  if (chosen) {
    return (
      <Animated.View entering={FadeIn.duration(220)}>
        <PressableScale onPress={onOpen} scaleTo={0.98} style={styles.typeChosen}>
          <LinearGradient colors={['#fff4ef', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.typeChosenInner}>
            <View style={styles.typeChosenIcon}>
              <Icon name="pricetags" size={18} color={colors.white} />
            </View>
            <View style={styles.typeChosenText}>
              <Text style={styles.typeChosenName} numberOfLines={1}>{chosen.label}</Text>
              {chosen.rate !== '' ? (
                <Text style={styles.typeChosenRate}>
                  {chosen.rate} Tk/kg <Text style={styles.typeChosenHint}>· shipping for 5 kg and over</Text>
                </Text>
              ) : null}
            </View>
            <Text style={styles.change}>Change</Text>
          </LinearGradient>
        </PressableScale>
        <View style={styles.rateHint}>
          <Icon name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={styles.rateHintText}>
            Shipping is charged by weight once the parcel reaches Bangladesh — e.g. 2 kg ≈ Tk{' '}
            {(Number(chosen.rate) || 0) * 2}.
          </Text>
        </View>
      </Animated.View>
    );
  }
  return (
    <PressableScale onPress={onOpen} scaleTo={0.98} style={styles.typeOpen}>
      <View style={styles.typeOpenIcon}>
        <Icon name="search" size={16} color={colors.primary} />
      </View>
      <Text style={styles.typeOpenText}>Choose from {count} product types</Text>
      <Icon name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
  );
};

/** Searchable bottom sheet of product types with their rates. */
export const ProductTypeSheet = ({ visible, options, value, country, onPick, onClose }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(option => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Animated.View
              entering={SlideInDown.duration(320).easing(EASE)}
              exiting={SlideOutDown.duration(220)}
              style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
            >
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleWrap}>
                  <Text style={styles.sheetTitle}>Product type</Text>
                  <Text style={styles.sheetSub}>
                    {COUNTRY_FLAGS[country] || ''} {options.length} types · air rate for 5 kg and over
                  </Text>
                </View>
                <PressableScale onPress={onClose} scaleTo={0.88} hitSlop={8} style={styles.close} accessibilityLabel="Close">
                  <Icon name="close" size={18} color={colors.text} />
                </PressableScale>
              </View>
              <View style={styles.search}>
                <Icon name="search" size={16} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search e.g. shoes, bag, electronics"
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
              <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {shown.length === 0 ? (
                  <Text style={styles.noMatch}>No type matches “{query}”. Try another word, or choose “Others”.</Text>
                ) : (
                  shown.map(option => {
                    const on = option.value === value;
                    return (
                      <PressableScale
                        key={option.value}
                        onPress={() => onPick(option.value)}
                        scaleTo={0.98}
                        style={[styles.typeRow, on && styles.typeRowOn]}
                      >
                        <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? colors.primary : colors.textMuted} />
                        <Text style={[styles.typeName, on && styles.typeNameOn]} numberOfLines={2}>
                          {option.label}
                        </Text>
                        {option.rate !== '' ? (
                          <View style={styles.ratePill}>
                            <Text style={styles.ratePillText}>{option.rate} Tk/kg</Text>
                          </View>
                        ) : null}
                      </PressableScale>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A small ring showing how many required fields are done. */
export const ProgressRing = ({ done, total, size = 44 }) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(total ? done / total : 0, { duration: 420, easing: EASE });
  }, [done, total, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  const complete = done >= total;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#ececf1" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={complete ? '#059669' : colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {complete ? (
          <Icon name="checkmark" size={18} color="#059669" />
        ) : (
          <Text style={styles.ringText}>
            {done}/{total}
          </Text>
        )}
      </View>
    </View>
  );
};

/** "Review" card summarising the request before it is sent. */
export const ReviewCard = ({ form, chosen, photo, countryLabel }) => {
  const rows = [
    ['storefront-outline', 'Store', form.store],
    ['earth-outline', 'From', countryLabel ? `${COUNTRY_FLAGS[form.country] || ''} ${countryLabel}` : ''],
    ['pricetags-outline', 'Type', chosen ? `${chosen.label}${chosen.rate !== '' ? ` · ${chosen.rate} Tk/kg` : ''}` : ''],
    ['cube-outline', 'Quantity', parseInt(form.productQuantity, 10) > 0 ? `${parseInt(form.productQuantity, 10)} pcs` : ''],
    ['link-outline', 'Link', form.productUrl.trim()],
    ['create-outline', 'Details', form.productVariant.trim()],
  ];
  return (
    <View style={styles.review}>
      {photo ? <Image source={{ uri: photo.uri }} style={styles.reviewPhoto} /> : null}
      {rows.map(([icon, label, value]) => (
        <View key={label} style={styles.reviewRow}>
          <Icon name={icon} size={14} color={value ? colors.textSecondary : '#c9c9d2'} />
          <Text style={styles.reviewLabel}>{label}</Text>
          <Text style={[styles.reviewValue, !value && styles.reviewMissing]} numberOfLines={label === 'Details' ? 3 : 1}>
            {value || (label === 'Link' ? 'Not added' : 'Missing')}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** Full-screen confirmation after sending. */
export const RequestSent = ({ summary, onViewRequests, onAnother }) => {
  return (
    <View style={styles.sent}>
      <Animated.View entering={ZoomIn.duration(420).easing(EASE)} style={styles.sentHalo}>
        <LinearGradient colors={['#4ade80', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sentIcon}>
          <Icon name="checkmark" size={44} color={colors.white} />
        </LinearGradient>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(200).duration(380).easing(EASE)} style={styles.sentTitle}>
        Request sent!
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(280).duration(380).easing(EASE)} style={styles.sentBody}>
        Our sourcing team will check {summary || 'your product'} and send you a quote — usually within 24 hours.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(360).duration(400).easing(EASE)} style={styles.sentSteps}>
        {[
          ['search', 'We find the best seller', '#7c3aed'],
          ['pricetag', 'You get the price in “My requests”', '#4f46e5'],
          ['wallet', 'Pay and we ship it to you', '#059669'],
        ].map(([icon, text, color]) => (
          <View key={text} style={styles.sentStep}>
            <View style={[styles.sentStepIcon, { backgroundColor: `${color}1a` }]}>
              <Icon name={icon} size={15} color={color} />
            </View>
            <Text style={styles.sentStepText}>{text}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(440).duration(400).easing(EASE)} style={styles.sentActions}>
        <PressableScale onPress={onViewRequests} scaleTo={0.96} style={styles.sentPrimaryShadow}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sentPrimary}>
            <Icon name="document-text" size={17} color={colors.white} />
            <Text style={styles.sentPrimaryText}>View my requests</Text>
          </LinearGradient>
        </PressableScale>
        <PressableScale onPress={onAnother} scaleTo={0.96} style={styles.sentSecondary}>
          <Icon name="add-circle-outline" size={17} color={colors.primary} />
          <Text style={styles.sentSecondaryText}>Request another product</Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  store: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#fafafc',
  },
  storeOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  badge: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  storeText: { maxWidth: 130, fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  storeTextOn: { color: colors.white, fontWeight: typography.weight.bold },
  more: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 10, paddingVertical: 4 },
  moreText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  countries: { gap: 8, paddingRight: 4 },
  country: {
    width: 78,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#fafafc',
  },
  countryOn: { borderColor: colors.primary, backgroundColor: '#fff6f2' },
  flag: { fontSize: 24 },
  countryText: { marginTop: 4, fontSize: 11.5, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  countryTextOn: { color: colors.primary, fontWeight: '800' },
  countryCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  typeEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, backgroundColor: '#f7f7fa' },
  typeEmptyText: { flex: 1, fontSize: typography.size.sm, color: colors.textMuted },
  typeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#f5b8a6',
    backgroundColor: '#fffaf8',
  },
  typeOpenIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe9e1' },
  typeOpenText: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  typeChosen: { borderRadius: 18, borderWidth: 1.5, borderColor: '#ffd3c4', overflow: 'hidden' },
  typeChosenInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  typeChosenIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  typeChosenText: { flex: 1 },
  typeChosenName: { fontSize: typography.size.md, fontWeight: '800', color: INK },
  typeChosenRate: { marginTop: 2, fontSize: typography.size.sm, fontWeight: '800', color: '#059669' },
  typeChosenHint: { fontWeight: '500', color: colors.textMuted },
  change: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  rateHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 },
  rateHintText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 22, 38, 0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white },
  handle: { alignSelf: 'center', width: 40, height: 4, marginTop: 10, marginBottom: 8, borderRadius: 2, backgroundColor: '#dcdce4' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  sheetTitleWrap: { flex: 1 },
  sheetTitle: { fontSize: typography.size.lg, fontWeight: '800', color: INK },
  sheetSub: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f3f6', alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: '#f3f3f7',
  },
  searchInput: { flex: 1, fontSize: typography.size.sm + 1, color: colors.text, paddingVertical: 0 },
  sheetList: { flexGrow: 0 },
  noMatch: { paddingVertical: 24, textAlign: 'center', fontSize: typography.size.sm, color: colors.textMuted },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ececf1',
  },
  typeRowOn: { borderColor: colors.primary, backgroundColor: '#fff8f6' },
  typeName: { flex: 1, fontSize: typography.size.sm + 1, color: colors.text },
  typeNameOn: { fontWeight: typography.weight.bold, color: colors.primary },
  ratePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#ecfdf3' },
  ratePillText: { fontSize: 11.5, fontWeight: '800', color: '#059669' },
  ringCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 11, fontWeight: '800', color: INK },
  review: { gap: 2 },
  reviewPhoto: { width: '100%', height: 140, marginBottom: 8, borderRadius: 16, backgroundColor: '#f1f1f5' },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  reviewLabel: { width: 66, fontSize: typography.size.sm, color: colors.textMuted },
  reviewValue: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: INK, textAlign: 'right' },
  reviewMissing: { fontWeight: '500', color: '#c9c9d2' },
  sent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  sentHalo: { padding: 14, borderRadius: 70, backgroundColor: '#dcfce7' },
  sentIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { marginTop: 22, fontSize: 26, fontWeight: '900', color: INK },
  sentBody: { marginTop: 8, textAlign: 'center', fontSize: typography.size.sm + 1, lineHeight: 21, color: colors.textSecondary },
  sentSteps: { alignSelf: 'stretch', marginTop: 22, padding: 14, gap: 10, borderRadius: 22, backgroundColor: colors.white },
  sentStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sentStepIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sentStepText: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: INK },
  sentActions: { alignSelf: 'stretch', marginTop: 22, gap: 10 },
  sentPrimaryShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  sentPrimary: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sentPrimaryText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  sentSecondary: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3ef',
  },
  sentSecondaryText: { color: colors.primary, fontSize: typography.size.md, fontWeight: typography.weight.bold },
});
