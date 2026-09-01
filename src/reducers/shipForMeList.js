const INITIAL_STATE = {
  shipForMeList: [],
};

const shipForMeListReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'GET_ALL_SHIP_FOR_ME_LIST':
      return { ...state, shipForMeList: [...action.payload] };

    case 'UPLOAD_SHIP_FOR_ME_LIST':
      return {
        ...state,
        shipForMeList: [action.payload, ...state.shipForMeList],
      };

    // An edit re-inserts the item at the head of the list, matching the web app.
    case 'UPDATE_SHIP_FOR_ME_LIST':
      return {
        ...state,
        shipForMeList: [
          action.payload,
          ...state.shipForMeList.filter(
            shipForMe => shipForMe.bookingId !== action.payload.bookingId,
          ),
        ],
      };

    case 'DELETE_SHIP_FOR_ME_LIST':
      return {
        ...state,
        shipForMeList: state.shipForMeList.filter(
          product => product.bookingId !== action.payload.bookingId,
        ),
      };

    default:
      return state;
  }
};

export default shipForMeListReducer;
