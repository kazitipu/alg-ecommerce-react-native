import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import { colors, typography } from '../../../theme';

const EASE = Easing.out(Easing.cubic);
const INK = '#1f2340';

/**
 * The photo a search was made with, shown above the results as the web does
 * (it keeps the uploaded preview next to the list). Tap the picture to see it
 * larger; "New photo" searches again with another one.
 */
const PhotoSearchBanner = ({ uri, loading, count, searching, onNewPhoto }) => {
  const [open, setOpen] = useState(false);

  const status = loading
    ? 'Finding similar products…'
    : count > 0
      ? `${count} similar ${count === 1 ? 'product' : 'products'} found`
      : 'No close matches yet';

  return (
    <Animated.View entering={FadeInDown.duration(360).easing(EASE)} style={styles.card}>
      <PressableScale
        onPress={uri ? () => setOpen(true) : undefined}
        scaleTo={0.95}
        style={styles.thumbWrap}
        accessibilityLabel="View the searched photo"
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="image-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cameraBadge}>
          <Icon name="camera" size={11} color={colors.white} />
        </View>
      </PressableScale>

      <View style={styles.text}>
        <Text style={styles.label}>Searched with this photo</Text>
        <View style={styles.statusRow}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          <Text style={styles.status} numberOfLines={1}>
            {status}
          </Text>
        </View>
      </View>

      {onNewPhoto ? (
        <PressableScale onPress={searching ? undefined : onNewPhoto} scaleTo={0.94} style={styles.newPhoto}>
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Icon name="images-outline" size={14} color={colors.primary} />
              <Text style={styles.newPhotoText}>New photo</Text>
            </>
          )}
        </PressableScale>
      ) : null}

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        {open ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
            <Image source={{ uri }} style={styles.large} resizeMode="contain" />
            <PressableScale onPress={() => setOpen(false)} scaleTo={0.9} style={styles.close} accessibilityLabel="Close">
              <Icon name="close" size={20} color={colors.white} />
            </PressableScale>
          </Animated.View>
        ) : null}
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  thumbWrap: { width: 60, height: 60 },
  thumb: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#f1f1f5' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  text: { flex: 1, marginLeft: 14 },
  label: { fontSize: typography.size.sm + 1, fontWeight: '800', color: INK },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  status: { flexShrink: 1, fontSize: typography.size.xs + 1, color: colors.textSecondary },
  newPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 96,
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fff3ef',
  },
  newPhotoText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold, color: colors.primary },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12, 13, 24, 0.92)' },
  large: { width: '92%', height: '70%' },
  close: {
    position: 'absolute',
    top: 54,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

export default PhotoSearchBanner;
