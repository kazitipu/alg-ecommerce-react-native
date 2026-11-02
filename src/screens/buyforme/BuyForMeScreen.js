import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

import { PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { SEARCH_PHOTO_OPTIONS, uploadSearchImage } from '../../api';
import { useDarkStatusBar } from '../../hooks';
import { resolveSearchInput } from '../../utils/productLink';
import { notifyError } from '../../utils/notify';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';
import {
  GRADIENT,
  GradientButton,
  SectionCard,
  StepStrip,
  enter,
} from './components/ServiceUI';

const STEPS = [
  {
    icon: 'link',
    title: 'Share the product',
    body: 'Link, name or photo',
    colors: ['#ffb35c', '#f97316'],
  },
  {
    icon: 'card',
    title: 'We buy it',
    body: 'Pay in taka',
    colors: ['#ff8a5c', '#e8344a'],
  },
  {
    icon: 'airplane',
    title: 'We ship it',
    body: 'China → BD',
    colors: ['#7aa8ff', '#4f46e5'],
  },
  {
    icon: 'home',
    title: 'Delivered',
    body: 'Track every stage',
    colors: ['#4ade80', '#059669'],
  },
];

/** Popular searches, as quick starts. */
const SUGGESTIONS = [
  'Ladies bag',
  'Sneakers',
  'Phone case',
  'Kids dress',
  'LED light',
  'Watch',
];

const PERKS = [
  {
    icon: 'shield-checkmark',
    label: 'Verified sellers',
    tint: '#e8f7f1',
    color: '#059669',
  },
  { icon: 'cash', label: 'Pay in taka', tint: '#fff2e5', color: '#f97316' },
  {
    icon: 'navigate',
    label: 'Live tracking',
    tint: '#e8f4ff',
    color: '#2563eb',
  },
];

/**
 * "Buy for me" — ALG purchases from the Chinese marketplace on the customer's
 * behalf.
 *
 * On the web this page was really a search launcher: a link goes to that
 * product, a short phrase becomes a search, a photo becomes a reverse-image
 * search. All three opened new browser tabs; here they push screens.
 */
const BuyForMeScreen = () => {
  const navigation = useNavigation();
  useDarkStatusBar();
  useHideSupportFab();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(false);

  const intent = resolveSearchInput(value);

  const submit = () => {
    const resolved = resolveSearchInput(value);
    if (!resolved) {
      notifyError('Paste a product link, or type what you are looking for.');
      return;
    }

    if (resolved.type === 'product') {
      navigation.navigate(
        resolved.source === '1688'
          ? ROUTES.PRODUCT_1688
          : ROUTES.PRODUCT_TAOBAO,
        { id: resolved.id, source: resolved.source },
      );
      return;
    }

    navigation.navigate(ROUTES.COLLECTION, {
      keyword: resolved.keyword,
      title: resolved.keyword,
    });
  };

  const paste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) setValue(text.trim());
      else notifyError('Your clipboard is empty.');
    } catch (error) {
      notifyError('Could not read the clipboard.');
    }
  };

  const searchByPhoto = async () => {
    if (uploading) return;
    const result = await launchImageLibrary(SEARCH_PHOTO_OPTIONS);
    if (result.didCancel) return;

    const asset = result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      const imgId = await uploadSearchImage(asset);
      if (!imgId) {
        notifyError('The photo could not be processed. Try another one.');
        return;
      }
      navigation.navigate(ROUTES.COLLECTION, { imgId, imageUri: asset.uri, title: 'Photo search' });
    } catch (error) {
      notifyError(error, 'Image search failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const hint = !intent
    ? null
    : intent.type === 'product'
    ? {
        icon: 'checkmark-circle',
        text: `${
          intent.source === '1688' ? '1688' : 'Taobao'
        } product link detected`,
        color: '#059669',
      }
    : {
        icon: 'search',
        text: `We'll search for “${intent.keyword}”`,
        color: colors.textSecondary,
      };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Buy for me"
        subtitle="We buy from China for you"
        icon="cart"
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero */}
        <Animated.View entering={enter(0)}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.blob, styles.blobA]} />
            <View style={[styles.blob, styles.blobB]} />
            <Text style={styles.heroTitle}>We'll buy it for you</Text>
            <Text style={styles.heroSub}>
              Found something on 1688 or Taobao? Share it — we handle the
              purchase, shipping and customs.
            </Text>

            <View style={[styles.search, focused && styles.searchFocused]}>
              <Icon name="link" size={18} color={colors.textSecondary} />
              <TextInput
                placeholder="Paste a product link, or search"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={setValue}
                onSubmitEditing={submit}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {value ? (
                <PressableScale
                  onPress={() => setValue('')}
                  scaleTo={0.85}
                  hitSlop={8}
                  accessibilityLabel="Clear"
                >
                  <Icon
                    name="close-circle"
                    size={18}
                    color={colors.textMuted}
                  />
                </PressableScale>
              ) : (
                <PressableScale
                  onPress={paste}
                  scaleTo={0.92}
                  style={styles.pasteChip}
                >
                  <Icon
                    name="clipboard-outline"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={styles.pasteText}>Paste</Text>
                </PressableScale>
              )}
            </View>
            {hint ? (
              <View style={styles.hint}>
                <Icon name={hint.icon} size={13} color={colors.white} />
                <Text style={styles.hintText} numberOfLines={1}>
                  {hint.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.heroActions}>
              <PressableScale
                onPress={submit}
                scaleTo={0.96}
                style={styles.findButton}
              >
                <Icon name="search" size={16} color={colors.primary} />
                <Text style={styles.findText}>Find this product</Text>
              </PressableScale>
              <PressableScale
                onPress={searchByPhoto}
                scaleTo={0.94}
                style={styles.photoButton}
                accessibilityLabel="Search by photo"
              >
                {uploading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Icon name="camera" size={20} color={colors.white} />
                )}
              </PressableScale>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick searches */}
        <SectionCard
          index={1}
          icon="flame"
          tint="#fff2e5"
          color="#f97316"
          title="Popular right now"
          hint="Tap to search"
        >
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(term => (
              <PressableScale
                key={term}
                onPress={() =>
                  navigation.navigate(ROUTES.COLLECTION, {
                    keyword: term,
                    title: term,
                  })
                }
                scaleTo={0.94}
                style={styles.suggestion}
              >
                <Icon name="trending-up" size={12} color={colors.primary} />
                <Text style={styles.suggestionText}>{term}</Text>
              </PressableScale>
            ))}
          </View>
        </SectionCard>

        {/* How it works */}
        <Text style={styles.section}>How it works</Text>
        <StepStrip steps={STEPS} index={2} />

        {/* Perks */}
        <Animated.View entering={enter(3)} style={styles.perks}>
          {PERKS.map(perk => (
            <View key={perk.label} style={styles.perk}>
              <View style={[styles.perkIcon, { backgroundColor: perk.tint }]}>
                <Icon name={perk.icon} size={16} color={perk.color} />
              </View>
              <Text style={styles.perkText}>{perk.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Request fallback */}
        <SectionCard
          index={4}
          icon="help-buoy"
          tint="#eef2ff"
          color="#4f46e5"
          title="Can't find it?"
          hint="Our sourcing team will find it and quote you"
        >
          <GradientButton
            label="Send a product request"
            icon="paper-plane"
            onPress={() => navigation.navigate(ROUTES.REQUEST_PRODUCT)}
          />
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  hero: { padding: 16, borderRadius: 24, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blobA: { width: 180, height: 180, top: -70, right: -50 },
  blobB: { width: 120, height: 120, bottom: -50, left: -40 },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.white,
  },
  heroSub: {
    marginTop: 4,
    fontSize: typography.size.sm,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.white,
  },
  searchFocused: { borderColor: '#ffd0c2' },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: typography.size.sm + 1,
    color: colors.text,
  },
  pasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  pasteText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    marginLeft: 4,
  },
  hintText: {
    flex: 1,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.white,
  },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  findButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  findText: {
    fontSize: typography.size.sm + 1,
    fontWeight: '800',
    color: colors.primary,
  },
  photoButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f7f7fa',
  },
  suggestionText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
    marginBottom: -4,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  perks: { flexDirection: 'row', gap: 8, marginTop: 12 },
  perk: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  perkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
});

export default BuyForMeScreen;
