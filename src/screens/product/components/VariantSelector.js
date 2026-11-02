import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import PressableScale from '../../../components/PressableScale';
import QtyStepper from '../../../components/QtyStepper';
import { formatPrice } from '../../../utils/format';
import {
  getColorName,
  getOptionValue,
  getSizeName,
  getSizesForColor,
  getVariantImage,
  normalizeSingleQuantity,
  skuPriceInTaka,
  stepSingleQuantity,
} from '../../../utils/productDetail';
import { colors, radius, spacing, typography } from '../../../theme';
import { appAlert } from '../../../utils/appAlert';

// The web shows the first three rows and folds the rest behind "View all".

const SWATCH_WIDTH = 68;
const SWATCH_GAP = 10;

/**
 * How the colour swatches are laid out in `width`: a wrapping grid while they
 * fit in two rows; otherwise two rows that scroll sideways together, the
 * first holding the first half of the colours and the second the rest.
 */
export const swatchLayout = (width, count) => {
  const perRow = width > 0 ? Math.max(1, Math.floor((width + SWATCH_GAP) / (SWATCH_WIDTH + SWATCH_GAP))) : Infinity;
  if (count <= perRow * 2) return { scroll: false, firstRow: count };
  return { scroll: true, firstRow: Math.ceil(count / 2) };
};

const VISIBLE_ROWS = 3;

/** One row of a variant table: option, its own price, stock, and a stepper. */
const VariantRow = ({ label, image, variant, quantity, onChange, batch, taka, symbol }) => {
  const stock = parseInt(variant.quantity, 10) || 0;
  const selected = quantity > 0;

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.rowOption}>
        {image ? <Image source={{ uri: image }} style={styles.rowImage} /> : null}
        <Text style={styles.rowLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <View style={styles.rowPriceCol}>
        <Text style={styles.rowPrice}>{formatPrice(skuPriceInTaka(variant, taka), symbol)}</Text>
        <Text style={styles.rowStock}>{stock} in stock</Text>
      </View>
      {stock > 0 ? (
        <QtyStepper value={quantity} onChange={onChange} batch={batch} available={stock} />
      ) : (
        <Text style={styles.outOfStock}>Out of Stock</Text>
      )}
    </View>
  );
};

/** A list of rows that shows three and folds the rest behind "View all". */
const FoldingRows = ({ rows, renderRow }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, VISIBLE_ROWS);

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      {visible.map(renderRow)}
      {rows.length > VISIBLE_ROWS ? (
        <PressableScale onPress={() => setExpanded(!expanded)} scaleTo={0.96} style={styles.viewAll}>
          <Text style={styles.viewAllText}>{expanded ? 'Show less' : `View all (${rows.length})`}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
        </PressableScale>
      ) : null}
    </Animated.View>
  );
};

/**
 * Option picking, in the web's three modes:
 *  - `colorSize`: colour swatches (each with its selected count) and a size
 *    table for the chosen colour
 *  - `colorOnly`: a table of the listing's variants
 *  - `single`: one quantity for the whole product, stepped by pack size and
 *    capped at the available stock
 */
const VariantSelector = ({
  item,
  mode,
  colors: colorOptions,
  selectedColor,
  onSelectColor,
  quantities,
  onChangeQuantity,
  singleQuantity,
  onChangeSingle,
  taka,
  symbol,
}) => {
  const batch = Number(item.batch) > 1 ? Number(item.batch) : 1;
  const [colorLabel, sizeLabel] = item.propertyNames || [];

  if (mode === 'single') {
    const step = direction => {
      const result = stepSingleQuantity(singleQuantity, direction, item);
      if (result.alert) appAlert('', result.alert);
      onChangeSingle(result.value);
    };
    const disabled = (Number(item.totalAvailableQuantity) || 0) <= 0;

    return (
      <View style={[styles.single, disabled && styles.disabled]}>
        <Text style={styles.groupTitle}>Quantity</Text>
        <View style={styles.singleStepper}>
          <PressableScale onPress={disabled ? undefined : () => step(-1)} scaleTo={0.85} style={styles.singleButton} accessibilityLabel="Decrease quantity">
            <Icon name="remove" size={18} color={colors.text} />
          </PressableScale>
          <TextInput
            style={styles.singleInput}
            value={String(singleQuantity)}
            onChangeText={text => onChangeSingle(normalizeSingleQuantity(text, item))}
            keyboardType="number-pad"
            editable={!disabled}
            selectTextOnFocus
          />
          <PressableScale onPress={disabled ? undefined : () => step(1)} scaleTo={0.85} style={[styles.singleButton, styles.singleButtonPrimary]} accessibilityLabel="Increase quantity">
            <Icon name="add" size={18} color={colors.white} />
          </PressableScale>
        </View>
      </View>
    );
  }

  const colorCount = properties =>
    Object.entries(quantities).reduce(
      (total, [key, quantity]) => (key.split(';')[0] === properties ? total + (Number(quantity) || 0) : total),
      0,
    );

  const renderSwatch = option => {
    const active = option.properties === selectedColor?.properties;
    const count = colorCount(option.properties);
    return (
      <PressableScale
        key={option.properties}
        onPress={() => onSelectColor(option)}
        scaleTo={0.92}
        style={[styles.swatch, active && styles.swatchActive]}>
        {option.url ? (
          <Image source={{ uri: option.url }} style={styles.swatchImage} />
        ) : (
          <View style={styles.swatchTextWrap}>
            <Text style={styles.swatchText} numberOfLines={2}>
              {getOptionValue(option)}
            </Text>
          </View>
        )}
        {option.url ? (
          <Text style={styles.swatchLabel} numberOfLines={1}>
            {getOptionValue(option).slice(0, 8)}
          </Text>
        ) : null}
        {count > 0 ? (
          <Animated.View entering={FadeIn} style={styles.swatchBadge}>
            <Text style={styles.swatchBadgeText}>{count}</Text>
          </Animated.View>
        ) : null}
      </PressableScale>
    );
  };

  return (
    <View>
      {mode === 'colorSize' ? (
        <>
          <Text style={styles.groupTitle}>
            {colorLabel || 'Color'}: <Text style={styles.groupValue}>{getOptionValue(selectedColor)}</Text>
          </Text>
          <SwatchGrid options={colorOptions} selected={selectedColor} renderSwatch={renderSwatch} />

          <Text style={[styles.groupTitle, styles.groupSpacing]}>{sizeLabel || 'Size'}</Text>
          <FoldingRows
            key={selectedColor?.properties}
            rows={getSizesForColor(item, selectedColor?.properties)}
            renderRow={variant => (
              <VariantRow
                key={variant.properties}
                label={getSizeName(variant.properties_name)}
                variant={variant}
                quantity={quantities[variant.properties] || 0}
                onChange={quantity => onChangeQuantity(variant.properties, quantity)}
                batch={batch}
                taka={taka}
                symbol={symbol}
              />
            )}
          />
        </>
      ) : (
        <>
          <Text style={styles.groupTitle}>{colorLabel || 'Color'}</Text>
          <FoldingRows
            rows={item.variants || []}
            renderRow={variant => (
              <VariantRow
                key={variant.properties}
                label={getColorName(variant.properties_name)}
                image={getVariantImage(colorOptions, variant.properties)}
                variant={variant}
                quantity={quantities[variant.properties] || 0}
                onChange={quantity => onChangeQuantity(variant.properties, quantity)}
                batch={batch}
                taka={taka}
                symbol={symbol}
              />
            )}
          />
        </>
      )}
    </View>
  );
};

