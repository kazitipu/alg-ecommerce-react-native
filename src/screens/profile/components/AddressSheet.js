import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, FadeIn, FadeInDown, FadeInRight, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthField from '../../auth/components/AuthField';
import PressableScale from '../../../components/PressableScale';
import { fetchAreas } from '../../../api';
import { DIVISIONS, districtsOf } from '../../../constants/bdAddress';
import { allThanas } from '../../../constants/thana';
import { colors, spacing, typography } from '../../../theme';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];

export const emptyAddress = () => ({
  name: '',
  mobileNo: '',
  address: '',
  division: '',
  district: '',
  thana: '',
  areaObj: null,
});

const asText = value => (value === undefined || value === null ? '' : String(value));

/**
 * The form's copy of an address. Stored fields can be numbers (a mobile saved
 * as 1641103558) or missing, and text inputs need strings.
 */
export const toDraft = address => {
  const base = { ...emptyAddress(), ...(address || {}) };
  return {
    ...base,
    name: asText(base.name),
    mobileNo: asText(base.mobileNo),
    address: asText(base.address),
    division: asText(base.division),
    district: asText(base.district),
    thana: asText(base.thana),
  };
};

/** The four location levels, each unlocked by the one before. */
const LEVELS = [
  { key: 'division', label: 'Division', icon: 'map' },
  { key: 'district', label: 'District', icon: 'business' },
  { key: 'thana', label: 'Thana', icon: 'navigate' },
  { key: 'area', label: 'Delivery area', icon: 'location' },
];

/** One location row: step number (or tick), label, chosen value, chevron. */
const LocationRow = ({ index, level, value, disabled, loading, onPress }) => (
  <PressableScale
    onPress={disabled ? undefined : onPress}
    scaleTo={0.98}
    style={[styles.locRow, value && styles.locRowDone, disabled && styles.locRowDisabled]}>
    <View style={[styles.locStep, value && styles.locStepDone]}>
      {value ? <Icon name="checkmark" size={13} color={colors.white} /> : <Text style={styles.locStepText}>{index + 1}</Text>}
    </View>
    <View style={styles.locText}>
      <Text style={styles.locLabel}>{level.label}</Text>
      <Text style={[styles.locValue, !value && styles.locPlaceholder]} numberOfLines={1}>
        {value || (disabled ? `Choose ${LEVELS[index - 1]?.label.toLowerCase()} first` : `Select ${level.label.toLowerCase()}`)}
      </Text>
    </View>
    {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="chevron-forward" size={16} color={colors.textMuted} />}
  </PressableScale>
);

