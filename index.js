/**
 * @format
 */

// Must be the first import: react-native-gesture-handler patches the touch
// system and react-native-screens' native container relies on it.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

import App from './App';
import { name as appName } from './app.json';

// Required by notifee so background notification presses are handled.
notifee.onBackgroundEvent(async () => {});

/**
 * Messages arriving while the app is backgrounded or killed.
 *
 * FCM already draws anything carrying a `notification` payload, so re-drawing
 * it here would show the banner twice — only data-only messages are rendered.
 */
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  if (remoteMessage.notification) return;

  const title = remoteMessage.data?.title;
  const body = remoteMessage.data?.body;
  if (!title && !body) return;

  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Order updates',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title,
    body,
    android: { channelId, pressAction: { id: 'default' } },
  });
});

AppRegistry.registerComponent(appName, () => App);
