const INITIAL_STATE = { notices: [], introModal: null, blogs: [] };

const setNoticesReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'GET_ALL_NOTICES':
      return { ...state, notices: [...action.payload] };
    case 'GET_ALL_BLOGS':
      return { ...state, blogs: [...action.payload] };
    case 'SET_INTRO_MODAL':
      return { ...state, introModal: action.payload };
    default:
      return state;
  }
};

export default setNoticesReducer;
