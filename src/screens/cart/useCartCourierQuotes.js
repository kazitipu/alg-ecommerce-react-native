import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { updateCartLocalShippingRedux } from '../../actions';
import { fetchShipping } from '../../api';
import { buildCartShippingRequest, toStoredLocalShipping } from '../../utils/cart';
import { parseLocalShipping } from '../../utils/productDetail';

/** Wait for the stepper to settle before asking for a quote, like the product page. */
const QUOTE_DELAY_MS = 800;

/**
 * Re-quotes the China local courier charge of a cart item after its
 * quantities change, and saves it on the cart entry.
 *
 *   const { pending, isPending, trackChange } = useCartCourierQuotes({ cart, currentUser, taka });
 *   await trackChange(itemId, () => dispatch(updateCartQuantityRedux(...)));
 *
 * An item is pending from the tap until its new quote is stored. Rapid taps
 * are coalesced: only the last change's quote is requested and saved.
 */
const useCartCourierQuotes = ({ cart, currentUser, taka }) => {
  const dispatch = useDispatch();
  const [pending, setPending] = useState(() => new Set());
  const cartRef = useRef(cart);
  const timers = useRef({});
  const versions = useRef({});

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const setItemPending = useCallback((itemId, on) => {
    setPending(previous => {
      if (previous.has(itemId) === on) return previous;
      const next = new Set(previous);
      if (on) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const quote = useCallback(
    async (itemId, version) => {
      const shop = (cartRef.current || []).find(entry => (entry.items || []).some(item => item.id === itemId));
      const item = shop?.items.find(candidate => candidate.id === itemId);
      if (!item) {
        // The item was removed (stepped down to nothing).
        setItemPending(itemId, false);
        return;
      }

      const request = buildCartShippingRequest(item);
      let stored = '0';
      if (request.totalQuantity > 0) {
        try {
          const data = await fetchShipping(request);
          stored = toStoredLocalShipping(parseLocalShipping(data, taka || shop.currency));
        } catch (error) {
          // The web falls back to "included later" when no quote comes back.
          stored = '0';
        }
      }

      // A newer change is on its way; its own quote will be saved instead.
      if (versions.current[itemId] !== version) return;
      try {
        if (stored !== `${shop.localShipping ?? ''}`) {
          await dispatch(updateCartLocalShippingRedux(currentUser, itemId, stored));
        }
      } finally {
        if (versions.current[itemId] === version) setItemPending(itemId, false);
      }
    },
    [currentUser, dispatch, setItemPending, taka],
  );

  /** Runs a quantity change for `itemId`, then schedules its fresh quote. */
  const trackChange = useCallback(
    async (itemId, change) => {
      const version = (versions.current[itemId] || 0) + 1;
      versions.current[itemId] = version;
      clearTimeout(timers.current[itemId]);
      setItemPending(itemId, true);
      try {
        await change();
      } finally {
        if (versions.current[itemId] === version) {
          timers.current[itemId] = setTimeout(() => quote(itemId, version), QUOTE_DELAY_MS);
        }
      }
    },
    [quote, setItemPending],
  );

  const isPending = useCallback(itemId => pending.has(itemId), [pending]);

  return { pending, isPending, trackChange };
};

export default useCartCourierQuotes;
