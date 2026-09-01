import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Paging image carousel with dot indicators, replacing `react-slick` for the
 * home banners. Built on FlatList so it recycles cells and needs no extra
 * dependency.
 */
const Carousel = ({
  data,
  onPressItem,
  height = 180,
  width = SCREEN_WIDTH - spacing.lg * 2,
  imageKey = 'banner',
  showDots = true,
}) => {
  const [index, setIndex] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setIndex(viewableItems[0].index ?? 0);
  }).current;

  if (!data?.length) return null;

  return (
    <View>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, position) => item?.id || String(position)}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <Pressable
            onPress={onPressItem ? () => onPressItem(item) : undefined}
            style={{ width }}>
            <Image
              source={{ uri: item[imageKey] || item.imageUrl || item.image }}
              style={[styles.image, { width, height }]}
              resizeMode="cover"
            />
          </Pressable>
        )}
      />

      {showDots && data.length > 1 ? (
        <View style={styles.dots}>
          {data.map((item, position) => (
            <View
              key={item?.id || position}
              style={[styles.dot, position === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  image: { borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});

export default Carousel;
