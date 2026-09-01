/**
 * Minimal react-native-reanimated stand-in for Jest.
 *
 * The package's own `mock.js` re-enters its native entry points (it imports
 * from `./index`, which pulls in `ReducedMotion.native`), so it throws
 * "[Worklets] createShareable is not supported on web" under Jest. This stub
 * covers only the surface the app uses: animations become inert, while
 * component structure, props and styles still render for assertions.
 */
const { View, Image, Text, ScrollView, FlatList } = require('react-native');

const identity = value => value;
const noop = () => {};

const Animated = {
  View,
  Image,
  Text,
  ScrollView,
  FlatList,
  createAnimatedComponent: Component => Component,
};

module.exports = {
  __esModule: true,
  default: Animated,

  // Values
  useSharedValue: initial => ({ value: initial }),
  useDerivedValue: factory => ({ value: factory() }),
  useAnimatedStyle: factory => {
    try {
      return factory();
    } catch (error) {
      return {};
    }
  },
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => noop,
  useAnimatedGestureHandler: () => noop,

  // Animations resolve immediately to their target value.
  withTiming: identity,
  withSpring: identity,
  withDecay: identity,
  withDelay: (_delay, value) => value,
  withRepeat: identity,
  withSequence: (...values) => values[values.length - 1],
  cancelAnimation: noop,
  runOnJS: fn => fn,
  runOnUI: fn => fn,
  interpolate: identity,
  interpolateColor: identity,

  Easing: new Proxy(
    {},
    {
      get: () => {
        const easing = () => easing;
        return easing;
      },
    },
  ),

  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },

  FadeIn: {}, FadeOut: {}, Layout: {}, SlideInDown: {}, SlideOutDown: {},
};