/**
 * The colour swatches: a wrapping grid while they fit in two rows, otherwise
 * two rows in a sideways scroller, with the chosen colour scrolled into view.
 */
const SwatchGrid = ({ options, selected, renderSwatch }) => {
  const [width, setWidth] = useState(0);
  const scroller = useRef(null);
  const layout = swatchLayout(width, options.length);

  const selectedIndex = options.findIndex(option => option.properties === selected?.properties);
  const column = selectedIndex < 0 ? 0 : selectedIndex % layout.firstRow;
  useEffect(() => {
    if (!layout.scroll || column <= 0) return undefined;
    const offset = Math.max(0, column * (SWATCH_WIDTH + SWATCH_GAP) - SWATCH_WIDTH);
    const timer = setTimeout(() => scroller.current?.scrollTo({ x: offset, animated: true }), 250);
    return () => clearTimeout(timer);
  }, [layout.scroll, column]);

  if (!layout.scroll) {
    return (
      <View style={styles.swatches} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {options.map(renderSwatch)}
      </View>
    );
  }

  const rows = [options.slice(0, layout.firstRow), options.slice(layout.firstRow)];
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroller}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.swatchScroll}
      >
        {rows.map((row, index) => (
          <View key={index} style={[styles.swatchRow, index > 0 && styles.swatchRowGap]}>
            {row.map(renderSwatch)}
          </View>
        ))}
      </ScrollView>
      <View style={styles.swatchHint} pointerEvents="none">
        <Icon name="swap-horizontal" size={12} color={colors.textMuted} />
        <Text style={styles.swatchHintText}>Swipe for all {options.length} colours</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  groupTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text, marginBottom: 10 },
  groupValue: { fontWeight: typography.weight.medium, color: colors.textSecondary },
  groupSpacing: { marginTop: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: SWATCH_GAP },
  // Room for each swatch's count badge, which sits 7px outside its corner.
  swatchScroll: { flexDirection: 'column', paddingTop: 8, paddingBottom: 4, paddingRight: 8 },
  swatchRow: { flexDirection: 'row', gap: SWATCH_GAP },
  swatchRowGap: { marginTop: SWATCH_GAP },
  swatchHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  swatchHintText: { fontSize: 11, color: colors.textMuted },
  swatch: {
    width: SWATCH_WIDTH,
    padding: 3,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  swatchActive: { borderColor: colors.primary, backgroundColor: '#fff6f5' },
  swatchImage: { width: 58, height: 58, borderRadius: 10, backgroundColor: colors.surfaceAlt },
  swatchLabel: { marginTop: 3, fontSize: 10, color: colors.textSecondary },
  swatchTextWrap: { width: 58, height: 40, alignItems: 'center', justifyContent: 'center' },
  swatchText: { fontSize: 10.5, color: colors.text, textAlign: 'center' },
  swatchBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#1f2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchBadgeText: { color: colors.white, fontSize: 10, fontWeight: typography.weight.bold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efeff3',
    backgroundColor: colors.white,
  },
  rowSelected: { borderColor: '#7dd3e8', backgroundColor: '#effbfe' },
  rowOption: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  rowImage: { width: 36, height: 36, borderRadius: 8, marginRight: 8, backgroundColor: colors.surfaceAlt },
  rowLabel: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.semiBold, color: colors.text },
  rowPriceCol: { marginRight: 10, alignItems: 'flex-end' },
  rowPrice: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.primary },
  rowStock: { fontSize: 10.5, color: colors.textMuted },
  outOfStock: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f3f6',
    color: colors.textMuted,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  viewAllText: { marginRight: 4, color: colors.primary, fontSize: typography.size.xs + 1, fontWeight: typography.weight.bold },
  single: {},
  disabled: { opacity: 0.5 },
  singleStepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  singleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButtonPrimary: { backgroundColor: colors.primary },
  singleInput: {
    minWidth: 64,
    height: 40,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
    paddingVertical: 0,
  },
});

export default VariantSelector;
