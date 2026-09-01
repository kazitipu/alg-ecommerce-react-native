const INITIAL_STATE = {
  bookingRequests: [],
  bookingsArrayOfSingleUser: [],
  shipForMeOfSingleUser: [],
  shipForMeObj: null,
  bookingObj: null,
  d2dRates: [],
  productRequests: [],
  productRequestObj: null,
};

/** Backs both freight flows: "Buy & Ship for me" requests and "Ship for me" bookings. */
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

    case 'GET_ALL_SHIP_FOR_ME_OF_SINGLE_USER':
      return { ...state, shipForMeOfSingleUser: action.payload };

    case 'GET_SINGLE_SHIP_FOR_ME':
      return { ...state, shipForMeObj: action.payload };

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

    case 'SET_SHIP_FOR_ME':
      return {
        ...state,
        shipForMeOfSingleUser: [action.payload, ...state.shipForMeOfSingleUser],
      };

    case 'UPDATE_SHIP_FOR_ME':
    case 'UPDATE_SHIPMENT_REQUEST':
      return {
        ...state,
        shipForMeOfSingleUser: state.shipForMeOfSingleUser.map(booking =>
          booking.bookingId === action.payload.bookingId
            ? { ...action.payload }
            : booking,
        ),
      };

    case 'UPDATE_SHIPMENT_PAYMENT_REQUEST':
      return {
        ...state,
        shipForMeOfSingleUser: state.shipForMeOfSingleUser.map(booking =>
          booking.bookingId === action.payload.bookingId
            ? { ...action.payload, paymentRequested: true }
            : booking,
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

    case 'GET_ALL_D2D_RATES':
      return { ...state, d2dRates: [...action.payload] };

    default:
      return state;
  }
};

export default setBookingRequestReducer;
