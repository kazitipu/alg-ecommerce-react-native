import {
  FILTER_BRAND,
  FILTER_COLOR,
  FILTER_PRICE,
  SORT_BY,
} from '../constants/ActionTypes';

const INITIAL_STATE = {
  brand: [],
  color: '',
  value: { min: 0, max: 100000 },
  sortBy: '',
};

const filtersReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case FILTER_BRAND:
      return { ...state, brand: action.brand };
    case FILTER_COLOR:
      return { ...state, color: action.color };
    case FILTER_PRICE:
      return {
        ...state,
        value: { min: action.value.value.min, max: action.value.value.max },
      };
    case SORT_BY:
      return { ...state, sortBy: action.sort_by };
    default:
      return state;
  }
};

export default filtersReducer;
