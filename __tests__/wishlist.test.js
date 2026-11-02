import { doc, getDoc, updateDoc } from '@react-native-firebase/firestore';

import wishlistReducer from '../src/reducers/wishlist';
import { REMOVE_FROM_WISHLIST } from '../src/constants/ActionTypes';
import { removeFromWishlistFirestore } from '../src/firebase/wishlist';

describe('removing from the wishlist', () => {
  it('drops the saved product with that id from the list', () => {
    const state = { list: [{ id: 'a', name: 'Bag' }, { id: 'b', name: 'Shoe' }] };
    const next = wishlistReducer(state, { type: REMOVE_FROM_WISHLIST, product_id: 'a' });
    expect(next.list).toEqual([{ id: 'b', name: 'Shoe' }]);
  });

  it('writes to the account document even when the user carries only `id`', async () => {
    doc.mockImplementation((_db, path) => ({ path }));
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ wishlist: [{ id: 'a' }, { id: 'b' }] }) });
    updateDoc.mockResolvedValue();

    await removeFromWishlistFirestore({ id: 'user-1' }, { id: 'a' });

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'wishlists/user-1');
    expect(updateDoc).toHaveBeenCalledWith({ path: 'wishlists/user-1' }, { wishlist: [{ id: 'b' }] });
  });

  it('reports a missing account instead of silently doing nothing', async () => {
    await expect(removeFromWishlistFirestore({}, { id: 'a' })).rejects.toThrow('sign in');
  });
});
