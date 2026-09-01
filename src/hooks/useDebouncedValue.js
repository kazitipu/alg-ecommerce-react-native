import { useEffect, useState } from 'react';

/**
 * Delays a fast-changing value. Used for the product-detail shipping estimate,
 * which the web app debounced by 1000ms via lodash so typing a quantity did not
 * fire a request per keystroke.
 */
export const useDebouncedValue = (value, delay = 1000) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
