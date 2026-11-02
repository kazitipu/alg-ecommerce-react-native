import React, { useEffect, useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import SectionHeader from './SectionHeader';
import { toDate } from '../../../utils/format';
import { colors, gradients, radius, shadow, spacing, typography } from '../../../theme';

/**
 * When a campaign stops. The admin stores `expiryDate` as "YYYY-MM-DD", and the
 * web counts down to that date with one day added, i.e. the campaign runs to
 * the end of its expiry day in the shopper's local time.
 */
const getEnd = expiryDate => {
  if (typeof expiryDate === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(expiryDate)) {
    const [year, month, day] = expiryDate.split('-').map(Number);
    return new Date(year, month - 1, day + 1);
  }
  return toDate(expiryDate);
};

const getRemaining = (expiryDate, now) => {
  const end = getEnd(expiryDate);
  if (!end) return null;

  const seconds = Math.floor((end.getTime() - now) / 1000);
  if (seconds <= 0) return null;

  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
};

const pad = value => String(value).padStart(2, '0');

const TimeBox = ({ value, unit }) => (
  <View style={styles.timeBox}>
    <Text style={styles.timeValue}>{pad(value)}</Text>
    <Text style={styles.timeUnit}>{unit}</Text>
  </View>
);

const CampaignCard = ({ campaign, now, width, onPress }) => {
  const remaining = getRemaining(campaign.expiryDate, now);

  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={[styles.card, { width }]}>
      <ImageBackground
        source={{ uri: campaign.banner }}
        style={styles.image}
        imageStyle={styles.imageRadius}
        resizeMode="cover">
        <LinearGradient colors={gradients.scrim} style={styles.scrim} />

        <View style={styles.timer}>
          {remaining ? (
            <>
              <Icon name="time-outline" size={13} color={colors.white} />
              <Text style={styles.endsIn}>Ends in</Text>
              <TimeBox value={remaining.days} unit="d" />
              <TimeBox value={remaining.hours} unit="h" />
              <TimeBox value={remaining.minutes} unit="m" />
              <TimeBox value={remaining.seconds} unit="s" />
            </>
          ) : (
            <Text style={styles.endsIn}>Campaign ended</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.name} numberOfLines={1}>
            {campaign.name}
          </Text>
          <View style={styles.shopNow}>
            <Text style={styles.shopNowText}>Shop now</Text>
            <Icon name="arrow-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </ImageBackground>
    </PressableScale>
  );
};

/**
 * Admin-run campaigns, each with a live countdown. One timer drives every card,
 * like the web page's single `tick`, and stops when the section unmounts.
 */
const CampaignSection = ({ campaigns, onSelect }) => {
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!campaigns?.length) return null;

  // A single campaign fills the row; several show a hint of the next card.
  const cardWidth = campaigns.length === 1 ? width - spacing.md * 2 : Math.round(width * 0.8);

  return (
    <View style={styles.container}>
      <SectionHeader title="Campaigns" subtitle="Limited-time deals" icon="flash" />
      <FlatList
        data={campaigns}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing.sm + 4}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        keyExtractor={(item, index) => item.id || item.name || String(index)}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 90).springify().damping(16)}>
            <CampaignCard
              campaign={item}
              now={now}
              width={cardWidth}
              onPress={() => onSelect(item)}
            />
          </Animated.View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  list: { paddingHorizontal: spacing.md },
  card: {
    marginRight: spacing.sm + 4,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  image: { height: 170, justifyContent: 'space-between' },
  imageRadius: { borderRadius: radius.xl },
  scrim: { ...StyleSheet.absoluteFill, borderRadius: radius.xl },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    margin: spacing.sm + 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  endsIn: {
    color: colors.white,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    marginLeft: 4,
    marginRight: 4,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  timeValue: { color: colors.white, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  timeUnit: { color: 'rgba(255, 255, 255, 0.85)', fontSize: 9, marginLeft: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 4,
  },
  name: {
    flex: 1,
    color: colors.white,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginRight: spacing.sm,
  },
  shopNow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  shopNowText: {
    color: colors.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    marginRight: 3,
  },
});

export default CampaignSection;
