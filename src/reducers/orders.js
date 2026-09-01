const INITIAL_STATE = {
  orders: [],
  ordersApi: [],
  orderTrackingResult: null,
  banners: [],
  campaigns: [],
  orderObj: null,
};

const setOrderReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case 'SET_ORDER_OBJECT':
      return { ...state, orders: [...state.orders, action.payload] };

    case 'UPDATE_ORDERS_API':
    case 'GET_ALL_ORDERS_API_OF_SINGLE_USER':
      return { ...state, ordersApi: action.payload };

    case 'UPDATE_SINGLE_ORDER_API':
      return {
        ...state,
        ordersApi: state.ordersApi.map(order =>
          order.orderId === action.payload.orderId
            ? { ...action.payload, paymentStatus: 'pending' }
            : order,
        ),
      };

    case 'UPLOAD_REFUND_APPLY':
      return {
        ...state,
        ordersApi: state.ordersApi.map(order =>
          order.orderId === action.payload.orderId ? action.payload : order,
        ),
      };

    case 'GET_SINGLE_ORDER_API':
      return { ...state, orderObj: action.payload };

    case 'GET_ORDER_TRACKING_RESULT':
      return { ...state, orderTrackingResult: action.payload };

    case 'GET_ALL_BANNERS':
      return { ...state, banners: action.payload };

    case 'GET_ALL_CAMPAIGNS':
      return { ...state, campaigns: action.payload };

    default:
      return state;
  }
};

export default setOrderReducer;
