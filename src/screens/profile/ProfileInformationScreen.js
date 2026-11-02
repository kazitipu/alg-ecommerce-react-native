import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { EmptyState, PressableScale } from '../../components';
import { useHideSupportFab } from '../../components/SupportFab';
import AuthField from '../auth/components/AuthField';
import AddressSheet, { emptyAddress } from './components/AddressSheet';
import { launchImageLibrary } from 'react-native-image-picker';
import { setCurrentUser, updateProfilePhotoRedux } from '../../actions';
import UserAvatar from '../../components/UserAvatar';
import ConfirmSheet from '../../components/ConfirmSheet';
import { getSingleUser, updateUser, uploadProfileImage } from '../../firebase/firebase.utils';
import { useAuth, useDarkStatusBar } from '../../hooks';
import { generateBookingId } from '../../utils/ids';
import { isValidBdMobile } from '../../utils/otp';
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';
import { appAlert } from '../../utils/appAlert';

const GRADIENT = ['#ff8a5c', colors.primary, '#e8344a'];
const INK = '#1f2340';

const initialsOf = name =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';

/** Firestore values may be numbers (e.g. a mobile saved as 1641103558) or null. */
export const asText = value =>
  value === undefined || value === null || typeof value === 'object'
    ? ''
    : String(value);

// This page animates without spring bounce: eased fades and slides, each
// section from its own direction.
const EASE = Easing.out(Easing.cubic);
const LAYOUT = LinearTransition.duration(260).easing(EASE);

/** The completeness bar fills from empty to its value, and eases to new values. */
const CompletionFill = ({ value, colors: fill }) => {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(
      250,
      withTiming(Math.max(value * 100, 4), { duration: 900, easing: EASE }),
    );
  }, [value, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <Animated.View style={[styles.completionFill, style]}>
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

export const GENDERS = ['Male', 'Female', 'Other'];

const COMPANY_FIELDS = ['name', 'businessType', 'address', 'mobileNo'];

/**
 * The web keeps `company` as `{ name, businessType, address, mobileNo }`. A
 * plain string (saved by an earlier app build) is read as the company name.
 */
export const companyOf = user => {
  const company = user?.company;
  if (company && typeof company === 'object') {
    return Object.fromEntries(
      COMPANY_FIELDS.map(key => [key, asText(company[key])]),
    );
  }
  return { name: asText(company), businessType: '', address: '', mobileNo: '' };
};

/** The web's "Personal information": name, gender and mobile. */
export const profileOf = user => ({
  displayName: asText(user?.displayName),
  gender: asText(user?.gender),
  mobileNo: asText(user?.mobileNo),
});

const changed = (draft, saved) =>
  Object.keys(saved).some(
    key => asText(draft[key]).trim() !== saved[key].trim(),
  );

/** Discard / Save buttons that slide in once a card has unsaved changes. */
const SaveRow = ({ saving, onDiscard, onSave }) => (
  <Animated.View
    entering={FadeIn.duration(220).easing(EASE)}
    style={styles.saveRow}
  >
    <PressableScale onPress={onDiscard} scaleTo={0.95} style={styles.discard}>
      <Text style={styles.discardText}>Discard</Text>
    </PressableScale>
    <PressableScale
      onPress={onSave}
      scaleTo={0.96}
      style={[styles.saveShadow, styles.saveFlex]}
    >
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.save}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Icon name="checkmark-circle" size={17} color={colors.white} />
            <Text style={styles.saveText}>Save changes</Text>
          </>
        )}
      </LinearGradient>
    </PressableScale>
  </Animated.View>
);

/** Opened from place order to pick where to deliver: only the address book shows. */
export const PICK_DELIVERY = 'pickDelivery';

const TABS = [
  { key: 'personal', label: 'Personal', icon: 'person' },
  { key: 'company', label: 'Company', icon: 'briefcase' },
  { key: 'addresses', label: 'Addresses', icon: 'location' },
];