/** Searchable list shown in place of the form while a location is being picked. */
const OptionPicker = ({ level, options, selected, loading, onPick, onBack }) => {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(option => option.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <Animated.View entering={FadeInRight.duration(220)} style={styles.picker}>
      <View style={styles.pickerHeader}>
        <PressableScale onPress={onBack} scaleTo={0.88} hitSlop={8} style={styles.pickerBack} accessibilityLabel="Back">
          <Icon name="chevron-back" size={18} color={colors.text} />
        </PressableScale>
        <Text style={styles.pickerTitle}>Select {level.label.toLowerCase()}</Text>
        <Text style={styles.pickerCount}>{shown.length}</Text>
      </View>
      <View style={styles.search}>
        <Icon name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${level.label.toLowerCase()}`}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {loading ? (
        <View style={styles.pickerEmpty}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.pickerEmptyText}>Loading delivery areas…</Text>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          style={styles.pickerList}
          ListEmptyComponent={
            <View style={styles.pickerEmpty}>
              <Icon name="search-outline" size={22} color={colors.textMuted} />
              <Text style={styles.pickerEmptyText}>{options.length ? 'No matches' : 'Nothing to choose here yet'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const on = item === selected;
            return (
              <PressableScale onPress={() => onPick(item)} scaleTo={0.98} style={[styles.option, on && styles.optionOn]}>
                <Text style={[styles.optionText, on && styles.optionTextOn]}>{item}</Text>
                {on ? <Icon name="checkmark-circle" size={18} color={colors.primary} /> : null}
              </PressableScale>
            );
          }}
        />
      )}
    </Animated.View>
  );
};

/**
 * Add / edit an address. Checkout quotes delivery from RedX by the area's id,
 * so division → district → thana → area must all be picked, the area from
 * RedX's own list for that district.
 */
const AddressSheet = ({ visible, initial, canUnsetDefault, saving, onClose, onSave }) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [picking, setPicking] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(toDraft(initial));
      setPicking(null);
    }
  }, [visible, initial]);

  // RedX publishes areas per district, and only the id it returns is usable.
  useEffect(() => {
    if (!draft.district) {
      setAreas([]);
      return undefined;
    }
    let active = true;
    setLoadingAreas(true);
    fetchAreas(draft.district)
      .then(result => active && setAreas(result || []))
      .catch(() => active && setAreas([]))
      .finally(() => active && setLoadingAreas(false));
    return () => {
      active = false;
    };
  }, [draft.district]);

  const districts = useMemo(() => districtsOf(draft.division), [draft.division]);
  const thanas = useMemo(() => allThanas.find(entry => entry.name === draft.district)?.thana || [], [draft.district]);

  const update = key => value => setDraft(previous => ({ ...previous, [key]: value }));

  const optionsFor = key =>
    key === 'division' ? DIVISIONS : key === 'district' ? districts : key === 'thana' ? thanas : areas.map(area => area.name);

  const valueFor = key => (key === 'area' ? draft.areaObj?.name : draft[key]);

  const pick = (key, value) => {
    setDraft(previous => {
      if (key === 'division') return { ...previous, division: value, district: '', thana: '', areaObj: null };
      if (key === 'district') return { ...previous, district: value, thana: '', areaObj: null };
      if (key === 'thana') return { ...previous, thana: value };
      return { ...previous, areaObj: areas.find(area => area.name === value) || null };
    });
    setPicking(null);
  };

  const completed = LEVELS.filter(level => valueFor(level.key)).length;
  const pickingLevel = LEVELS.find(level => level.key === picking);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={picking ? () => setPicking(null) : onClose} statusBarTranslucent>
      {visible ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
            <Animated.View
              entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
              exiting={SlideOutDown.duration(220)}
              style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.handle} />

              {pickingLevel ? (
                <OptionPicker
                  key={pickingLevel.key}
                  level={pickingLevel}
                  options={optionsFor(pickingLevel.key)}
                  selected={valueFor(pickingLevel.key)}
                  loading={pickingLevel.key === 'area' && loadingAreas}
                  onPick={value => pick(pickingLevel.key, value)}
                  onBack={() => setPicking(null)}
                />
              ) : (
                <>
                  <View style={styles.header}>
                    <View style={styles.headerIcon}>
                      <Icon name={draft.id ? 'create' : 'add'} size={18} color={colors.white} />
                    </View>
                    <Text style={styles.title}>{draft.id ? 'Edit address' : 'New address'}</Text>
                    <PressableScale onPress={onClose} scaleTo={0.88} hitSlop={8} style={styles.close} accessibilityLabel="Close">
                      <Icon name="close" size={18} color={colors.text} />
                    </PressableScale>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
                    <Animated.Text entering={FadeInDown.duration(250)} style={styles.section}>
                      Who receives it
                    </Animated.Text>
                    <AuthField icon="person-outline" placeholder="Full name" value={draft.name} onChangeText={update('name')} autoComplete="name" />
                    <AuthField
                      icon="call-outline"
                      placeholder="Mobile number (01XXXXXXXXX)"
                      value={draft.mobileNo}
                      onChangeText={text => update('mobileNo')(text.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      maxLength={11}
                      autoComplete="tel"
                    />

                    <Text style={styles.section}>Where to deliver</Text>
                    <View style={styles.street}>
                      <Icon name="home-outline" size={17} color={colors.textSecondary} style={styles.streetIcon} />
                      <TextInput
                        value={draft.address}
                        onChangeText={update('address')}
                        placeholder="House, road, building, landmark"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        textAlignVertical="top"
                        style={styles.streetInput}
                      />
                    </View>

                    <View style={styles.locHeader}>
                      <Text style={styles.section}>Location</Text>
                      <Text style={styles.locProgress}>{completed}/4</Text>
                    </View>
                    <View style={styles.locBar}>
                      <Animated.View style={[styles.locBarFill, { width: `${(completed / 4) * 100}%` }]} />
                    </View>
                    {LEVELS.map((level, index) => (
                      <LocationRow
                        key={level.key}
                        index={index}
                        level={level}
                        value={valueFor(level.key)}
                        disabled={index > 0 && !valueFor(LEVELS[index - 1].key)}
                        loading={level.key === 'area' && loadingAreas}
                        onPress={() => setPicking(level.key)}
                      />
                    ))}

                    <View style={styles.defaultRow}>
                      <View style={styles.defaultIcon}>
                        <Icon name="star" size={15} color="#e08a00" />
                      </View>
                      <View style={styles.defaultText}>
                        <Text style={styles.defaultLabel}>Use as default address</Text>
                        <Text style={styles.defaultHint}>Checkout delivers here and quotes its charge</Text>
                      </View>
                      <Switch
                        value={Boolean(draft.defaultShipping)}
                        disabled={draft.defaultShipping && !canUnsetDefault}
                        onValueChange={value => update('defaultShipping')(value)}
                        trackColor={{ true: colors.primary, false: '#d9d9e3' }}
                        thumbColor={colors.white}
                      />
                    </View>
                  </ScrollView>

                  <PressableScale onPress={saving ? undefined : () => onSave(draft)} scaleTo={0.96} style={styles.saveShadow}>
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
                      {saving ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <>
                          <Icon name="checkmark-circle" size={18} color={colors.white} />
                          <Text style={styles.saveText}>Save address</Text>
                        </>
                      )}
                    </LinearGradient>
                  </PressableScale>
                </>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 22, 38, 0.55)', justifyContent: 'flex-end' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    height: '88%',
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, marginTop: 10, marginBottom: 8, borderRadius: 2, backgroundColor: '#dcdce4' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  headerIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 10, fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f3f6', alignItems: 'center', justifyContent: 'center' },
  form: { paddingBottom: spacing.md },
  section: { marginTop: 12, marginBottom: 8, fontSize: typography.size.sm, fontWeight: '800', color: colors.text },
  street: {
    flexDirection: 'row',
    minHeight: 84,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  streetIcon: { marginTop: 1 },
  streetInput: { flex: 1, marginLeft: 10, paddingVertical: 0, fontSize: typography.size.md - 1, color: colors.text },
  locHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locProgress: { marginTop: 4, fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.primary },
  locBar: { height: 4, marginBottom: 10, borderRadius: 2, backgroundColor: '#f0f0f4', overflow: 'hidden' },
  locBarFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  locRowDone: { borderColor: '#bbf0d9', backgroundColor: '#f6fdf9' },
  locRowDisabled: { opacity: 0.5 },
  locStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0f0f4', alignItems: 'center', justifyContent: 'center' },
  locStepDone: { backgroundColor: '#059669' },
  locStepText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  locText: { flex: 1, marginHorizontal: 10 },
  locLabel: { fontSize: 10.5, color: colors.textMuted },
  locValue: { marginTop: 1, fontSize: typography.size.sm + 1, fontWeight: typography.weight.bold, color: colors.text },
  locPlaceholder: { fontWeight: typography.weight.medium, color: colors.textMuted },
  defaultRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: '#fffbeb' },
  defaultIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  defaultText: { flex: 1, marginHorizontal: 10 },
  defaultLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text },
  defaultHint: { marginTop: 1, fontSize: typography.size.xs, color: colors.textMuted },
  saveShadow: {
    marginTop: 8,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
  },
  save: { flexDirection: 'row', gap: 8, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  picker: { flex: 1 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pickerBack: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f3f6', alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { flex: 1, marginLeft: 10, fontSize: typography.size.lg, fontWeight: '800', color: colors.text },
  pickerCount: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: colors.textMuted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f3f3f6',
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: typography.size.sm + 1, color: colors.text },
  pickerList: { flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
  },
  optionOn: { backgroundColor: colors.primarySoft },
  optionText: { fontSize: typography.size.sm + 1, color: colors.text },
  optionTextOn: { fontWeight: typography.weight.bold, color: colors.primary },
  pickerEmpty: { alignItems: 'center', gap: 8, paddingVertical: spacing.xl },
  pickerEmptyText: { fontSize: typography.size.sm, color: colors.textMuted },
});

export default AddressSheet;
