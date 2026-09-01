module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    'react-native-gesture-handler/jestSetup',
    '<rootDir>/jest.setup.js',
  ],
  // Font and image imports (e.g. the vector-icon .ttf files) are not JS.
  moduleNameMapper: {
    '\\.(ttf|otf|woff|woff2|eot|png|jpe?g|gif|webp|svg|mp4)$':
      '<rootDir>/jest/fileMock.js',
    '^react-native-reanimated$': '<rootDir>/jest/reanimatedMock.js',
  },
  // Several dependencies ship untranspiled ESM and must go through babel.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-redux|redux-persist|@react-navigation|@notifee|@react-native-firebase|@react-native-vector-icons|react-native-.*|@react-native-.*)/)',
  ],
};
