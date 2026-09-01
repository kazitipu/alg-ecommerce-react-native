const INITIAL_STATE = {
  currentUser: {
    displayName: '',
    email: '',
  },
  currency: null,
  homeCategories: [],
  otpNumber: '',
  introModal: null,
};

const setCurrentUserReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_INTRO_MODAL':
      return { ...state, introModal: action.payload };
    case 'GET_CURRENCY_REDUX':
      return { ...state, currency: action.payload };
    case 'GET_ALL_HOME_CATEGORIES':
      return { ...state, homeCategories: [...action.payload] };
    case 'SET_NUMBER':
      return { ...state, otpNumber: action.payload };
    default:
      return state;
  }
};

export default setCurrentUserReducer;
