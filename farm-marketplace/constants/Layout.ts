import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

const isSmallDevice = width < 375;
const isLargeDevice = width >= 768;

/** Scales a size down slightly on small phones so nothing overflows. */
const scale = (size: number) => {
  if (isSmallDevice) return Math.round(size * 0.92);
  if (isLargeDevice) return Math.round(size * 1.05);
  return size;
};

export default {
  window: {
    width,
    height,
  },
  isSmallDevice,
  isMediumDevice: width >= 375 && width < 768,
  isLargeDevice,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  scale,

  /** Safe top padding for screens that draw their own header. */
  statusBarHeight:
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0,

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  /** Minimum touch target — keeps controls tappable on every screen size. */
  touchTarget: 44,

  /** Reusable elevation presets so cards feel consistent everywhere. */
  shadow: {
    none: {},
    xs: {
      shadowColor: '#0B2015',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    sm: {
      shadowColor: '#0B2015',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#0B2015',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 4,
    },
    lg: {
      shadowColor: '#0B2015',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.13,
      shadowRadius: 22,
      elevation: 8,
    },
  },
};