/** Three tabs with a white pill that glides (no bounce) to the selected one. */
const TabSwitch = ({ value, onChange, badges }) => {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    TABS.findIndex(tab => tab.key === value),
    0,
  );
  const position = useSharedValue(index);
  useEffect(() => {
    position.value = withTiming(index, { duration: 280, easing: EASE });
  }, [index, position]);
  const tabWidth = width / TABS.length;
  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: position.value * tabWidth }],
  }));

  return (
    <View
      style={styles.tabs}
      onLayout={event => setWidth(event.nativeEvent.layout.width - 8)}
    >
      {width > 0 ? <Animated.View style={[styles.tabPill, pillStyle]} /> : null}
      {TABS.map(tab => {
        const on = tab.key === value;
        return (
          <PressableScale
            key={tab.key}
            onPress={() => onChange(tab.key)}
            scaleTo={0.95}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={styles.tab}
          >
            <Icon
              name={on ? tab.icon : `${tab.icon}-outline`}
              size={14}
              color={on ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, on && styles.tabTextOn]}>
              {tab.label}
            </Text>
            {badges[tab.key] ? <View style={styles.tabDot} /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
};

/** "Saved" badge for a card with nothing pending. */
const SavedChip = () => (
  <Animated.View entering={FadeIn} style={styles.savedChip}>
    <Icon name="cloud-done" size={12} color="#059669" />
    <Text style={styles.savedText}>Saved</Text>
  </Animated.View>
);

/**
 * The address book after saving `entry`: it replaces its old version (or is
 * appended), and when it is the default every other address stops being one.
 * The first address always becomes the default so checkout has one.
 */
export const withSavedAddress = (addressBook, entry) => {
  const isDefault =
    Boolean(entry.defaultShipping) ||
    addressBook.length === 0 ||
    (addressBook.length === 1 && addressBook[0].id === entry.id);
  const saved = { ...entry, defaultShipping: isDefault };
  const exists = addressBook.some(item => item.id === entry.id);
  const next = exists
    ? addressBook.map(item => (item.id === entry.id ? saved : item))
    : [...addressBook, saved];
  return isDefault
    ? next.map(item =>
        item.id === saved.id ? item : { ...item, defaultShipping: false },
      )
    : next;
};

/** Gives any address missing an `id` a stable one, so none can be confused. */
export const withAddressIds = addressBook =>
  (Array.isArray(addressBook) ? addressBook : []).map((item, index) =>
    item?.id === undefined || item?.id === null || item?.id === ''
      ? { ...item, id: `address-${index + 1}` }
      : item,
  );

/** Removing the default hands the role to the first remaining address. */
export const withoutAddress = (addressBook, id) => {
  const removed = addressBook.find(item => item.id === id);
  const next = addressBook.filter(item => item.id !== id);
  if (
    removed?.defaultShipping &&
    next.length > 0 &&
    !next.some(item => item.defaultShipping)
  ) {
    return next.map((item, index) =>
      index === 0 ? { ...item, defaultShipping: true } : item,
    );
  }
  return next;
};

/** Profile details and the address book checkout delivers to. */
const ProfileInformationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { currentUser, isSignedIn } = useAuth();
  useDarkStatusBar();
  useHideSupportFab();

  // From place order: just the address book; tapping one delivers there.
  const pickMode = route.params?.mode === PICK_DELIVERY;
  const [tab, setTab] = useState(route.params?.section || 'personal');

  const [profile, setProfile] = useState(() => profileOf(currentUser));
  const [savingProfile, setSavingProfile] = useState(false);
  const [company, setCompany] = useState(() => companyOf(currentUser));
  const [savingCompany, setSavingCompany] = useState(false);
  const [sheet, setSheet] = useState({ visible: false, address: null });
  const [savingAddress, setSavingAddress] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // The user may finish loading after the screen opens; fill the form then,
  // unless the customer has already started typing.
  const [touched, setTouched] = useState(false);
  const [companyTouched, setCompanyTouched] = useState(false);
  useEffect(() => {
    if (!touched) setProfile(profileOf(currentUser));
  }, [currentUser, touched]);
  useEffect(() => {
    if (!companyTouched) setCompany(companyOf(currentUser));
  }, [currentUser, companyTouched]);

  // Every address needs an id to be edited or deleted on its own; one without
  // gets a stable stand-in, saved with the next change.
  const addressBook = useMemo(
    () => withAddressIds(currentUser?.addressBook),
    [currentUser],
  );
  // Default first, then the rest in the order they were added.
  const sortedBook = useMemo(
    () =>
      [...addressBook].sort(
        (a, b) =>
          Number(Boolean(b.defaultShipping)) -
          Number(Boolean(a.defaultShipping)),
      ),
    [addressBook],
  );

  const saved = profileOf(currentUser);
  const savedCompany = companyOf(currentUser);
  const dirty = changed(profile, saved);
  const companyDirty = changed(company, savedCompany);

  const checks = [
    { label: 'Name', done: Boolean(saved.displayName.trim()) },
    { label: 'Mobile', done: Boolean(saved.mobileNo.trim()) },
    { label: 'Email', done: Boolean(currentUser?.email) },
    { label: 'Address', done: addressBook.length > 0 },
  ];
  const completion = checks.filter(check => check.done).length / checks.length;

  const update = key => value => {
    setTouched(true);
    setProfile(previous => ({ ...previous, [key]: value }));
  };
  const updateCompany = key => value => {
    setCompanyTouched(true);
    setCompany(previous => ({ ...previous, [key]: value }));
  };

  const refreshUser = async () => {
    const fresh = await getSingleUser(currentUser.id);
    if (fresh) dispatch(setCurrentUser({ ...fresh, id: currentUser.id }));
  };

  // Profile photo: tap the avatar to choose one; "Remove photo" clears it.
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);

  const changePhoto = async () => {
    if (photoBusy) return;
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, maxWidth: 800, maxHeight: 800, quality: 0.8 });
    const asset = result.didCancel ? null : result.assets?.[0];
    if (!asset) return;
    setPhotoBusy(true);
    try {
      const url = await uploadProfileImage(asset, currentUser.id);
      if (!url) {
        notifyError('The photo could not be uploaded. Please try again.');
        return;
      }
      await dispatch(updateProfilePhotoRedux(currentUser, url));
      notifySuccess('Profile photo updated');
    } catch (error) {
      notifyError(error, 'Could not update your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setConfirmRemovePhoto(false);
    setPhotoBusy(true);
    try {
      await dispatch(updateProfilePhotoRedux(currentUser, ''));
      notifyInfo('Profile photo removed');
    } catch (error) {
      notifyError(error, 'Could not remove your photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    if (!profile.displayName.trim()) {
      notifyError('Please enter your name.');
      return;
    }
    if (profile.mobileNo.trim() && !isValidBdMobile(profile.mobileNo)) {
      notifyError('Enter an 11-digit mobile number starting with 0.');
      return;
    }
    setSavingProfile(true);
    try {
      // As on the web, only the personal fields are written here.
      await updateUser({
        ...currentUser,
        displayName: profile.displayName.trim(),
        gender: profile.gender,
        mobileNo: profile.mobileNo.trim(),
      });
      await refreshUser();
      setTouched(false);
      notifySuccess('Profile updated');
    } catch (error) {
      notifyError(error, 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCompany = async () => {
    if (savingCompany) return;
    if (company.mobileNo.trim() && !isValidBdMobile(company.mobileNo)) {
      notifyError('Enter an 11-digit company mobile number starting with 0.');
      return;
    }
    setSavingCompany(true);
    try {
      await updateUser({
        ...currentUser,
        company: Object.fromEntries(
          COMPANY_FIELDS.map(key => [key, company[key].trim()]),
        ),
      });
      await refreshUser();
      setCompanyTouched(false);
      notifySuccess('Company information updated');
    } catch (error) {
      notifyError(error, 'Could not save your company information.');
    } finally {
      setSavingCompany(false);
    }
  };

  const writeBook = async (nextBook, id) => {
    setBusyId(id);
    try {
      await updateUser({ ...currentUser, addressBook: nextBook });
      await refreshUser();
      return true;
    } catch (error) {
      notifyError(error, 'Could not update your addresses.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const saveAddress = async raw => {
    const draft = {
      ...raw,
      name: asText(raw.name),
      mobileNo: asText(raw.mobileNo),
      address: asText(raw.address),
    };
    if (!draft.name.trim() || !draft.mobileNo.trim() || !draft.address.trim()) {
      notifyError('Please fill in the name, mobile number and address.');
      return;
    }
    if (!isValidBdMobile(draft.mobileNo)) {
      notifyError('Enter an 11-digit mobile number starting with 0.');
      return;
    }
    if (!draft.division || !draft.district || !draft.thana || !draft.areaObj) {
      notifyError('Please choose division, district, thana and delivery area.');
      return;
    }
    setSavingAddress(true);
    try {
      const entry = {
        ...draft,
        name: draft.name.trim(),
        address: draft.address.trim(),
        id: draft.id || generateBookingId(),
      };
      await updateUser({
        ...currentUser,
        addressBook: withSavedAddress(addressBook, entry),
      });
      await refreshUser();
      setSheet({ visible: false, address: null });
      notifySuccess('Address saved');
      // Like the web, a new address added from checkout takes you back there.
      if (pickMode && !draft.id) navigation.goBack();
    } catch (error) {
      notifyError(error, 'Could not save the address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const makeDefault = async address => {
    const ok = await writeBook(
      // As on the web, the default address is both the shipping and billing one.
      addressBook.map(item => ({
        ...item,
        defaultShipping: item.id === address.id,
        defaultBilling: item.id === address.id,
      })),
      address.id,
    );
    if (ok) notifySuccess('Default address updated');
  };

  /** From place order: deliver to this address and go back to checkout. */
  const chooseAddress = async address => {
    if (busyId) return;
    if (!address.defaultShipping) {
      const ok = await writeBook(
        addressBook.map(item => ({
          ...item,
          defaultShipping: item.id === address.id,
          defaultBilling: item.id === address.id,
        })),
        address.id,
      );
      if (!ok) return;
      notifySuccess('Delivery address updated');
    }
    navigation.goBack();
  };

  // In checkout a new address is meant for this order, so it starts as the default.
  const openNewAddress = () =>
    setSheet({
      visible: true,
      address: pickMode ? { ...emptyAddress(), defaultShipping: true } : null,
    });

  const removeAddress = address =>
    appAlert('Delete address', `Remove the address for ${address.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await writeBook(
            withoutAddress(addressBook, address.id),
            address.id,
          );
          if (ok) notifyInfo('Address removed');
        },
      },
    ]);

  const copy = (label, value) => {
    Clipboard.setString(`${value}`);
    notifyInfo(`${label} copied`);
  };

  if (!isSignedIn) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Sign in to manage your profile"
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {pickMode ? (
          <LinearGradient
            colors={['#fff0ec', '#fff8f6', '#f6f6f8']}
            style={[styles.pickHeader, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.heroTop}>
              <PressableScale
                onPress={() => navigation.goBack()}
                scaleTo={0.88}
                hitSlop={8}
                style={styles.back}
                accessibilityLabel="Back"
              >
                <Icon name="chevron-back" size={20} color={colors.text} />
              </PressableScale>
              <View style={styles.pickIcon}>
                <Icon name="location" size={20} color={colors.white} />
              </View>
              <View style={styles.pickText}>
                <Text style={styles.heroTitle}>Delivery address</Text>
                <Text style={styles.pickSub}>
                  Tap an address to deliver this order there
                </Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#ffe7e0', '#fff4f0', '#f6f6f8']}
            style={[styles.hero, { paddingTop: insets.top + 8 }]}
          >
            <View style={[styles.blob, styles.blobA]} />
            <View style={[styles.blob, styles.blobB]} />
            <View style={styles.heroTop}>
              {navigation.canGoBack() ? (
                <PressableScale
                  onPress={() => navigation.goBack()}
                  scaleTo={0.88}
                  hitSlop={8}
                  style={styles.back}
                  accessibilityLabel="Back"
                >
                  <Icon name="chevron-back" size={20} color={colors.text} />
                </PressableScale>
              ) : null}
              <Text style={styles.heroTitle}>My information</Text>
            </View>

            <Animated.View
              entering={FadeInLeft.duration(450).easing(EASE)}
              style={styles.identity}
            >
              <Animated.View entering={FadeIn.duration(600)}>
                <PressableScale
                  onPress={changePhoto}
                  scaleTo={0.94}
                  accessibilityLabel="Change profile photo"
                >
                  <LinearGradient
                    colors={GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <UserAvatar
                      user={currentUser}
                      initials={initialsOf(saved.displayName || currentUser?.email)}
                      style={styles.avatarFill}
                      textStyle={styles.avatarText}
                    />
                    {photoBusy ? (
                      <View style={styles.avatarBusy}>
                        <ActivityIndicator color={colors.white} />
                      </View>
                    ) : null}
                  </LinearGradient>
                  <View style={styles.avatarCamera}>
                    <Icon name="camera" size={12} color={colors.white} />
                  </View>
                </PressableScale>
                {currentUser?.photoURL && !photoBusy ? (
                  <PressableScale onPress={() => setConfirmRemovePhoto(true)} scaleTo={0.94} style={styles.removePhoto}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </PressableScale>
                ) : null}
              </Animated.View>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {saved.displayName || 'Your name'}
                </Text>
                {currentUser?.email ? (
                  <Text style={styles.email} numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                ) : null}
                {currentUser?.userId ? (
                  <PressableScale
                    onPress={() => copy('Customer ID', currentUser.userId)}
                    scaleTo={0.94}
                    style={styles.idChip}
                  >
                    <Icon name="id-card" size={12} color={colors.primary} />
                    <Text style={styles.idText}>
                      Customer ID {currentUser.userId}
                    </Text>
                    <Icon
                      name="copy-outline"
                      size={11}
                      color={colors.primary}
                    />
                  </PressableScale>
                ) : null}
              </View>
            </Animated.View>

            {/* Profile completeness */}
            <Animated.View
              entering={FadeIn.delay(120).duration(400)}
              style={styles.completion}
            >
              <View style={styles.completionTop}>
                <Text style={styles.completionTitle}>
                  {completion === 1
                    ? 'Profile complete 🎉'
                    : 'Complete your profile'}
                </Text>
                <Text style={styles.completionPercent}>
                  {Math.round(completion * 100)}%
                </Text>
              </View>
              <View style={styles.completionBar}>
                <CompletionFill
                  value={completion}
                  colors={completion === 1 ? ['#34d399', '#059669'] : GRADIENT}
                />
              </View>
              <View style={styles.checks}>
                {checks.map(check => (
                  <View
                    key={check.label}
                    style={[styles.check, check.done && styles.checkDone]}
                  >
                    <Icon
                      name={check.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={12}
                      color={check.done ? '#059669' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.checkText,
                        check.done && styles.checkTextDone,
                      ]}
                    >
                      {check.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            <TabSwitch
              value={tab}
              onChange={setTab}
              badges={{
                personal: dirty,
                company: companyDirty,
                addresses: addressBook.length === 0,
              }}
            />
          </LinearGradient>
        )}

        {/* Details */}
        {!pickMode && tab === 'personal' ? (
          <Animated.View
            key="personal"
            entering={FadeInUp.duration(320).easing(EASE)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.tile, styles.tileDetails]}>
                <Icon name="person" size={15} color="#4f46e5" />
              </View>
              <Text style={styles.cardTitle}>Your details</Text>
              {!dirty ? <SavedChip /> : null}
            </View>

            <Text style={styles.fieldLabel}>Full name</Text>
            <AuthField
              icon="person-outline"
              placeholder="Your full name"
              value={profile.displayName}
              onChangeText={update('displayName')}
              autoComplete="name"
            />
            <Text style={styles.fieldLabel}>Mobile number</Text>
            <AuthField
              icon="call-outline"
              placeholder="01XXXXXXXXX"
              value={profile.mobileNo}
              onChangeText={text =>
                update('mobileNo')(text.replace(/[^0-9]/g, ''))
              }
              keyboardType="phone-pad"
              maxLength={11}
              autoComplete="tel"
            />
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genders}>
              {GENDERS.map(option => {
                const on = profile.gender === option;
                return (
                  <PressableScale
                    key={option}
                    onPress={() => update('gender')(on ? '' : option)}
                    scaleTo={0.94}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.gender, on && styles.genderOn]}
                  >
                    <Icon
                      name={
                        option === 'Male'
                          ? 'male'
                          : option === 'Female'
                          ? 'female'
                          : 'person'
                      }
                      size={14}
                      color={on ? colors.white : colors.textSecondary}
                    />
                    <Text
                      style={[styles.genderText, on && styles.genderTextOn]}
                    >
                      {option}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {currentUser?.email ? (
              <View style={styles.readonly}>
                <Icon name="mail" size={15} color={colors.textSecondary} />
                <View style={styles.readonlyText}>
                  <Text style={styles.readonlyLabel}>Email (sign-in)</Text>
                  <Text style={styles.readonlyValue} numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                </View>
                <Icon name="lock-closed" size={13} color={colors.textMuted} />
              </View>
            ) : null}

            {dirty ? (
              <SaveRow
                saving={savingProfile}
                onDiscard={() => {
                  setProfile(profileOf(currentUser));
                  setTouched(false);
                }}
                onSave={saveProfile}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {/* Company — the web's "Company information" */}
        {!pickMode && tab === 'company' ? (
          <Animated.View
            key="company"
            entering={FadeInUp.duration(320).easing(EASE)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.tile, styles.tileCompany]}>
                <Icon name="briefcase" size={15} color="#c026d3" />
              </View>
              <Text style={styles.cardTitle}>Company information</Text>
              {!companyDirty && savedCompany.name ? <SavedChip /> : null}
            </View>
            <Text style={styles.cardHint}>
              Optional — for business orders and invoices.
            </Text>

            <Text style={styles.fieldLabel}>Company name</Text>
            <AuthField
              icon="business-outline"
              placeholder="Enter your company name"
              value={company.name}
              onChangeText={updateCompany('name')}
            />
            <Text style={styles.fieldLabel}>Business type</Text>
            <AuthField
              icon="pricetags-outline"
              placeholder="Enter your business type"
              value={company.businessType}
              onChangeText={updateCompany('businessType')}
            />
            <Text style={styles.fieldLabel}>Company address</Text>
            <AuthField
              icon="location-outline"
              placeholder="Enter your company address"
              value={company.address}
              onChangeText={updateCompany('address')}
            />
            <Text style={styles.fieldLabel}>Company mobile</Text>
            <AuthField
              icon="call-outline"
              placeholder="01XXXXXXXXX"
              value={company.mobileNo}
              onChangeText={text =>
                updateCompany('mobileNo')(text.replace(/[^0-9]/g, ''))
              }
              keyboardType="phone-pad"
              maxLength={11}
            />

            {companyDirty ? (
              <SaveRow
                saving={savingCompany}
                onDiscard={() => {
                  setCompany(companyOf(currentUser));
                  setCompanyTouched(false);
                }}
                onSave={saveCompany}
              />
            ) : null}
          </Animated.View>
        ) : null}

        {/* Address book */}
        {pickMode || tab === 'addresses' ? (
          <Animated.View
            key="addresses"
            entering={FadeInUp.duration(320).easing(EASE)}
            layout={LAYOUT}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.tile, styles.tileAddress]}>
                <Icon name="location" size={15} color="#059669" />
              </View>
              <Text style={styles.cardTitle}>
                {pickMode ? 'Your addresses' : 'Address book'}
              </Text>
              {addressBook.length ? (
                <Text style={styles.count}>{addressBook.length}</Text>
              ) : null}
              <PressableScale
                onPress={openNewAddress}
                scaleTo={0.92}
                style={styles.addChip}
              >
                <Icon name="add" size={14} color={colors.white} />
                <Text style={styles.addText}>Add</Text>
              </PressableScale>
            </View>

            {sortedBook.length === 0 ? (
              <PressableScale
                onPress={openNewAddress}
                scaleTo={0.98}
                style={styles.emptyBook}
              >
                <View style={styles.emptyIcon}>
                  <Icon name="map" size={26} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No addresses yet</Text>
                <Text style={styles.emptyText}>
                  Add one so checkout can quote your delivery charge and deliver
                  to your door.
                </Text>
              </PressableScale>
            ) : (
              sortedBook.map((address, index) => (
                <Animated.View
                  key={address.id}
                  entering={FadeInRight.delay(120 + index * 80)
                    .duration(380)
                    .easing(EASE)}
                  exiting={FadeOutLeft.duration(220)}
                  layout={LAYOUT}
                  style={[
                    styles.address,
                    address.defaultShipping && styles.addressDefault,
                  ]}
                >
                  <PressableScale
                    onPress={
                      pickMode ? () => chooseAddress(address) : undefined
                    }
                    disabled={!pickMode}
                    scaleTo={0.98}
                    accessibilityRole={pickMode ? 'radio' : undefined}
                    accessibilityState={
                      pickMode
                        ? { selected: Boolean(address.defaultShipping) }
                        : undefined
                    }
                    style={styles.addressTop}
                  >
                    <View
                      style={[
                        styles.addressIcon,
                        address.defaultShipping && styles.addressIconDefault,
                      ]}
                    >
                      <Icon
                        name={
                          address.defaultShipping ? 'home' : 'location-outline'
                        }
                        size={16}
                        color={
                          address.defaultShipping
                            ? colors.white
                            : colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.addressText}>
                      <View style={styles.addressNameRow}>
                        <Text style={styles.addressName} numberOfLines={1}>
                          {address.name}
                        </Text>
                        {address.defaultShipping ? (
                          <View style={styles.defaultChip}>
                            <Icon name="star" size={9} color={colors.white} />
                            <Text style={styles.defaultText}>
                              {pickMode ? 'Delivering here' : 'Default'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.addressLine}>{address.address}</Text>
                      <Text style={styles.addressLine}>
                        {[
                          address.areaObj?.name,
                          address.thana,
                          address.district,
                          address.division,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                      <View style={styles.phoneRow}>
                        <Icon
                          name="call-outline"
                          size={12}
                          color={colors.textMuted}
                        />
                        <Text style={styles.addressLine}>
                          {address.mobileNo}
                        </Text>
                      </View>
                    </View>
                    {busyId === address.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : pickMode ? (
                      <View
                        style={[
                          styles.radio,
                          address.defaultShipping && styles.radioOn,
                        ]}
                      >
                        {address.defaultShipping ? (
                          <View style={styles.radioDot} />
                        ) : null}
                      </View>
                    ) : null}
                  </PressableScale>

                  <View style={styles.actions}>
                    {!address.defaultShipping && !pickMode ? (
                      <PressableScale
                        onPress={() => makeDefault(address)}
                        scaleTo={0.94}
                        style={styles.action}
                      >
                        <Icon name="star-outline" size={13} color="#e08a00" />
                        <Text style={[styles.actionText, styles.actionDefault]}>
                          Set default
                        </Text>
                      </PressableScale>
                    ) : null}
                    <PressableScale
                      onPress={() => setSheet({ visible: true, address })}
                      scaleTo={0.94}
                      style={styles.action}
                    >
                      <Icon
                        name="create-outline"
                        size={13}
                        color={colors.text}
                      />
                      <Text style={styles.actionText}>Edit</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => removeAddress(address)}
                      scaleTo={0.94}
                      style={styles.action}
                    >
                      <Icon
                        name="trash-outline"
                        size={13}
                        color={colors.primary}
                      />
                      <Text style={[styles.actionText, styles.actionDelete]}>
                        Delete
                      </Text>
                    </PressableScale>
                  </View>
                </Animated.View>
              ))
            )}
          </Animated.View>
        ) : null}

        <View style={styles.note}>
          <Icon name="shield-checkmark" size={13} color={colors.primary} />
          <Text style={styles.noteText}>
            Your details are only used to deliver your orders.
          </Text>
        </View>
      </ScrollView>

      <AddressSheet
        visible={sheet.visible}
        initial={sheet.address}
        canUnsetDefault={false}
        saving={savingAddress}
        onClose={() => setSheet({ visible: false, address: null })}
        onSave={saveAddress}
      />

      <ConfirmSheet
        visible={confirmRemovePhoto}
        icon="image-outline"
        title="Remove profile photo?"
        message="Your initials will show instead. You can add a new photo any time."
        confirmLabel="Remove"
        confirmIcon="trash-outline"
        cancelLabel="Keep it"
        onConfirm={removePhoto}
        onCancel={() => setConfirmRemovePhoto(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f8' },
  scroll: { paddingBottom: spacing.xl },
  hero: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  blob: { position: 'absolute', borderRadius: radius.full },
  blobA: {
    width: 220,
    height: 220,
    top: -80,
    right: -70,
    backgroundColor: 'rgba(255, 122, 90, 0.18)',
  },
  blobB: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -50,
    backgroundColor: 'rgba(108, 123, 255, 0.12)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  back: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pickHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  pickIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickText: { flex: 1, marginLeft: 10 },
  pickSub: {
    marginTop: 1,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: INK,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 40,
  },
  tabText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  tabTextOn: { color: colors.primary, fontWeight: typography.weight.bold },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d2d2dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  heroTitle: {
    fontSize: typography.size.lg + 1,
    fontWeight: '800',
    color: colors.text,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.white },
  avatarFill: { width: '100%', height: '100%', borderRadius: 21 },
  avatarBusy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 22, 38, 0.45)',
  },
  avatarCamera: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  removePhoto: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2 },
  removePhotoText: { fontSize: 11, fontWeight: typography.weight.bold, color: colors.primary },
  identityText: { flex: 1, marginLeft: 14 },
  name: { fontSize: typography.size.xl, fontWeight: '800', color: colors.text },
  email: {
    marginTop: 1,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  idText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.primary,
  },
  completion: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  completionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.text,
  },
  completionPercent: {
    fontSize: typography.size.sm,
    fontWeight: '800',
    color: colors.primary,
  },
  completionBar: {
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: '#f0f0f4',
    overflow: 'hidden',
  },
  completionFill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
  },
  checkDone: { backgroundColor: '#ecfdf5' },
  checkText: {
    fontSize: 10.5,
    fontWeight: typography.weight.semiBold,
    color: colors.textMuted,
  },
  checkTextDone: { color: '#047857' },
  card: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    shadowColor: '#5b5f7a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDetails: { backgroundColor: '#eef2ff' },
  tileAddress: { backgroundColor: '#e8f7f1' },
  tileCompany: { backgroundColor: '#fdeefe' },
  cardHint: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  genders: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  gender: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: '#f7f7fa',
  },
  genderOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  genderText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  genderTextOn: { color: colors.white },
  cardTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#ecfdf5',
  },
  savedText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: '#047857',
  },
  fieldLabel: {
    marginBottom: 6,
    marginLeft: 2,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semiBold,
    color: colors.textSecondary,
  },
  readonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f7f7fa',
  },
  readonlyText: { flex: 1 },
  readonlyLabel: { fontSize: 10.5, color: colors.textMuted },
  readonlyValue: {
    marginTop: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  saveRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  discard: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  saveShadow: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveFlex: { flex: 1 },
  save: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: colors.white,
    fontSize: typography.size.sm + 1,
    fontWeight: typography.weight.bold,
  },
  count: {
    marginRight: 8,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: typography.size.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    backgroundColor: '#f0f0f4',
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  addText: {
    fontSize: typography.size.xs + 1,
    fontWeight: typography.weight.bold,
    color: colors.white,
  },
  emptyBook: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#f3b4a4',
    backgroundColor: '#fff8f6',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: typography.size.md,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 4,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.xs + 1,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  address: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#ececf1',
    backgroundColor: colors.white,
  },
  addressDefault: { borderColor: '#ffc9bb', backgroundColor: '#fff8f6' },
  addressTop: { flexDirection: 'row', alignItems: 'flex-start' },
  addressIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f3f3f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconDefault: { backgroundColor: colors.primary },
  addressText: { flex: 1, marginLeft: 10 },
  addressNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressName: {
    flexShrink: 1,
    fontSize: typography.size.sm + 1,
    fontWeight: '800',
    color: colors.text,
  },
  defaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  defaultText: { fontSize: 10, fontWeight: '800', color: colors.white },
  addressLine: {
    marginTop: 2,
    fontSize: typography.size.xs + 1,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececf1',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#f3f3f6',
  },
  actionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  actionDefault: { color: '#b45309' },
  actionDelete: { color: colors.primary },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  noteText: { fontSize: typography.size.xs, color: colors.textSecondary },
});

export default ProfileInformationScreen;
