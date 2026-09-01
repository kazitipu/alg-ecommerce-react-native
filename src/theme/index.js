/**
 * Design tokens ported from the web theme.
 *
 * The web app carries two spellings of the brand red: `$theme-deafult: #ff4c3b`
 * declared in the SCSS variables, and `#ff4a4e` used in ~66 inline styles. The
 * inline value is what users actually see on buttons, badges and links, so that
 * is `primary` here and the SCSS value is kept as `primaryAlt` for the few
 * places that referenced it directly.
 */

export const colors = {
  primary: '#ff4a4e',
  primaryAlt: '#ff4c3b',
  primaryDark: '#e03134',
  primarySoft: '#fff0f0',

  accent: '#f48110',
  accentDark: '#ed6b1d',

  success: '#0f8a3b',
  warning: '#f0ad4e',
  error: '#d9534f',
  info: '#01effc',
  star: '#fa4000',

  background: '#ffffff',
  backgroundAlt: '#f8f8f8',
  surface: '#ffffff',
  surfaceAlt: '#f7f7f7',

  text: '#222222',
  textSecondary: '#525252',
  textMuted: '#999999',
  textInverse: '#ffffff',

  border: '#dddddd',
  borderLight: '#ebebeb',
  divider: '#efefef',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

/** Maps `shipmentStatusScore` 1-7 onto the freight pipeline shown in tracking UI. */
export const shipmentStages = [
  { score: 1, label: 'Pending', dateField: 'PendingDate' },
  { score: 2, label: 'Approved', dateField: 'ApprovedDate' },
  { score: 3, label: 'Received in Warehouse', dateField: 'Received in WarehouseDate' },
  { score: 4, label: 'Ready for Fly', dateField: 'Ready for flyDate' },
  { score: 5, label: 'Bangladesh Customs', dateField: 'Bangladesh customsDate' },
  // the web app writes this key with inconsistent casing, so both are read
  { score: 6, label: 'ALG Warehouse', dateField: ['Alg WarehouseDate', 'Alg warehouseDate'] },
  { score: 7, label: 'Delivered', dateField: 'DeliveredDate' },
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: 'Lato',

  size: {
    xxs: 10,
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  weight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
};

export default { colors, spacing, typography, radius, shadow, shipmentStages };
