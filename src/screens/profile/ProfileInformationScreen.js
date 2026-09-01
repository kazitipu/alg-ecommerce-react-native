import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';

import { BottomSheet, Button, EmptyState, Input, SegmentedControl } from '../../components';
import { setCurrentUser } from '../../actions';
import { getSingleUser, updateUser } from '../../firebase/firebase.utils';
import { fetchAreas } from '../../api';
import { useAuth } from '../../hooks';
import { DIVISIONS, districtsOf } from '../../constants/bdAddress';
import { allThanas } from '../../constants/thana';
import { generateBookingId } from '../../utils/ids';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';

const emptyAddress = () => ({
  name: '',
  mobileNo: '',
  address: '',
  division: '',
  district: '',
  thana: '',
  areaObj: null,
});

/**
 * Profile and address book.
 *
 * An address is not just text: checkout quotes the Bangladesh delivery charge
 * from RedX using the area's id, so division → district → thana → area must all
 * be picked, and the area comes from RedX's own list for that district.
 */
const ProfileInformationScreen = () => {
  const dispatch = useDispatch();
  const { currentUser, isSignedIn } = useAuth();

  const [profile, setProfile] = useState({
    displayName: currentUser?.displayName || '',
    mobileNo: currentUser?.mobileNo || '',
    company: currentUser?.company || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [draft, setDraft] = useState(emptyAddress());
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const addressBook = currentUser?.addressBook || [];

  const districts = useMemo(() => districtsOf(draft.division), [draft.division]);
  const thanas = useMemo(
    () => allThanas.find(entry => entry.name === draft.district)?.thana || [],
    [draft.district],
  );

  // RedX publishes areas per district, and only the id it returns is usable.
  useEffect(() => {
    if (!draft.district) {
      setAreas([]);
      return undefined;
    }

    let active = true;
    setLoadingAreas(true);
    fetchAreas(draft.district)
      .then(result => active && setAreas(result))
      .catch(() => active && setAreas([]))
      .finally(() => active && setLoadingAreas(false));

    return () => {
      active = false;
    };
  }, [draft.district]);

  const refreshUser = async () => {
    const fresh = await getSingleUser(currentUser.id);
    if (fresh) dispatch(setCurrentUser({ ...fresh, id: currentUser.id }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateUser({ ...currentUser, ...profile });
      await refreshUser();
      notifySuccess('Profile updated');
    } catch (error) {
      notifyError(error, 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async () => {
    if (!draft.name || !draft.mobileNo || !draft.address) {
      notifyError('Please fill in the name, mobile number and address.');
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
        id: draft.id || generateBookingId(),
        // The first address saved becomes the default so checkout has one.
        defaultShipping: draft.defaultShipping ?? addressBook.length === 0,
      };

      const nextBook = draft.id
        ? addressBook.map(item => (item.id === draft.id ? entry : item))
        : [...addressBook, entry];

      await updateUser({ ...currentUser, addressBook: nextBook });
      await refreshUser();

      setFormVisible(false);
      setDraft(emptyAddress());
      notifySuccess('Address saved');
    } catch (error) {
      notifyError(error, 'Could not save the address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const makeDefault = async address => {
    const nextBook = addressBook.map(item => ({
      ...item,
      defaultShipping: item.id === address.id,
    }));
    await updateUser({ ...currentUser, addressBook: nextBook });
    await refreshUser();
  };

  const removeAddress = async address => {
    const nextBook = addressBook.filter(item => item.id !== address.id);
    await updateUser({ ...currentUser, addressBook: nextBook });
    await refreshUser();
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your details</Text>

          <Input
            label="Full name"
            value={profile.displayName}
            onChangeText={value => setProfile({ ...profile, displayName: value })}
          />
          <Input
            label="Mobile number"
            keyboardType="phone-pad"
            value={profile.mobileNo}
            onChangeText={value => setProfile({ ...profile, mobileNo: value })}
          />
          <Input
            label="Company (optional)"
            value={profile.company}
            onChangeText={value => setProfile({ ...profile, company: value })}
          />

          {currentUser?.email ? (
            <Text style={styles.readonly}>Email: {currentUser.email}</Text>
          ) : null}
          {currentUser?.userId ? (
            <Text style={styles.readonly}>Customer ID: {currentUser.userId}</Text>
          ) : null}

          <Button title="Save profile" onPress={saveProfile} loading={savingProfile} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Address book</Text>
            <Pressable
              onPress={() => {
                setDraft(emptyAddress());
                setFormVisible(true);
              }}
              hitSlop={8}>
              <Text style={styles.addLink}>+ Add address</Text>
            </Pressable>
          </View>

          {addressBook.length === 0 ? (
            <Text style={styles.muted}>
              Add a delivery address so we can quote your in-country delivery
              charge at checkout.
            </Text>
          ) : (
            addressBook.map(address => (
              <View
                key={address.id}
                style={[styles.address, address.defaultShipping && styles.addressDefault]}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  {address.defaultShipping ? (
                    <View style={styles.defaultChip}>
                      <Text style={styles.defaultChipText}>Default</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.addressLine}>{address.address}</Text>
                <Text style={styles.addressLine}>
                  {address.thana}, {address.district}, {address.division}
                </Text>
                <Text style={styles.addressLine}>{address.mobileNo}</Text>

                <View style={styles.addressActions}>
                  {!address.defaultShipping ? (
                    <Pressable onPress={() => makeDefault(address)} hitSlop={8}>
                      <Text style={styles.actionLink}>Make default</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setDraft(address);
                      setFormVisible(true);
                    }}
                    hitSlop={8}>
                    <Text style={styles.actionLink}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => removeAddress(address)} hitSlop={8}>
                    <Text style={[styles.actionLink, styles.deleteLink]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        title={draft.id ? 'Edit address' : 'Add address'}
        fullHeight>
        <Input
          label="Full name"
          value={draft.name}
          onChangeText={value => setDraft({ ...draft, name: value })}
        />
        <Input
          label="Mobile number"
          keyboardType="phone-pad"
          value={draft.mobileNo}
          onChangeText={value => setDraft({ ...draft, mobileNo: value })}
        />
        <Input
          label="Street address"
          placeholder="House, road, area"
          multiline
          value={draft.address}
          onChangeText={value => setDraft({ ...draft, address: value })}
        />

        <Text style={styles.pickerLabel}>Division</Text>
        <SegmentedControl
          scrollable
          value={draft.division}
          onChange={value =>
            setDraft({ ...draft, division: value, district: '', thana: '', areaObj: null })
          }
          segments={DIVISIONS.map(division => ({ value: division, label: division }))}
        />

        {districts.length > 0 ? (
          <>
            <Text style={styles.pickerLabel}>District</Text>
            <SegmentedControl
              scrollable
              value={draft.district}
              onChange={value =>
                setDraft({ ...draft, district: value, thana: '', areaObj: null })
              }
              segments={districts.map(district => ({ value: district, label: district }))}
            />
          </>
        ) : null}

        {thanas.length > 0 ? (
          <>
            <Text style={styles.pickerLabel}>Thana</Text>
            <SegmentedControl
              scrollable
              value={draft.thana}
              onChange={value => setDraft({ ...draft, thana: value })}
              segments={thanas.map(thana => ({ value: thana, label: thana }))}
            />
          </>
        ) : null}

        {draft.district ? (
          <>
            <Text style={styles.pickerLabel}>Delivery area</Text>
            {loadingAreas ? (
              <Text style={styles.muted}>Loading areas…</Text>
            ) : areas.length > 0 ? (
              <SegmentedControl
                scrollable
                value={draft.areaObj?.name}
                onChange={value =>
                  setDraft({
                    ...draft,
                    areaObj: areas.find(area => area.name === value) || null,
                  })
                }
                segments={areas.map(area => ({ value: area.name, label: area.name }))}
              />
            ) : (
              <Text style={styles.muted}>
                No delivery areas found for {draft.district}.
              </Text>
            )}
          </>
        ) : null}

        <Button
          title="Save address"
          onPress={saveAddress}
          loading={savingAddress}
          style={styles.saveAddress}
        />
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  readonly: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  addLink: {
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semiBold,
  },
  muted: { fontSize: typography.size.sm, color: colors.textMuted, lineHeight: 20 },
  address: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addressDefault: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
    color: colors.text,
  },
  defaultChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  defaultChipText: {
    fontSize: typography.size.xxs,
    color: colors.white,
    fontWeight: typography.weight.semiBold,
  },
  addressLine: { fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  addressActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actionLink: { fontSize: typography.size.xs, color: colors.primary },
  deleteLink: { color: colors.error },
  pickerLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  saveAddress: { marginTop: spacing.lg },
});

export default ProfileInformationScreen;
