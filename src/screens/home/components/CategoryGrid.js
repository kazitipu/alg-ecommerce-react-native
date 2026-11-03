import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import RouteChip from '../../../components/RouteChip';
import PatternBackground from './PatternBackground';
import SectionHeader from './SectionHeader';
import Tilt from './Tilt';
import { HOME_CATEGORIES } from '../../../constants/categories';
import { colors, spacing, tints, typography } from '../../../theme';

// Compact parcels: about five fit across a phone before the row scrolls.
const CARD_WIDTH = 70;
const GAP = 10;
const SIDE_PADDING = spacing.md;
// Parcel tape colours, carried over from the old pegs.
const TAPE_COLORS = ['#ffc23d', '#ff7aa2', '#6c7bff', '#3ccf91', '#ff9f43'];

// Two rows of parcels, filled left to right.
const PER_ROW = Math.ceil(HOME_CATEGORIES.length / 2);
const ROWS = [HOME_CATEGORIES.slice(0, PER_ROW), HOME_CATEGORIES.slice(PER_ROW)];
const CONTENT_WIDTH = SIDE_PADDING * 2 + PER_ROW * CARD_WIDTH + (PER_ROW - 1) * GAP;

const ParcelCard = ({ category, index, onSelect }) => (
  <Animated.View
    entering={FadeInDown.delay(index * 55).duration(360)}
    style={styles.slot}>
    <Tilt index={index} motion="float">
      <PressableScale onPress={() => onSelect(category)} scaleTo={0.93} style={styles.card}>
        <View style={[styles.imageWrap, { backgroundColor: tints[index % tints.length] }]}>
          <Image source={category.image} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {category.name}
        </Text>
      </PressableScale>
      {/* A strip of packing tape across the top makes each card a parcel. */}
      <View
        pointerEvents="none"
        style={[styles.tape, { backgroundColor: TAPE_COLORS[index % TAPE_COLORS.length] }]}
      />
    </Tilt>
  </Animated.View>
);

/**
 * Category parcels in two rows, with a China → Bangladesh route
 * chip in the header — ALG's cross-border shipping, at a glance. A parcel's
 * name is also the search keyword, as on the web, so tapping one opens that
 * collection.
 */
const CategoryGrid = ({ onSelect, variant = 5 }) => (
  <View style={styles.container}>
    <PatternBackground variant={variant} />
    <SectionHeader
      title="Shop by category"
      subtitle="Shipped from China to your door"
      accessory={<RouteChip />}
    />

    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: CONTENT_WIDTH }}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.rowBlock}>
            <View style={styles.row}>
              {row.map((category, index) => (
                <ParcelCard
                  key={category.name}
                  category={category}
                  index={rowIndex * PER_ROW + index}
                  onSelect={onSelect}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  rowBlock: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', paddingHorizontal: SIDE_PADDING, paddingTop: 8 },
  slot: { width: CARD_WIDTH, marginRight: GAP },
  card: {
    padding: 4,
    paddingBottom: 6,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: {
    width: CARD_WIDTH - 8,
    height: CARD_WIDTH - 14,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: 38, height: 38 },
  label: {
    marginTop: 5,
    height: 26,
    fontSize: 10.5,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  tape: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 30,
    height: 11,
    borderRadius: 2,
    opacity: 0.88,
    transform: [{ rotate: '-4deg' }],
  },
});

export default CategoryGrid;
