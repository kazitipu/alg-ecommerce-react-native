import { DEFAULTS } from '../constants/config';

const INITIAL_STATE = {
  products: [],
  symbol: DEFAULTS.currencySymbol,
  product_details: [],
  totalResults: 0,
  totalFound: 0,
};

/** Search results accumulate across pages; the screen empties them on a new query. */
const searchedProductsArrayReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'SET_SEARCHED_PRODUCTS_ARRAY':
      return {
        ...state,
        products: [...state.products, ...action.payload],
        totalResults: action.totalResults,
        totalFound: action.totalFound,
      };
    case 'EMPTY_SEARCHED_PRODUCTS_ARRAY':
      return { ...state, products: [], totalResults: 0, totalFound: 0 };
    default:
      return state;
  }
};

export default searchedProductsArrayReducer;
