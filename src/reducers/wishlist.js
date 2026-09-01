import {
  ADD_TO_WISHLIST,
  REMOVE_FROM_WISHLIST,
} from '../constants/ActionTypes';

const INITIAL_STATE = { list: [] };

export default function wishlistReducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case ADD_TO_WISHLIST:
      // Already present: leave the list as it is rather than duplicating.
      if (state.list.some(product => product.id === action.product.id)) {
        return { ...state, list: state.list.map(product => ({ ...product })) };
      }
      return { ...state, list: [...state.list, action.product] };

    // Mirrors `wishlists/{uid}` in Firestore via the app-level snapshot listener.
    case 'SET_REDUX_WISHLIST_ARRAY':
      return { ...state, list: action.payload };

    case REMOVE_FROM_WISHLIST:
      return {
        ...state,
        list: state.list.filter(id => id !== action.product_id),
      };

    default:
      return state;
  }
}
