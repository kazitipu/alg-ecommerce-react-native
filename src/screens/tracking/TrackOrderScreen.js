import React, { useEffect, useState } from 'react';
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
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';

import { PressableScale, ScreenHeader } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import { getOrderTrackingResultRedux } from '../../actions';
import { useDarkStatusBar } from '../../hooks';
import { notifyError, notifyInfo } from '../../utils/notify';
import { formatDate } from '../../utils/format';
import { buildTimeline } from '../../utils/tracking';
import JourneyTimeline from '../../components/JourneyTimeline';
import { colors, radius, spacing, typography } from '../../theme';

const EASE = Easing.out(Easing.cubic);
const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

/** An icon per pipeline stage (1 Pending … 7 Delivered). */
export const STAGE_ICONS = {
  1: 'time',
  2: 'checkmark-done',
  3: 'business',
  4: 'airplane',
  5: 'shield-checkmark',
  6: 'cube',
  7: 'home',
};

const asText = value =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** The bar across the result card, filling to the current stage. */
const Progress = ({ value }) => {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(
      200,
      withTiming(value, { duration: 900, easing: EASE }),
    );
  }, [value, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, style]}>
        <LinearGradient
          colors={['#34d399', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Public order tracking — no sign-in needed, matching the website.
 *
 * The lookup accepts either a document id or a courier tracking number and
 * searches all three pipelines (orders, shipments, product requests).
 */
const TrackOrderScreen = () => {
  const dispatch = useDispatch();
  const result = useSelector(state => state.orders.orderTrackingResult);
  useDarkStatusBar();
  useHideSupportFab();

  const [trackingNo, setTrackingNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState([]);

  const search = async value => {
    const number = (typeof value === 'string' ? value : trackingNo).trim();
    if (!number) {
      notifyError('Enter your order or tracking number.');
      return;
    }
    if (searching) return;
    setTrackingNo(number);
    setSearching(true);
    try {
      await dispatch(getOrderTrackingResultRedux(number));
      setSearched(true);
      setRecent(previous =>
        [number, ...previous.filter(item => item !== number)].slice(0, 4),
      );
    } catch (error) {
      notifyError(error, 'Could not look that up.');
    } finally {
      setSearching(false);
    }
  };

  const stages = result ? buildTimeline(result) : [];
  const score = Number(result?.shipmentStatusScore) || 0;
  const current =
    stages.find(stage => stage.current) ||
    stages.filter(stage => stage.complete).pop();
  const reference = result
    ? asText(result.orderId) || asText(result.bookingId)
    : '';
  const placed = result
    ? asText(result.orderedDate) || formatDate(result.time)
    : '';

  const copy = value => {
    Clipboard.setString(value);
    notifyInfo('Copied', value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Track an order"
        subtitle="No sign-in needed"
        icon="navigate"
      >
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={trackingNo}
            onChangeText={setTrackingNo}
            placeholder="Order number or tracking number"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => search()}
            style={styles.searchInput}
          />
          <PressableScale
            onPress={() => search()}
            scaleTo={0.92}
            style={styles.searchButton}
            accessibilityLabel="Track"
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchButtonInner}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="arrow-forward" size={18} color={colors.white} />
              )}
            </LinearGradient>
          </PressableScale>
        </View>
        {recent.length ? (
          <View style={styles.recent}>
            <Icon name="time-outline" size={12} color={colors.textMuted} />
            {recent.map(item => (
              <PressableScale
                key={item}
                onPress={() => search(item)}
                scaleTo={0.94}
                style={styles.recentChip}
              >
                <Text style={styles.recentText}>{item}</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}
      </ScreenHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {!result && !searched ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.intro}>
            <LinearGradient
              colors={['#1f2a5c', '#2f3e9e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <View style={styles.introBlob} />
              <Icon name="airplane" size={30} color={colors.white} />
              <Text style={styles.introTitle}>Where's my parcel?</Text>
              <Text style={styles.introText}>
                Enter your order number or the tracking number we gave you to
                see every step from China to your door.
              </Text>
            </LinearGradient>
            <View style={styles.introSteps}>
              {[1, 3, 4, 5, 7].map((stageScore, index) => (
                <Animated.View
                  key={stageScore}
                  entering={FadeInUp.delay(120 + index * 70)
                    .duration(320)
                    .easing(EASE)}
                  style={styles.introStep}
                >
                  <View style={styles.introIcon}>
                    <Icon
                      name={STAGE_ICONS[stageScore]}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  {index < 4 ? <View style={styles.introLine} /> : null}
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {searched && !result ? (
          <Animated.View
            entering={FadeInUp.duration(360).easing(EASE)}
            style={styles.notFound}
          >
            <View style={styles.notFoundIcon}>
              <Icon name="search" size={26} color={colors.primary} />
            </View>
            <Text style={styles.notFoundTitle}>Nothing found</Text>
            <Text style={styles.notFoundText}>
              We couldn't find anything for that number. Double-check it, or
              contact us and we'll look it up for you.
            </Text>
          </Animated.View>
        ) : null}

        {result ? (
          <>
            <Animated.View
              key={`summary-${reference}`}
              entering={FadeInUp.duration(380).easing(EASE)}
              style={styles.card}
            >
              <View style={styles.summaryTop}>
                <LinearGradient
                  colors={score >= 7 ? ['#34d399', '#059669'] : GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryIcon}
                >
                  <Icon
                    name={STAGE_ICONS[current?.score] || 'cube'}
                    size={22}
                    color={colors.white}
                  />
                </LinearGradient>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>Current status</Text>
                  <Text style={styles.summaryStatus}>
                    {current?.label || 'Pending'}
                  </Text>
                </View>
                <View style={styles.stageChip}>
                  <Text style={styles.stageChipText}>
                    {Math.min(Math.max(score, 1), 7)}/7
                  </Text>
                </View>
              </View>
              <Progress value={Math.min(Math.max(score, 1), 7) / 7} />

              <View style={styles.facts}>
                {reference ? (
                  <PressableScale
                    onPress={() => copy(reference)}
                    scaleTo={0.95}
                    style={styles.fact}
                  >
                    <Text style={styles.factLabel}>Reference</Text>
                    <View style={styles.factRow}>
                      <Text style={styles.factValue}>#{reference}</Text>
                      <Icon
                        name="copy-outline"
                        size={12}
                        color={colors.primary}
                      />
                    </View>
                  </PressableScale>
                ) : null}
                {asText(result.trackingNo) ? (
                  <PressableScale
                    onPress={() => copy(asText(result.trackingNo))}
                    scaleTo={0.95}
                    style={styles.fact}
                  >
                    <Text style={styles.factLabel}>Tracking no.</Text>
                    <View style={styles.factRow}>
                      <Text style={styles.factValue} numberOfLines={1}>
                        {asText(result.trackingNo)}
                      </Text>
                      <Icon
                        name="copy-outline"
                        size={12}
                        color={colors.primary}
                      />
                    </View>
                  </PressableScale>
                ) : null}
                {placed ? (
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Placed</Text>
                    <Text style={styles.factValue}>{placed}</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              key={`timeline-${reference}`}
              entering={FadeInUp.delay(120).duration(380).easing(EASE)}
              style={styles.card}
            >
              <JourneyTimeline stages={stages} score={score} />
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    marginTop: 14,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 18,
    backgroundColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: typography.size.md - 1,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  searchButton: { borderRadius: 14 },
  searchButtonInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  recentChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  recentText: {
    fontSize: 11,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  intro: { alignItems: 'stretch' },
  introCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    overflow: 'hidden',
  },
  introBlob: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  introTitle: {
    marginTop: 10,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.white,
  },
  introText: {
    marginTop: 6,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  introSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  introStep: { flexDirection: 'row', alignItems: 'center' },
  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introLine: {
    width: 22,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
    backgroundColor: '#f3c2b5',
  },
  notFound: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  notFoundIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: {
    marginTop: 12,
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.text,
  },
  notFoundText: {
    marginTop: 4,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center' },
  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, marginHorizontal: 12 },
  summaryLabel: { fontSize: typography.size.xs, color: colors.textMuted },
  summaryStatus: {
    marginTop: 1,
    fontSize: typography.size.xl,
    fontWeight: '800',
    color: colors.text,
  },
  stageChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
  },
  stageChipText: {
    fontSize: typography.size.xs + 1,
    fontWeight: '800',
    color: '#047857',
  },
  progressTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: 4,
    backgroundColor: '#f0f0f4',
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  fact: {
    flexGrow: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#f7f7fa',
  },
  factLabel: { fontSize: 10.5, color: colors.textMuted },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  factValue: {
    flexShrink: 1,
    marginTop: 2,
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.text,
  },
  timelineTitle: {
    marginBottom: 12,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  stage: { flexDirection: 'row' },
  rail: { width: 32, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: '#059669' },
  dotCurrent: { backgroundColor: colors.primary },
  line: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginVertical: 2,
    backgroundColor: '#ececf1',
  },
  lineDone: { backgroundColor: '#059669' },
  stageText: { flex: 1, marginLeft: 10, paddingBottom: 16 },
  stageLabel: {
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  stageLabelIdle: {
    color: colors.textMuted,
    fontWeight: typography.weight.semiBold,
  },
  stageLabelCurrent: { color: colors.primary },
  stageDate: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});

export default TrackOrderScreen;
