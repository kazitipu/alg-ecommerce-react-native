import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { WebView } from 'react-native-webview';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { colors, radius, spacing, typography } from '../../../theme';

/** Reports the document height so the WebView can size itself to its content. */
const MEASURE_SCRIPT = `
  (function () {
    function send() {
      window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));
    }
    window.addEventListener('load', send);
    Array.prototype.forEach.call(document.images, function (img) { img.addEventListener('load', send); });
    setTimeout(send, 300);
    setTimeout(send, 1500);
  })();
  true;
`;

const wrapHtml = body => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 0; font-family: -apple-system, Roboto, sans-serif; color: #333; }
  img { max-width: 100% !important; height: auto !important; display: block; }
  div, table, p { max-width: 100% !important; width: auto !important; }
</style></head><body>${body}</body></html>`;

/** The product's own description HTML (mostly the seller's long images). */
const Overview = ({ html }) => {
  const [height, setHeight] = useState(400);
  if (!html) return <Text style={styles.empty}>No overview for this product.</Text>;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: wrapHtml(html) }}
      style={[styles.webview, { height }]}
      scrollEnabled={false}
      injectedJavaScript={MEASURE_SCRIPT}
      onMessage={event => {
        const next = Number(event.nativeEvent.data);
        if (next > 0) setHeight(next);
      }}
    />
  );
};

// Long spec sheets fold after this many rows.
const SPEC_ROWS = 8;

const Specs = ({ specs }) => {
  const [expanded, setExpanded] = useState(false);
  if (specs.length === 0) return <Text style={styles.empty}>No specifications listed.</Text>;
  const shown = expanded ? specs : specs.slice(0, SPEC_ROWS);

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      <View style={styles.specs}>
        {shown.map((spec, index) => (
          <View key={`${spec.name}-${index}`} style={[styles.specRow, index % 2 === 1 && styles.specRowAlt]}>
            <Text style={styles.specName}>{spec.name}</Text>
            <Text style={styles.specValue}>{spec.value}</Text>
          </View>
        ))}
      </View>
      {specs.length > SPEC_ROWS ? (
        <PressableScale onPress={() => setExpanded(!expanded)} scaleTo={0.96} style={styles.more}>
          <Text style={styles.moreText}>{expanded ? 'Show less' : `Show all ${specs.length} specifications`}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
        </PressableScale>
      ) : null}
    </Animated.View>
  );
};

const Reviews = ({ feedback }) =>
  feedback.length === 0 ? (
    <View style={styles.emptyBox}>
      <Icon name="chatbubbles-outline" size={28} color={colors.textMuted} />
      <Text style={styles.empty}>No reviews yet for this product</Text>
    </View>
  ) : (
    feedback.map((review, index) => (
      <View key={index} style={styles.review}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewer}>{review.displayName || review.UserName || 'Buyer'}</Text>
          {review.rating ? (
            <View style={styles.reviewRating}>
              <Icon name="star" size={11} color="#ffa41b" />
              <Text style={styles.reviewRatingText}>{review.rating}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.reviewMeta}>
          {[review.date, review.country].filter(Boolean).join(' · ')}
        </Text>
        {review.content ? <Text style={styles.reviewBody}>{review.content}</Text> : null}
        {review.info ? (
          <Text style={styles.reviewMeta}>
            {['Color', 'Logistics', 'Size']
              .map(key => (review.info[key] ? `${key}: ${review.info[key]}` : null))
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {review.photos?.length ? (
          <View style={styles.reviewPhotos}>
            {review.photos.map(photo => (
              <Image key={photo} source={{ uri: photo }} style={styles.reviewPhoto} />
            ))}
          </View>
        ) : null}
      </View>
    ))
  );

/**
 * Specifications / Overview / Reviews, as on the web. Overview only loads its
 * HTML once the tab has been opened, which keeps the page light.
 */
const InfoTabs = ({ item }) => {
  const tabs = [
    { key: 'specs', label: 'Specifications' },
    { key: 'overview', label: 'Overview' },
    { key: 'reviews', label: `Reviews (${item.feedback?.length || 0})` },
  ];
  const [active, setActive] = useState('specs');
  const [overviewOpened, setOverviewOpened] = useState(false);
  const [tabWidth, setTabWidth] = useState(0);
  const position = useSharedValue(0);

  useEffect(() => {
    position.value = withSpring(tabs.findIndex(tab => tab.key === active), { damping: 18, stiffness: 200 });
    if (active === 'overview') setOverviewOpened(true);
    // `tabs` is rebuilt each render but its order never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, position]);

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: position.value * tabWidth }],
  }));

  return (
    <View>
      <View
        style={styles.tabs}
        onLayout={event => setTabWidth((event.nativeEvent.layout.width - 8) / tabs.length)}>
        {tabWidth > 0 ? <Animated.View style={[styles.tabPill, pillStyle]} /> : null}
        {tabs.map(tab => (
          <PressableScale key={tab.key} onPress={() => setActive(tab.key)} scaleTo={0.95} style={styles.tab}>
            <Text style={[styles.tabText, active === tab.key && styles.tabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </PressableScale>
        ))}
      </View>

      <Animated.View key={active} entering={FadeIn.duration(250)} style={styles.panel}>
        {active === 'specs' ? <Specs specs={item.specs || []} /> : null}
        {active === 'reviews' ? <Reviews feedback={item.feedback || []} /> : null}
      </Animated.View>
      {/* Kept mounted once opened, so switching back does not reload the page. */}
      {overviewOpened ? (
        <View style={active === 'overview' ? null : styles.hidden}>
          <Overview html={item.description} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#f3f3f6' },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 11,
    backgroundColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: typography.weight.bold },
  panel: { marginTop: spacing.md },
  hidden: { height: 0, overflow: 'hidden' },
  webview: { marginTop: spacing.md, backgroundColor: 'transparent' },
  specs: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#efeff3' },
  specRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.white },
  specRowAlt: { backgroundColor: '#fafafc' },
  specName: { width: '42%', paddingRight: 10, fontSize: typography.size.xs + 1, color: colors.textSecondary },
  specValue: { flex: 1, fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.text },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  moreText: { marginRight: 4, color: colors.primary, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.lg },
  empty: { marginTop: 6, fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center' },
  review: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececf1' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewer: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  reviewRating: { flexDirection: 'row', alignItems: 'center' },
  reviewRatingText: { marginLeft: 3, fontSize: typography.size.xs, color: colors.textSecondary },
  reviewMeta: { marginTop: 3, fontSize: typography.size.xs, color: colors.textMuted },
  reviewBody: { marginTop: 6, fontSize: typography.size.sm, lineHeight: 20, color: colors.textSecondary },
  reviewPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reviewPhoto: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surfaceAlt },
});

export default InfoTabs;
