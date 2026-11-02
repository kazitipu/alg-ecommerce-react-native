import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Dark status-bar icons while the calling screen is focused. Most screens have
 * red headers with light icons; screens with a light custom header use this so
 * the icons stay readable, and the previous style comes back on blur.
 */
export const useDarkStatusBar = () =>
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle: 'dark-content', animated: true });
      return () => StatusBar.popStackEntry(entry);
    }, []),
  );

export default useDarkStatusBar;
