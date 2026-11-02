import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Video, { ViewType } from 'react-native-video';

import PressableScale from '../../../components/PressableScale';
import { colors, radius, spacing, typography } from '../../../theme';

const THUMB = 58;

/** Marketplace video links sometimes come as http://, which release builds block. */
export const playableVideoUrl = url => String(url || '').trim().replace(/^http:\/\//i, 'https://').replace(/^\/\//, 'https://');


/**
 * Product media, following the web: the product video (when the listing has
 * one) plays in place, photos page horizontally, a thumbnail strip jumps
 * between them, and choosing a colour swaps in that colour's photo. Tapping a
 * photo opens the full-screen gallery.
 */
const ProductGallery = ({ images, video, colorImage, onOpenGallery }) => {
  const { width } = useWindowDimensions();
  const pager = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoUrl = playableVideoUrl(video?.Url);

  // A chosen colour's photo takes over the main frame until another photo is picked.
  const [overrideImage, setOverrideImage] = useState(null);
  useEffect(() => {
    if (colorImage) {
      setOverrideImage(colorImage);
      setPlaying(false);
    }
  }, [colorImage]);

  const showVideo = Boolean(videoUrl) && playing && !overrideImage;

  const goTo = next => {
    setOverrideImage(null);
    setPlaying(false);
    setIndex(next);
    pager.current?.scrollToIndex({ index: next, animated: true });
  };

  return (
    <View>
      <View style={[styles.stage, { width, height: width }]}>
        {showVideo ? (
          <View style={StyleSheet.absoluteFill}>
            {failed ? (
              <View style={styles.videoError}>
                <Icon name="alert-circle" size={30} color={colors.white} />
                <Text style={styles.videoErrorTitle}>This video can't play here</Text>
                <View style={styles.videoErrorActions}>
                  <PressableScale onPress={() => Linking.openURL(videoUrl).catch(() => {})} scaleTo={0.94} style={styles.videoErrorButton}>
                    <Icon name="open-outline" size={14} color={colors.white} />
                    <Text style={styles.videoErrorButtonText}>Open in browser</Text>
                  </PressableScale>
                  <PressableScale onPress={() => setPlaying(false)} scaleTo={0.94} style={[styles.videoErrorButton, styles.videoErrorGhost]}>
                    <Text style={styles.videoErrorButtonText}>Back to photos</Text>
                  </PressableScale>
                </View>
              </View>
            ) : (
              <>
                <Video
                  source={{
                    uri: videoUrl,
                    // Taobao's video CDN rejects requests without a browser-like agent.
                    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' },
                  }}
                  style={StyleSheet.absoluteFill}
                  // A TextureView draws inside the app's views; the default SurfaceView
                  // can stay black behind them on some phones (notably Xiaomi/Redmi).
                  viewType={ViewType.TEXTURE}
                  controls
                  resizeMode="contain"
                  poster={video?.PreviewUrl || images[0]}
                  posterResizeMode="contain"
                  onLoadStart={() => setBuffering(true)}
                  onLoad={() => setBuffering(false)}
                  onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
                  onError={() => {
                    setBuffering(false);
                    setFailed(true);
                  }}
                  onEnd={() => setPlaying(false)}
                />
                {buffering ? (
                  <View pointerEvents="none" style={styles.videoLoading}>
                    <ActivityIndicator size="large" color={colors.white} />
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : overrideImage ? (
          <Pressable onPress={() => onOpenGallery(Math.max(images.indexOf(overrideImage), 0))}>
            <Image source={{ uri: overrideImage }} style={{ width, height: width }} resizeMode="cover" />
          </Pressable>
        ) : (
          <FlatList
            ref={pager}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, position) => `${uri}-${position}`}
            getItemLayout={(_, position) => ({ length: width, offset: width * position, index: position })}
            onMomentumScrollEnd={event =>
              setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item: uri, index: position }) => (
              <Pressable onPress={() => onOpenGallery(position)}>
                <Image source={{ uri }} style={{ width, height: width }} resizeMode="cover" />
              </Pressable>
            )}
          />
        )}

        {!showVideo && images.length > 1 ? (
          <View style={styles.counter}>
            <Icon name="images-outline" size={12} color={colors.white} />
            <Text style={styles.counterText}>
              {Math.min(index + 1, images.length)}/{images.length}
            </Text>
          </View>
        ) : null}

        {videoUrl && !showVideo ? (
          <PressableScale
            onPress={() => {
              setOverrideImage(null);
              setFailed(false);
              setPlaying(true);
            }}
            scaleTo={0.92}
            accessibilityLabel="Play product video"
            style={styles.playPill}>
            <Icon name="play" size={14} color={colors.white} />
            <Text style={styles.playText}>Video</Text>
          </PressableScale>
        ) : null}
      </View>

      {images.length > 1 || videoUrl ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbs}>
          {videoUrl ? (
            // The badge sits beside the pressable rather than inside it: an
            // absolute child of the animated, clipped pressable does not draw on Android.
            <View>
              <PressableScale
                onPress={() => {
                  setOverrideImage(null);
                  setFailed(false);
                  setPlaying(true);
                }}
                scaleTo={0.92}
                accessibilityLabel="Play product video"
                style={[styles.thumb, showVideo && styles.thumbActive]}>
                <Image source={{ uri: video.PreviewUrl || images[0] }} style={styles.thumbImage} />
              </PressableScale>
              <View pointerEvents="none" style={styles.thumbPlay}>
                <View style={styles.thumbPlayIcon}>
                  <Icon name="play" size={13} color={colors.primary} />
                </View>
                <Text style={styles.thumbPlayText}>VIDEO</Text>
              </View>
            </View>
          ) : null}
          {images.map((uri, position) => (
            <PressableScale
              key={`${uri}-${position}`}
              onPress={() => goTo(position)}
              scaleTo={0.92}
              style={[
                styles.thumb,
                !showVideo && !overrideImage && position === index && styles.thumbActive,
                overrideImage === uri && styles.thumbActive,
              ]}>
              <Image source={{ uri }} style={styles.thumbImage} />
            </PressableScale>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { backgroundColor: colors.surfaceAlt },
  videoLoading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  videoError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#14162a',
  },
  videoErrorTitle: { marginTop: 10, color: colors.white, fontSize: typography.size.md, fontWeight: '800' },
  videoErrorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  videoErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  videoErrorGhost: { backgroundColor: 'rgba(255,255,255,0.16)' },
  videoErrorButtonText: { color: colors.white, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold },
  counter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(20, 22, 38, 0.55)',
  },
  counterText: { marginLeft: 4, color: colors.white, fontSize: typography.size.xs, fontWeight: typography.weight.semiBold },
  playPill: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  playText: { marginLeft: 4, color: colors.white, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  thumbs: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  thumbActive: { borderColor: colors.primary },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlay: {
    ...StyleSheet.absoluteFill,
    margin: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 22, 38, 0.45)',
  },
  thumbPlayIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlayText: { marginTop: 2, color: colors.white, fontSize: 8.5, fontWeight: typography.weight.bold, letterSpacing: 0.5 },
});

export default ProductGallery;
