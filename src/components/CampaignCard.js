import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { toDate } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme';

/** Remaining days/hours/minutes/seconds until `expiryDate`, or null once past. */
const getRemaining = expiryDate => {
  const end = toDate(expiryDate);
  if (!end) return null;

  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

const pad = value => String(value).padStart(2, '0');

/** Promotional banner with a live countdown, as on the web home page. */
const CampaignCard = ({ campaign, onPress }) => {
  const [remaining, setRemaining] = useState(() => getRemaining(campaign.expiryDate));

  useEffect(() => {
    const timer = setInterval(
      () => setRemaining(getRemaining(campaign.expiryDate)),
      1000,
    );
    return () => clearInterval(timer);
  }, [campaign.expiryDate]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image
        source={{ uri: campaign.banner || campaign.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {campaign.name || campaign.title}
        </Text>

        {remaining ? (
          <Text style={styles.countdown}>
            Ends in {remaining.days}d {pad(remaining.hours)}:{pad(remaining.minutes)}:
            {pad(remaining.seconds)}
          </Text>
        ) : (
          <Text style={styles.ended}>Campaign ended</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 260,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 120, backgroundColor: colors.surfaceAlt },
  body: { padding: spacing.sm },
  title: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  countdown: {
    marginTop: 2,
    fontSize: typography.size.xs,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  ended: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
});

export default CampaignCard;
