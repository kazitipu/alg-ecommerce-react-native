import {
  FETCH_SINGLE_PRODUCT,
  CHANGE_CURRENCY,
  RECEIVE_PRODUCTS,
} from '../constants/ActionTypes';
import { DEFAULTS } from '../constants/config';

const INITIAL_STATE = {
  products: [],
  symbol: DEFAULTS.currencySymbol,
  product_details: [],
};

/** Firestore stores `price_range` as a JSON string; the UI needs the array. */
const parsePriceRange = priceRange => {
  if (!priceRange || priceRange.length === 0) return [];
  if (Array.isArray(priceRange)) return priceRange;
  try {
    return JSON.parse(priceRange);
  } catch (error) {
    return [];
  }
};

const productReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case RECEIVE_PRODUCTS:
      return { ...state, products: action.products };

    case 'FETCH_ALL_PRODUCTS_FROM_FIRESTORE':
      return {
        ...state,
        products: action.payload.map(product => ({
          ...product,
          price_range: parsePriceRange(product.price_range),
        })),
      };

    case FETCH_SINGLE_PRODUCT:
      return {
        ...state,
        products: [
          ...state.products,
          {
            ...action.payload,
            price_range: parsePriceRange(action.payload.price_range),
          },
        ],
      };

    case CHANGE_CURRENCY:
      return { ...state, symbol: action.symbol };

    default:
      return state;
  }
};

export default productReducer;
