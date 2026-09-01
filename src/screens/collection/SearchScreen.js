import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../components';
import { uploadSearchImage } from '../../api';
import { resolveSearchInput } from '../../utils/productLink';
import { notifyError } from '../../utils/notify';
import { HOME_CATEGORIES } from '../../constants/categories';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Search entry point.
 *
 * Handles the three ways ALG customers look for something: type a keyword,
 * paste a 1688/Taobao product link, or search by photo. The web app did all
 * three too, but opened each in a new browser tab — here they push a screen.
 */
const SearchScreen = () => {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const submit = () => {
    const intent = resolveSearchInput(query);
    if (!intent) {
      notifyError('Type something to search for.');
      return;
    }

    if (intent.type === 'product') {
      // A pasted marketplace link goes straight to that product.
      navigation.navigate(
        intent.source === '1688' ? ROUTES.PRODUCT_1688 : ROUTES.PRODUCT_TAOBAO,
        { id: intent.id, source: intent.source },
      );
      return;
    }

    navigation.navigate(ROUTES.COLLECTION, {
      keyword: intent.keyword,
      title: intent.keyword,
    });
  };

  /** Uploads a photo, then searches 1688 by the returned image id. */
  const searchByPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset) {
      notifyError('Could not read that photo.');
      return;
    }

    setUploading(true);
    try {
      const data = await uploadSearchImage(asset);
      const imgId = data?.imgId || data?.imageUrl || data;
      if (!imgId) {
        notifyError('The photo could not be processed. Try another one.');
        return;
      }
      navigation.navigate(ROUTES.COLLECTION, { imgId, title: 'Photo search' });
    } catch (error) {
      notifyError(error, 'Image search failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.searchRow}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="Search, or paste a 1688 / Taobao link"
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={styles.photoButton}
        onPress={uploading ? undefined : searchByPhoto}>
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Icon name="camera-outline" size={20} color={colors.primary} />
            <Text style={styles.photoLabel}>Search by photo</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.hint}>
        Paste a product link from 1688 or Taobao and we'll open it directly.
      </Text>

      <Text style={styles.sectionTitle}>Popular categories</Text>
      <View style={styles.chips}>
        {HOME_CATEGORIES.map(category => (
          <Pressable
            key={category.name}
            style={styles.chip}
            onPress={() =>
              navigation.navigate(ROUTES.COLLECTION, {
                keyword: category.name,
                title: category.name,
              })
            }>
            <Text style={styles.chipLabel}>{category.name}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: 0,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  photoLabel: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semiBold,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipLabel: { fontSize: typography.size.sm, color: colors.textSecondary },
});

export default SearchScreen;
