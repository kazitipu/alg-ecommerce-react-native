import React from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Carousel } from 'react-native-reanimated-carousel';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import Skeleton from '../../../components/Skeleton';
import { colors, radius, shadow, spacing } from '../../../theme';

const AUTOPLAY_INTERVAL = 5000;
// The admin uploads 2:1 banners, so every slide is cropped to that one shape.
const ASPECT_RATIO = 2;

/** One pagination dot that stretches into a pill as its slide comes in. */
const Dot = ({ index, count, progress }) => {
  const style = useAnimatedStyle(() => {
    // A looping carousel's progress keeps counting past the last slide, so fold
    // it back into range, then measure the distance the short way round.
    const position = ((progress.value % count) + count) % count;
    let distance = Math.abs(position - index);
    distance = Math.min(distance, count - distance);
    return {
      width: interpolate(distance, [0, 1], [22, 7], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.45], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
};

/**
 * Full-width hero slider. Each page is exactly one screen wide with the image
 * inset by the page gutter, so every banner is the same size and neighbouring
 * banners never peek in at the edges.
 *
 * Banners are display-only, as on the web home page. Entries flagged
 * `secondBanner` are the desktop side promo and are left out here.
 */
const HeroCarousel = ({ banners }) => {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  const imageWidth = width - spacing.md * 2;
  const height = Math.round(imageWidth / ASPECT_RATIO);
  const slides = (banners || []).filter(banner => !banner.secondBanner && banner.banner);

  if (slides.length === 0) {
    return (
      <View style={styles.gutter}>
        <Skeleton width={imageWidth} height={height} borderRadius={radius.xl} />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(600)}>
      <Carousel
        style={{ width, height: height + spacing.md }}
        itemSize={width}
        data={slides}
        loop={slides.length > 1}
        scrollEnabled={slides.length > 1}
        autoplay={slides.length > 1}
        autoplayInterval={AUTOPLAY_INTERVAL}
        animation={{ type: 'timing', duration: 900 }}
        progress={progress}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <View style={[styles.card, { width: imageWidth, height }]}>
              <Image source={{ uri: item.banner }} style={styles.image} resizeMode="cover" />
            </View>
          </View>
        )}
      />

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <Dot key={slide.id || index} index={index} count={slides.length} progress={progress} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  page: { flex: 1, alignItems: 'center', paddingTop: spacing.md },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  image: { width: '100%', height: '100%', borderRadius: radius.xl },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: colors.primary,
  },
});

export default HeroCarousel;
