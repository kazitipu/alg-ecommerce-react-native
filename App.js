import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import Toast from 'react-native-toast-message';

import store, { persistor } from './store';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary, SupportFab } from './src/components';
import useFirebaseSync from './src/hooks/useFirebaseSync';
import usePushNotifications from './src/hooks/usePushNotifications';
import { colors } from './src/theme';

/**
 * App shell — the React Native counterpart of the web app's `components/app.jsx`.
 */

/**
 * Lives inside <Provider> because the hooks dispatch and read Redux. It renders
 * the navigator rather than sitting beside it so there is only one subscriber.
 */
const AppContent = () => {
  useFirebaseSync();
  usePushNotifications();

  // Hold the splash until the first frame is ready to show.
  useEffect(() => {
    BootSplash.hide({ fade: true }).catch(() => {});
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <RootNavigator />
      <SupportFab />
      {/* Single toast host, replacing the ~35 ToastContainers the web app mounted. */}
      <Toast />
    </>
  );
};

const App = () => (
  <GestureHandlerRootView style={styles.root}>
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
