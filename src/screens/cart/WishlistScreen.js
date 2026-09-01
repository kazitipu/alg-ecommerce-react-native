import React from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { EmptyState, ProductCard } from '../../components';
import { removeFromWishlist } from '../../actions';
import { removeFromWishlistFirestore } from '../../firebase/firebase.utils';
import { useAuth } from '../../hooks';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, spacing } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - GAP) / 2;

/**
 * Saved products, backed by `wishlists/{uid}` and kept live by the snapshot
 * listener in `useFirebaseSync` — so adding on the website shows up here.
 */
const WishlistScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { currentUser, isSignedIn } = useAuth();

  const list = useSelector(state => state.wishlist.list);
  const symbol = useSelector(state => state.data.symbol);
  const taka = useSelector(state => state.user.currency?.taka);

  const remove = async product => {
    dispatch(removeFromWishlist(product.id));
    await removeFromWishlistFirestore(currentUser, product);
  };

  if (!isSignedIn) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Sign in to see your wishlist"
        message="Saved items follow your account across the app and the website."
        actionLabel="Sign in"
        onAction={() => navigation.navigate(ROUTES.LOGIN)}
      />
    );
  }

  if (!list || list.length === 0) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Nothing saved yet"
        message="Tap the heart on a product to keep it here for later."
        actionLabel="Browse products"
        onAction={() => navigation.navigate(ROUTES.TAB_HOME)}
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={list}
      numColumns={2}
      keyExtractor={(item, index) => `${item.id || index}`}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View>
          <ProductCard
            product={item}
            width={CARD_WIDTH}
            symbol={symbol}
            taka={taka}
            onPress={() =>
              navigation.navigate(ROUTES.PRODUCT_DETAIL, { id: item.id, product: item })
            }
          />
          <Pressable style={styles.remove} onPress={() => remove(item)} hitSlop={8}>
            <Icon name="close" size={16} color={colors.white} />
          </Pressable>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  list: { padding: spacing.md },
  column: { gap: GAP, marginBottom: GAP },
  remove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WishlistScreen;
