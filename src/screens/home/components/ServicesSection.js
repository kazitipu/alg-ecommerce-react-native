import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import PatternBackground from './PatternBackground';
import SectionHeader from './SectionHeader';
import Tilt from './Tilt';
import {
  BuyForMeIcon,
  FaqIcon,
  HowToOrderIcon,
  RatesIcon,
  RequestProductIcon,
  TrackOrderIcon,
} from './ServiceIcons';
import PressableScale from '../../../components/PressableScale';
import { ROUTES } from '../../../navigation/routes';
import { colors, spacing, typography } from '../../../theme';

const COLUMNS = 3;
const GAP = 12;

/**
 * `inHomeStack` screens are pushed in place; the rest live in the Account tab
 * and are opened there.
 */
const SERVICES = [
  {
    title: 'Buy for me',
    caption: 'We buy it for you',
    route: ROUTES.BUY_FOR_ME,
    inHomeStack: true,
    Icon: BuyForMeIcon,
    colors: ['#ffa24c', '#ff4a4e'],
    tint: '#fff2ea',
    badge: { label: 'Popular', background: '#ffe4d6', color: '#f05a1a' },
  },
  {
    title: 'Track order',
    caption: 'See where it is',
    route: ROUTES.TRACK_ORDER,
    Icon: TrackOrderIcon,
    colors: ['#3ddc97', '#059669'],
    tint: '#eafaf2',
    badge: { label: 'Live', background: '#d4f5e6', color: '#05875f' },
  },
  {
    title: 'Request product',
    caption: "Can't find it?",
    route: ROUTES.REQUEST_PRODUCT,
    inHomeStack: true,
    Icon: RequestProductIcon,
    colors: ['#b39afc', '#7c3aed'],
    tint: '#f4efff',
    badge: { label: 'New', background: '#ebe1ff', color: '#7c3aed' },
  },
  {
    title: 'How to order',
    caption: 'Step-by-step guide',
    route: ROUTES.HOW_TO_ORDER,
    Icon: HowToOrderIcon,
    colors: ['#ffd04d', '#f59e0b'],
    tint: '#fff8e6',
    badge: { label: 'Guide', background: '#fff0c7', color: '#c77700' },
  },
  {
    title: 'Tax & shipping',
    caption: 'Charges explained',
    route: ROUTES.TAX_AND_SHIPPING,
    Icon: RatesIcon,
    colors: ['#ff8fc4', '#db2777'],
    tint: '#fff0f6',
    badge: { label: 'Rates', background: '#ffdcec', color: '#c81e6a' },
  },
  {
    title: 'FAQ',
    caption: 'Answers to questions',
    route: ROUTES.FAQ,
    Icon: FaqIcon,
    colors: ['#6cc4ff', '#2563eb'],
    tint: '#eaf3ff',
    badge: { label: 'Help', background: '#dbeafe', color: '#1d4ed8' },
  },
];

const ServiceCard = ({ service, index, width, onPress }) => {
  const { Icon } = service;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 70).springify().damping(14)}
      style={{ width }}>
      <Tilt index={index + 2}>
        <PressableScale onPress={onPress} scaleTo={0.93} style={styles.card}>
          <Text
            style={[
              styles.badge,
              { backgroundColor: service.badge.background, color: service.badge.color },
            ]}>
            {service.badge.label}
          </Text>
          <View style={[styles.iconWrap, { backgroundColor: service.tint }]}>
            <Icon size={36} from={service.colors[0]} to={service.colors[1]} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {service.title}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {service.caption}
          </Text>
        </PressableScale>
      </Tilt>
    </Animated.View>
  );
};

/** Shortcuts into ALG's own services, shown under the category strings. */
const ServicesSection = ({ variant = 0 }) => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const open = service =>
    service.inHomeStack
      ? navigation.navigate(service.route)
      : navigation.navigate(ROUTES.TAB_ACCOUNT, { screen: service.route, initial: false });

  return (
    <View style={styles.container}>
      <PatternBackground variant={variant} />
      <SectionHeader title="Our services" subtitle="Everything ALG can do for you" />
      <View style={styles.grid}>
        {SERVICES.map((service, index) => (
          <ServiceCard
            key={service.title}
            service={service}
            index={index}
            width={cardWidth}
            onPress={() => open(service)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    rowGap: GAP + 2,
  },
  card: {
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 12,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 8.5,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 9,
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  caption: { marginTop: 2, fontSize: typography.size.xxs, color: colors.textMuted },
});

export default ServicesSection;
