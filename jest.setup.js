/* eslint-env jest */

// AsyncStorage v3 no longer ships a Jest mock, so back it with a plain Map.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
      multiGet: jest.fn(keys =>
        Promise.resolve(keys.map(key => [key, store.get(key) ?? null])),
      ),
      multiSet: jest.fn(pairs => {
        pairs.forEach(([key, value]) => store.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn(keys => {
        keys.forEach(key => store.delete(key));
        return Promise.resolve();
      }),
    },
  };
});

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(),
  isVisible: jest.fn().mockResolvedValue(false),
}));

// React Native Firebase talks to native modules that do not exist under Jest.
// These stubs let the data layer be imported and its shape asserted.
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(), doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(),
  setDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(),
  query: jest.fn(), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), arrayUnion: jest.fn(), serverTimestamp: jest.fn(),
  Timestamp: { now: jest.fn() },
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: { credential: jest.fn() },
  FacebookAuthProvider: { credential: jest.fn() },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithCustomToken: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(), putFile: jest.fn(), getDownloadURL: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));

// WebView and the image picker are native-only; stub them so screens that use
// them can still be rendered and asserted on.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, WebView: View, default: View };
});

jest.mock('react-native-image-picker', () => ({
  __esModule: true,
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
  launchCamera: jest.fn().mockResolvedValue({ didCancel: true }),
}));

jest.mock('react-native-html-to-pdf', () => ({
  __esModule: true,
  default: { convert: jest.fn().mockResolvedValue({ filePath: '/tmp/invoice.pdf' }) },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn().mockResolvedValue('test-token'),
  onMessage: jest.fn(() => jest.fn()),
  requestPermission: jest.fn().mockResolvedValue(1),
  setBackgroundMessageHandler: jest.fn(),
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0 },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('default'),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    displayNotification: jest.fn().mockResolvedValue(),
    onBackgroundEvent: jest.fn(),
  },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn(), getString: jest.fn().mockResolvedValue('') },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: { dirs: { DownloadDir: '/downloads', DocumentDir: '/documents' } },
    config: jest.fn(() => ({ fetch: jest.fn().mockResolvedValue({}) })),
  },
}));
