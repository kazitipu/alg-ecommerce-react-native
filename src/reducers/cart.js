import {
  ADD_TO_CART,
  REMOVE_FROM_CART,
  DECREMENT_QTY,
} from '../constants/ActionTypes';

/**
 * The live 1688 cart is a shop -> items -> skus tree kept in sync with
 * `carts/{uid}` in Firestore via SET_REDUX_CART, and that is what the cart and
 * checkout screens read.
 *
 * DECREMENT_QTY and REMOVE_FROM_CART below act on the older flat cart model and
 * are still dispatched by the header mini-cart and the `/cart` screen, so they
 * are ported. Their odd-looking conditions reproduce the web reducer exactly —
 * including its quirks (see the notes on each branch). Behaviour is matched
 * deliberately rather than corrected, so the app stays consistent with the site;
 * these are worth revisiting once the flat cart is retired entirely.
 */
const INITIAL_STATE = {
  cart: [],
  pendingOrders: [],
};

/** Sale prices arrive as numbers, "1200", or a "900-1200" range string. */
const resolvePrice = salePrice => {
  if (typeof salePrice !== 'string') return salePrice;
  return salePrice.includes('-')
    ? Number(salePrice.split('-')[1])
    : parseInt(salePrice, 10);
};

export default function cartReducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case ADD_TO_CART:
      return { ...state, cart: action.payload };

    case 'REMOVE_FROM_CART_API':
      return { ...state, cart: action.payload };

    case 'SET_REDUX_CART':
      return { ...state, cart: action.payload };

    case 'ADD_TO_PENDING_ORDERS':
      return { ...state, pendingOrders: action.payload };

    case DECREMENT_QTY: {
      // Reproduces the web reducer's `a === b && a.size ? ... : true` grouping:
      // the `&&` binds tighter than `?:`, so any item without `sizeOrShipsFrom`
      // (or with a different id) takes the `true` branch and is considered a
      // match on size.
      const sameVariant = state.cart.filter(item => {
        const sizeMatches =
          item.id === action.product.id && item.sizeOrShipsFrom
            ? item.sizeOrShipsFrom === action.product.sizeOrShipsFrom
            : true;
        if (!sizeMatches) return false;
        return item.color ? item.color === action.product.color : true;
      });

      const alreadyInCart =
        state.cart.findIndex(product => product.id === action.productId) !== -1;

      if (alreadyInCart && sameVariant.length > 0) {
        const cart = state.cart.reduce((acc, product) => {
          if (product.id === action.productId && product.qty >= 1) {
            const variantMatches =
              (product.color ? product.color === action.product.color : true) &&
              (product.sizeOrShipsFrom
                ? product.sizeOrShipsFrom === action.product.sizeOrShipsFrom
                : true);
            // NOTE: when the id matches but the variant does not, the web
            // reducer pushes nothing and the line silently disappears from the
            // cart. Preserved as-is.
            if (variantMatches) {
              acc.push({
                ...product,
                qty: product.qty - 1,
                sum: resolvePrice(product.salePrice) * (product.qty - 1),
              });
            }
          } else {
            acc.push(product);
          }
          return acc;
        }, []);

        return { ...state, cart: cart.filter(item => item.qty !== 0) };
      }

      return {
        ...state,
        cart: [
          ...state.cart,
          {
            ...action.product,
            qty: action.qty,
            sum: resolvePrice(action.product.salePrice) * action.qty,
          },
        ],
      };
    }

    case REMOVE_FROM_CART: {
      // A line is dropped only when the id matches AND it carries a colour that
      // matches AND a sizeOrShipsFrom that matches. Items with no colour (or no
      // size) therefore survive — matching the web app, where such lines cannot
      // be removed through this action at all.
      const cart = [];
      state.cart.forEach(cartItem => {
        if (cartItem.id !== action.product.id) {
          cart.push(cartItem);
        } else if (
          cartItem.color ? cartItem.color !== action.product.color : true
        ) {
          cart.push(cartItem);
        } else if (
          cartItem.sizeOrShipsFrom
            ? cartItem.sizeOrShipsFrom !== action.product.sizeOrShipsFrom
            : true
        ) {
          cart.push(cartItem);
        }
      });
      return { ...state, cart };
    }

    default:
      return state;
  }
}
