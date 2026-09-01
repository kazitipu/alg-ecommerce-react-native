import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import useAuth from './useAuth';
import { ROUTES } from '../navigation/routes';

/**
 * Gate an action behind sign-in.
 *
 * The web app had no route guards at all — every dashboard URL was publicly
 * reachable and screens simply rendered empty for signed-out visitors. Mobile
 * needs a real gate, so this sends the user to Login and hands the calling
 * screen back once they return.
 *
 *   const requireAuth = useAuthGuard();
 *   const onCheckout = () => requireAuth(() => navigate(ROUTES.PLACE_ORDER));
 */
export const useAuthGuard = () => {
  const navigation = useNavigation();
  const { isSignedIn } = useAuth();

  return useCallback(
    action => {
      if (!isSignedIn) {
        navigation.navigate(ROUTES.LOGIN, { redirectBack: true });
        return false;
      }
      if (action) action();
      return true;
    },
    [isSignedIn, navigation],
  );
};

export default useAuthGuard;
