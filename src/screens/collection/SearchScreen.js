import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PressableScale from '../../components/PressableScale';
import { useHideSupportFab } from '../../components/SupportFab';
import { useDarkStatusBar } from '../../hooks';
import { SEARCH_PHOTO_OPTIONS, uploadSearchImage } from '../../api';
import { resolveSearchInput } from '../../utils/productLink';
import { notifyError } from '../../utils/notify';
import { HOME_CATEGORIES } from '../../constants/categories';
import { ROUTES } from '../../navigation/routes';
import { colors, typography } from '../../theme';
import { addRecent, isMarketplaceLink, loadRecent, removeRecent, saveRecent } from './recentSearches';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const EASE = Easing.out(Easing.cubic);
const INK = '#1f2340';
const enter = index => FadeInUp.delay(60 + index * 60).duration(360).easing(EASE);

/**
 * Search entry point: type a keyword, paste a 1688/Taobao product link (it
 * opens the product directly), or search by photo. Recent searches are kept
 * on the device and popular categories are one tap away.
 */
const SearchScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useDarkStatusBar();
  useHideSupportFab();

  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [clipLink, setClipLink] = useState('');

  useEffect(() => {
    loadRecent().then(setRecent);
  }, []);

  // Offer a copied marketplace link each time the screen comes into view.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Clipboard.getString()
        .then(text => active && setClipLink(isMarketplaceLink(text) ? String(text).trim() : ''))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const intent = useMemo(() => resolveSearchInput(query), [query]);
  const hint =
    intent?.type === 'product'
      ? { icon: 'checkmark-circle', text: `${intent.source === '1688' ? '1688' : 'Taobao'} product link detected`, color: '#059669' }
      : null;

  const remember = keyword => {
    const next = addRecent(recent, keyword);
    setRecent(next);
    saveRecent(next);
  };

  const run = text => {
    const resolved = resolveSearchInput(text);
    if (!resolved) {
      notifyError('Type something to search for.');
      return;
    }
    if (resolved.type === 'product') {
      // A pasted marketplace link goes straight to that product.
      navigation.navigate(resolved.source === '1688' ? ROUTES.PRODUCT_1688 : ROUTES.PRODUCT_TAOBAO, {
        id: resolved.id,
        source: resolved.source,
      });
      return;
    }
    remember(resolved.keyword);
    navigation.navigate(ROUTES.COLLECTION, { keyword: resolved.keyword, title: resolved.keyword });
  };

  const pasteLink = () => {
    setQuery(clipLink);
    run(clipLink);
  };

  /** Uploads a photo, then searches 1688 by the returned image id. */
  const searchByPhoto = async () => {
    if (uploading) return;
    const result = await launchImageLibrary(SEARCH_PHOTO_OPTIONS);
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset) {
      notifyError('Could not read that photo.');
      return;
    }

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

  const clearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  const dropRecent = keyword => {
    const next = removeRecent(recent, keyword);
    setRecent(next);
    saveRecent(next);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#fff0ec', '#fff8f6', '#f6f6f8']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => navigation.goBack()} scaleTo={0.88} hitSlop={8} style={styles.back} accessibilityLabel="Back">
            <Icon name="chevron-back" size={20} color={colors.text} />
          </PressableScale>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Search</Text>
            <Text style={styles.headerSub}>Millions of products from China</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={19} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => run(query)}
            placeholder="Search, or paste a 1688 / Taobao link"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <PressableScale onPress={() => setQuery('')} scaleTo={0.85} hitSlop={8} accessibilityLabel="Clear">
              <Icon name="close-circle" size={19} color={colors.textMuted} />
            </PressableScale>
          ) : null}
          <PressableScale onPress={searchByPhoto} scaleTo={0.9} style={styles.camera} accessibilityLabel="Search by photo">
            {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="camera-outline" size={20} color={colors.primary} />}
          </PressableScale>
        </View>

        {hint ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.hintRow}>
            <Icon name={hint.icon} size={14} color={hint.color} />
            <Text style={[styles.hintText, { color: hint.color }]}>{hint.text}</Text>
          </Animated.View>
        ) : null}
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {clipLink && clipLink !== query ? (
          <Animated.View entering={enter(0)}>
            <PressableScale onPress={pasteLink} scaleTo={0.97} style={styles.clipCard}>
              <View style={[styles.tile, styles.tileIndigo]}>
                <Icon name="clipboard" size={18} color="#4f46e5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Open copied link</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {clipLink}
                </Text>
              </View>
              <Icon name="arrow-forward" size={18} color="#4f46e5" />
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(1)} style={styles.actions}>
          <PressableScale onPress={searchByPhoto} scaleTo={0.96} style={styles.actionShadow}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCard}>
              <View style={styles.actionIcon}>
                {uploading ? <ActivityIndicator color={colors.white} /> : <Icon name="camera" size={22} color={colors.white} />}
              </View>
              <Text style={styles.actionTitle}>Search by photo</Text>
              <Text style={styles.actionSub}>Find similar products</Text>
            </LinearGradient>
          </PressableScale>
          <View style={[styles.actionCard, styles.actionLight]}>
            <View style={[styles.actionIcon, styles.actionIconLight]}>
              <Icon name="link" size={22} color="#4f46e5" />
            </View>
            <Text style={[styles.actionTitle, styles.ink]}>Paste a link</Text>
            <Text style={[styles.actionSub, styles.muted]}>1688 or Taobao opens the product</Text>
          </View>
        </Animated.View>

        {recent.length > 0 ? (
          <Animated.View entering={enter(2)} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.tile, styles.tileOrange]}>
                <Icon name="time" size={16} color="#f97316" />
              </View>
              <Text style={styles.sectionTitle}>Recent searches</Text>
              <PressableScale onPress={clearRecent} scaleTo={0.92} hitSlop={8}>
                <Text style={styles.clear}>Clear all</Text>
              </PressableScale>
            </View>
            {recent.map(keyword => (
              <View key={keyword} style={styles.recentRow}>
                <PressableScale
                  onPress={() => {
                    setQuery(keyword);
                    run(keyword);
                  }}
                  scaleTo={0.98}
                  style={styles.recentMain}
                >
                  <Icon name="search-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {keyword}
                  </Text>
                </PressableScale>
                <PressableScale onPress={() => dropRecent(keyword)} scaleTo={0.85} hitSlop={8} accessibilityLabel={`Remove ${keyword}`}>
                  <Icon name="close" size={16} color={colors.textMuted} />
                </PressableScale>
              </View>
            ))}
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(3)} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.tile, styles.tilePink]}>
              <Icon name="flame" size={16} color="#c026d3" />
            </View>
            <Text style={styles.sectionTitle}>Popular categories</Text>
          </View>
          <View style={styles.chips}>
            {HOME_CATEGORIES.map(category => (
              <PressableScale
                key={category.name}
                onPress={() => {
                  remember(category.name);
                  navigation.navigate(ROUTES.COLLECTION, { keyword: category.name, title: category.name });
                }}
                scaleTo={0.94}
                style={styles.chip}
              >
                {category.icon ? <Icon name={category.icon} size={13} color={colors.primary} /> : null}
                <Text style={styles.chipLabel}>{category.name}</Text>
              </PressableScale>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.tip}>
          <Icon name="information-circle" size={15} color={colors.textMuted} />
          <Text style={styles.tipText}>
            Tip: copy a product link in the 1688 or Taobao app, then come back here — we'll open it for you.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const cardShadow = {
  shadowColor: '#5b5f7a',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: typography.size.xl, fontWeight: '800', color: INK },
  headerSub: { marginTop: 1, fontSize: typography.size.xs + 1, color: colors.textSecondary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    height: 56,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#ffe1d8',
    ...cardShadow,
  },
  input: { flex: 1, fontSize: typography.size.md, color: colors.text, paddingVertical: 0 },
  camera: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff3ef' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 4 },
  hintText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  clipCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, backgroundColor: colors.white, ...cardShadow },
  tile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tileIndigo: { backgroundColor: '#eef2ff' },
  tileOrange: { backgroundColor: '#fff2e5' },
  tilePink: { backgroundColor: '#fdeefe' },
  cardText: { flex: 1, marginHorizontal: 12 },
  cardTitle: { fontSize: typography.size.sm + 1, fontWeight: '800', color: INK },
  cardSub: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 12 },
  actionShadow: {
    flex: 1,
    borderRadius: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  actionCard: { flex: 1, minHeight: 132, padding: 16, borderRadius: 22 },
  actionLight: { backgroundColor: colors.white, ...cardShadow },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  actionIconLight: { backgroundColor: '#eef2ff' },
  actionTitle: { marginTop: 14, fontSize: typography.size.md, fontWeight: '800', color: colors.white },
  actionSub: { marginTop: 3, fontSize: typography.size.xs, color: 'rgba(255,255,255,0.88)' },
  ink: { color: INK },
  muted: { color: colors.textMuted },
  card: { padding: 14, borderRadius: 22, backgroundColor: colors.white, ...cardShadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.md, fontWeight: '800', color: INK },
  clear: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ececf1' },
  recentMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 10 },
  recentText: { flex: 1, fontSize: typography.size.sm + 1, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff6f3',
    borderWidth: 1,
    borderColor: '#ffe1d8',
  },
  chipLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: INK },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 4 },
  tipText: { flex: 1, fontSize: typography.size.xs, lineHeight: 17, color: colors.textMuted },
});

export default SearchScreen;
