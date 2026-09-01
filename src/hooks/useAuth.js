import { useSelector } from 'react-redux';

/**
 * Current user, kept in sync with Firebase by the listener in `App.js`.
 *
 * A signed-out user is represented by `{ displayName: '', email: '' }` rather
 * than null (the web app's convention), so presence is tested by `uid`/`id`.
 */
export const useAuth = () => {
  const currentUser = useSelector(state => state.user.currentUser);
  const isSignedIn = Boolean(currentUser?.uid || currentUser?.id);
  return { currentUser, isSignedIn };
};

export default useAuth;
