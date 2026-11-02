const INITIAL_STATE = {
  bookingRequests: [],
  bookingsArrayOfSingleUser: [],
  bookingObj: null,
  productRequests: [],
  productRequestObj: null,
};

/** Backs the "Buy & Ship for me" requests (Ship for me is no longer offered). */
const setBookingRequestReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'SET_BOOKING_REQUEST':
      return {
        ...state,
        bookingRequests: [...state.bookingRequests, action.payload],
      };

    case 'SET_PRODUCT_REQUEST':
      return {
        ...state,
        productRequests: [...state.productRequests, action.payload],
      };

    case 'GET_ALL_BOOKINGS_OF_SINGLE_USER':
      return { ...state, bookingsArrayOfSingleUser: action.payload };

    case 'GET_SINGLE_PRODUCT_REQUEST':
      return { ...state, productRequestObj: action.payload };

    case 'GET_SINGLE_BOOKING':
      return { ...state, bookingObj: action.payload };

    case 'UPLOAD_REFUND_APPLY_PRODUCT_REQUEST':
      return {
        ...state,
        bookingsArrayOfSingleUser: state.bookingsArrayOfSingleUser.map(order =>
          order.bookingId === action.payload.bookingId ? action.payload : order,
        ),
      };

    // Bulk-marks every request included in the payload as awaiting payment.
    case 'UPDATE_BOOKINGS_OF_SINGLE_USER':
      return {
        ...state,
        bookingsArrayOfSingleUser: state.bookingsArrayOfSingleUser.map(booking => {
          const updated = action.payload.productRequestArray.find(
            candidate => candidate.bookingId === booking.bookingId,
          );
          return updated ? { ...updated, paymentStatus: 'pending' } : booking;
        }),
      };

    default:
      return state;
  }
};

export default setBookingRequestReducer;
