import { DEFAULTS } from '../constants/config';
import { adaptProduct } from '../utils/adaptProduct';

const INITIAL_STATE = {
  product: null,
  symbol: DEFAULTS.currencySymbol,
};

/**
 * Holds the product opened from a 1688/Taobao link. `action.route` records
 * which marketplace it came from and ends up on the product as `availability`.
 * The mapping itself lives in `utils/adaptProduct` so the detail screen can
 * reuse it when it fetches directly.
 */
const searchedProductReducer = (state = INITIAL_STATE, action) => {
  if (action.type !== 'SET_SEARCHED_PRODUCT_DETAIL') return state;
  return { ...state, product: adaptProduct(action.payload, action.route) };
};

export default searchedProductReducer;
