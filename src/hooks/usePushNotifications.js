import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

import { updateUser } from '../firebase/users';
import useAuth from './useAuth';

/**
 * Push notifications.
 *
 * New to the app — the website had no FCM at all — but essential here: this is
 * how a customer learns their parcel cleared customs without opening the app.
 * The device token is stored on the user document so the admin panel can target
 * them, which is the same mechanism the Fleego app uses.
 */
export const usePushNotifications = () => {
  const { currentUser, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let unsubscribe;

    const setup = async () => {
      try {
        const messaging = getMessaging();

        // Android 13+ gates notifications behind the runtime POST_NOTIFICATIONS
        // grant, and Firebase's own requestPermission does not ask for it —
        // notifee does. iOS keeps using the Firebase prompt.
        if (Platform.OS === 'android') {
          const settings = await notifee.requestPermission();
          // 1 = AUTHORIZED, 2 = PROVISIONAL; 0 means the user denied it.
          if (settings.authorizationStatus === 0) return;
        } else {
          const status = await requestPermission(messaging);
          const granted =
            status === AuthorizationStatus.AUTHORIZED ||
            status === AuthorizationStatus.PROVISIONAL;
          if (!granted) return;
        }

        await notifee.createChannel({
          id: 'default',
          name: 'Order updates',
          importance: AndroidImportance.HIGH,
        });

        const token = await getToken(messaging);
        // Only write when it has actually changed, to avoid a needless write
        // on every launch.
        if (token && token !== currentUser.fcmToken) {
          await updateUser({
            ...currentUser,
            fcmToken: token,
            platform: Platform.OS,
          });
        }

        // Foreground messages are not shown by the OS, so they are drawn here.
        unsubscribe = onMessage(messaging, async remoteMessage => {
          const title = remoteMessage.notification?.title || remoteMessage.data?.title;
          const body = remoteMessage.notification?.body || remoteMessage.data?.body;
          if (!title && !body) return;

          await notifee.displayNotification({
            title,
            body,
            android: { channelId: 'default', pressAction: { id: 'default' } },
          });
        });
      } catch (error) {
        // Push is a nicety; never let it break app startup.
        console.warn('[push] setup failed', error?.message);
      }
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSignedIn, currentUser]);
};

export default usePushNotifications;
