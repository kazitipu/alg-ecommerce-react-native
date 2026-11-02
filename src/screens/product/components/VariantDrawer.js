import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FadeIn as FadeInValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import VariantSelector from './VariantSelector';
import PressableScale from '../../../components/PressableScale';
import { formatPrice } from '../../../utils/format';
import { getOptionValue, isFreeLocalShipping, localShippingLabel } from '../../../utils/productDetail';
import FreeBadge from '../../../components/FreeBadge';
import { colors, radius, spacing, typography } from '../../../theme';

const OPEN_SPRING = { damping: 20, stiffness: 190, mass: 0.9 };
// Dragged further than this (or flicked down) closes the drawer.
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;

const ACTIONS = {
  cart: { label: 'Add to Cart', icon: 'cart' },
  buy: { label: 'Buy Now', icon: 'flash' },
};

/**
 * Bottom drawer for choosing options, opened by Add to Cart / Buy Now (or the
 * "Select variants" card). It slides up over a fading backdrop and closes by
 * tapping outside, the close button, or dragging the handle down.
 *
 * The header follows the selection: the chosen colour's photo, the current
 * unit or tier price, and a summary of what is picked. The footer shows the
 * running total and confirms the action that opened the drawer; with no
 * action ("select") it offers both.
 */
const VariantDrawer = ({
  visible,
  action,
  onClose,
  onConfirm,
  submitting,
  shippingPending,
  localShipping,
  item,
  mode,
  colors: colorOptions,
  selectedColor,
  onSelectColor,
  quantities,
  onChangeQuantity,
  singleQuantity,
  onChangeSingle,
  totals,
  priceLabel,
  image,
  missingInfo,
  taka,
  symbol,
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withSpring(1, OPEN_SPRING);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 230 }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // `mounted` only guards the closing animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress, drag]);

  const pan = usePanGesture({
    onUpdate: event => {
      'worklet';
      drag.value = Math.max(0, event.translationY);
    },
    onDeactivate: event => {
      'worklet';
      if (event.translationY > CLOSE_DISTANCE || event.velocityY > CLOSE_VELOCITY) {
        runOnJS(onClose)();
      } else {
        drag.value = withSpring(0, OPEN_SPRING);
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(drag.value, [0, 400], [1, 0.3], 'clamp'),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height, 0]) + drag.value }],
  }));

  const stock = Number(item?.totalAvailableQuantity) || 0;
  const summary =
    mode === 'single'
      ? `${totals.totalQuantity} pc`
      : `${getOptionValue(selectedColor) || 'Choose a colour'} · ${totals.totalQuantity} pc selected`;

  const confirmButtons = action ? [action] : ['cart', 'buy'];

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { maxHeight: height * 0.88 }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.dragZone}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Animated.View key={image} entering={FadeInDown.duration(250)} style={styles.thumbWrap}>
                  {image ? <Image source={{ uri: image }} style={styles.thumb} /> : null}
                </Animated.View>
                <View style={styles.headerText}>
                  <Text style={styles.price}>{priceLabel}</Text>
                  {stock > 0 ? <Text style={styles.stock}>{stock.toLocaleString('en-US')} in stock</Text> : null}
                  <Text style={styles.summary} numberOfLines={1}>
                    {summary}
                  </Text>
                </View>
                <PressableScale onPress={onClose} scaleTo={0.85} hitSlop={10} style={styles.close} accessibilityLabel="Close">
                  <Icon name="close" size={18} color={colors.text} />
                </PressableScale>
              </View>
            </View>
          </GestureDetector>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <VariantSelector
              item={item}
              mode={mode}
              colors={colorOptions}
              selectedColor={selectedColor}
              onSelectColor={onSelectColor}
              quantities={quantities}
              onChangeQuantity={onChangeQuantity}
              singleQuantity={singleQuantity}
              onChangeSingle={onChangeSingle}
              taka={taka}
              symbol={symbol}
            />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            {missingInfo ? (
              <Animated.View entering={FadeInDown} style={styles.missing}>
                <Icon name="alert-circle" size={15} color="#c25e00" />
                <Text style={styles.missingText}>Please fill the missing information first</Text>
              </Animated.View>
            ) : null}
            {totals.totalQuantity > 0 && !missingInfo ? (
              <Animated.View entering={FadeInDown} style={styles.courier}>
                <View style={styles.courierIcon}>
                  <Icon name="bus" size={13} color="#e08a00" />
                </View>
                <View style={styles.courierText}>
                  <Text style={styles.courierLabel}>China local courier</Text>
                  <Text style={styles.courierHint}>Seller to our China warehouse · paid later</Text>
                </View>
                {shippingPending ? (
                  <View style={styles.courierPending}>
                    <ActivityIndicator size="small" color="#e08a00" />
                    <Text style={styles.courierPendingText}>Calculating…</Text>
                  </View>
                ) : isFreeLocalShipping(localShipping, totals.totalQuantity) ? (
                  <FreeBadge />
                ) : (
                  <Animated.Text key={localShippingLabel(localShipping, totals.totalQuantity, symbol)} entering={FadeInValue} style={styles.courierValue}>
                    {localShippingLabel(localShipping, totals.totalQuantity, symbol)}
                  </Animated.Text>
                )}
              </Animated.View>
            ) : null}
            <View style={styles.footerRow}>
              <View style={styles.totalCol}>
                <Text style={styles.totalLabel}>{totals.totalQuantity} pc · Total</Text>
                <Text style={styles.totalValue}>{formatPrice(totals.totalCost, symbol)}</Text>
              </View>
              {confirmButtons.map(key =>
                key === 'cart' && confirmButtons.length > 1 ? (
                  <PressableScale
                    key={key}
                    onPress={() => onConfirm(key)}
                    disabled={submitting || shippingPending}
                    scaleTo={0.95}
                    style={[styles.secondary, shippingPending && styles.waiting]}>
                    <Icon name="cart-outline" size={16} color={colors.primary} />
                    <Text style={styles.secondaryText}>{submitting ? 'Adding…' : 'Add to Cart'}</Text>
                  </PressableScale>
                ) : (
                  <PressableScale
                    key={key}
                    onPress={() => onConfirm(key)}
                    disabled={submitting || shippingPending}
                    scaleTo={0.95}
                    style={[styles.primaryShadow, confirmButtons.length === 1 && styles.primaryWide, shippingPending && styles.waiting]}>
                    <LinearGradient
                      colors={['#ff8a5c', colors.primary, '#e8344a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primary}>
                      <Icon name={ACTIONS[key].icon} size={15} color={colors.white} />
                      <Text style={styles.primaryText}>
                        {key === 'cart' && submitting ? 'Adding…' : ACTIONS[key].label}
                      </Text>
                    </LinearGradient>
                  </PressableScale>
                ),
              )}
            </View>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20, 22, 38, 0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dragZone: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ececf1' },
  handle: { alignSelf: 'center', width: 42, height: 5, marginTop: 10, borderRadius: 3, backgroundColor: '#e2e2e8' },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#1f2340',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  thumb: { width: '100%', height: '100%' },
  headerText: { flex: 1, marginLeft: 12, marginRight: 8 },
  courier: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#fff8ea',
  },
  courierIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffefc7' },
  courierText: { flex: 1, marginLeft: 10 },
  courierLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  courierHint: { marginTop: 1, fontSize: 10.5, color: colors.textMuted },
  courierValue: { fontSize: typography.size.sm + 1, fontWeight: '800', color: '#b86e00' },
  courierPending: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  courierPendingText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: '#b86e00' },
  price: { fontSize: typography.size.xl + 2, fontWeight: '800', color: colors.primary },
  stock: { marginTop: 2, fontSize: typography.size.xs, color: colors.textMuted },
  summary: { marginTop: 4, fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.text },
  close: {
    alignSelf: 'flex-start',
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0 },
  bodyContent: { padding: spacing.md },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf1',
  },
  missing: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 8, borderRadius: 10, backgroundColor: '#fff3e0' },
  missingText: { marginLeft: 6, fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: '#c25e00' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  pendingText: { fontSize: typography.size.xs + 1, fontWeight: typography.weight.semiBold, color: colors.primary },
  waiting: { opacity: 0.45 },
  totalCol: { flex: 1 },
  totalLabel: { fontSize: typography.size.xxs + 1, color: colors.textMuted },
  totalValue: { fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  secondary: { flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.primarySoft },
  secondaryText: { marginLeft: 5, fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  primaryShadow: {
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryWide: { flex: 1.2 },
  primary: { flexDirection: 'row', height: 46, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { marginLeft: 6, color: colors.white, fontSize: typography.size.sm, fontWeight: typography.weight.bold, letterSpacing: 0.3 },
});

export default VariantDrawer;
