import {
  ADD_TO_COMPARE,
  REMOVE_FROM_COMPARE,
} from '../constants/ActionTypes';

const INITIAL_STATE = { items: [] };

export default function compareReducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case ADD_TO_COMPARE:
      if (state.items.some(product => product.id === action.product.id)) {
        return { ...state, items: state.items.map(product => ({ ...product })) };
      }
      return { ...state, items: [...state.items, action.product] };

    case REMOVE_FROM_COMPARE: {
      // Same colour/size guard the cart uses: an entry is dropped only when the
      // id, colour and size all match.
      const items = [];
      state.items.forEach(compareItem => {
        if (compareItem.id !== action.product.id) {
          items.push(compareItem);
        } else if (
          compareItem.color ? compareItem.color !== action.product.color : true
        ) {
          items.push(compareItem);
        } else if (
          compareItem.sizeOrShipsFrom
            ? compareItem.sizeOrShipsFrom !== action.product.sizeOrShipsFrom
            : true
        ) {
          items.push(compareItem);
        }
      });
      return { ...state, items };
    }

    default:
      return state;
  }
}
