import React, { useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRoute } from '@react-navigation/native';

import { colors, spacing, typography } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * One pinch-and-pan zoomable image.
 *
 * The web app used `react-image-magnify`, a hover-zoom that measured DOM nodes
 * and has no touch equivalent. This is the native gesture instead: pinch to
 * zoom, drag to pan, double-tap to toggle. Built directly on reanimated and
 * gesture-handler because the obvious library, `react-native-awesome-gallery`,
 * still peers on gesture-handler v2 while this project runs v3.
 */
const ZoomableImage = ({ uri }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      const next = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(next, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) reset();
    });

  // Panning only makes sense once the image is larger than the screen.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(event => {
      if (scale.value <= MIN_SCALE) return;
      const maxX = ((scale.value - 1) * SCREEN_WIDTH) / 2;
      const maxY = ((scale.value - 1) * SCREEN_HEIGHT) / 4;
      translateX.value = Math.min(Math.max(savedX.value + event.translationX, -maxX), maxX);
      translateY.value = Math.min(Math.max(savedY.value + event.translationY, -maxY), maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        reset();
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={styles.page}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

/** Full-screen pager over a product's photos. */
const GalleryScreen = () => {
  const route = useRoute();
  const images = route.params?.images || [];
  const [index, setIndex] = useState(route.params?.initialIndex || 0);

  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.counter}>No photos to show</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, position) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * position,
          index: position,
        })}
        keyExtractor={(uri, position) => `${uri}-${position}`}
        onMomentumScrollEnd={event =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))
        }
        renderItem={({ item }) =>
          typeof item === 'string' ? (
            <ZoomableImage uri={item} />
          ) : (
            <View style={styles.page}>
              <Image source={{ uri: item?.url }} style={styles.image} resizeMode="contain" />
            </View>
          )
        }
      />

      {images.length > 1 ? (
        <Text style={styles.counter}>
          {index + 1} / {images.length}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, justifyContent: 'center' },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: SCREEN_WIDTH, height: '80%' },
  counter: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    color: colors.white,
    fontSize: typography.size.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
});

export default GalleryScreen;
