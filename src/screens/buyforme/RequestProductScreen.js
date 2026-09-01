import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { Button, Input, Screen } from '../../components';
import { setProductRequestRedux } from '../../actions';
import { uploadImageProduct } from '../../firebase/firebase.utils';
import { useAuth, useAuthGuard } from '../../hooks';
import { notifyError, notifySuccess } from '../../utils/notify';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * "Request a product" — the customer describes what they want and ALG sources
 * it. Creates a `bookingRequest` document, which is the same pipeline the
 * buy-for-me dashboard reads.
 */
const RequestProductScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const requireAuth = useAuthGuard();
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    productName: '',
    productLink: '',
    quantity: '',
    budget: '',
    notes: '',
  });
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = key => value => setForm(previous => ({ ...previous, [key]: value }));

  const pickPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (asset) setPhoto(asset);
  };

  const submit = () =>
    requireAuth(async () => {
      if (!form.productName.trim() && !form.productLink.trim()) {
        notifyError('Tell us the product name or paste a link.');
        return;
      }

      setSubmitting(true);
      try {
        // Storage first: the booking stores the URL, never the local file.
        const imageUrl = photo ? await uploadImageProduct(photo) : null;

        await dispatch(
          setProductRequestRedux({
            ...form,
            imageUrl,
            userId: currentUser.id,
            displayName: currentUser.displayName,
            mobileNo: currentUser.mobileNo || '',
            status: 'pending',
            paymentStatus: 'unpaid',
            shipmentStatusScore: 1,
            time: Date.now(),
          }),
        );

        notifySuccess(
          'Request sent',
          'Our sourcing team will get back to you with a quote.',
        );
        navigation.goBack();
      } catch (error) {
        notifyError(error, 'Could not send your request.');
      } finally {
        setSubmitting(false);
      }
    });

  return (
    <Screen scroll>
      <Text style={styles.heading}>Request a product</Text>
      <Text style={styles.sub}>
        Tell us what you're after and we'll source it and quote you.
      </Text>

      <Input
        label="Product name"
        placeholder="What are you looking for?"
        value={form.productName}
        onChangeText={update('productName')}
      />
      <Input
        label="Product link (optional)"
        placeholder="https://…"
        autoCapitalize="none"
        value={form.productLink}
        onChangeText={update('productLink')}
      />
      <Input
        label="Quantity"
        placeholder="How many do you need?"
        keyboardType="number-pad"
        value={form.quantity}
        onChangeText={update('quantity')}
      />
      <Input
        label="Budget per unit (optional)"
        placeholder="Tk"
        keyboardType="number-pad"
        value={form.budget}
        onChangeText={update('budget')}
      />
      <Input
        label="Notes"
        placeholder="Colour, size, packaging, anything else"
        multiline
        value={form.notes}
        onChangeText={update('notes')}
        style={styles.notes}
      />

      <Pressable style={styles.photoPicker} onPress={pickPhoto}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
        ) : (
          <>
            <Icon name="image-outline" size={24} color={colors.primary} />
            <Text style={styles.photoLabel}>Attach a reference photo</Text>
          </>
        )}
      </Pressable>

      <Button
        title="Send request"
        onPress={submit}
        loading={submitting}
        style={styles.submit}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  sub: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  notes: { minHeight: 90 },
  photoPicker: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoLabel: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  submit: { marginTop: spacing.lg },
});

export default RequestProductScreen;
