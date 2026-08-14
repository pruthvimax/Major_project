/**
 * Farm Marketplace — colour system
 *
 * Agriculture-inspired palette: fresh natural greens, white surfaces,
 * soft neutral backgrounds and dark-grey type. Every key that existed
 * before is preserved so no screen breaks; new keys are additive.
 */

export const lightColors = {
  // Brand
  primary: '#2F8F3E',
  primaryLight: '#5FC544',
  primaryDark: '#1F6B2B',
  primarySoft: '#E9F6EA',
  primaryTint: '#F2FAF3',

  // Supporting brand tones
  secondary: '#1B7F5C',
  secondarySoft: '#E6F4EF',
  accent: '#E9A23B',
  admin: '#3F5A66',

  // Surfaces
  background: '#F3F5F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9F8',
  card: '#FFFFFF',
  input: '#F6F8F7',
  overlay: 'rgba(17, 24, 20, 0.45)',

  // Neutrals
  white: '#FFFFFF',
  black: '#1B1D1C',
  text: '#1B1D1C',
  textSecondary: '#6E7A74',
  gray: '#6E7A74',
  muted: '#98A29D',
  lightGray: '#E4EAE6',
  lighterGray: '#F4F7F5',
  border: '#E5EBE7',
  borderStrong: '#D3DCD7',
  shadow: '#0B2015',
  transparent: 'transparent',

  // Semantic
  error: '#D14343',
  errorSoft: '#FDECEC',
  success: '#2F8F3E',
  successSoft: '#E9F6EA',
  warning: '#E08A16',
  warningSoft: '#FDF3E2',
  info: '#2A7DBF',
  infoSoft: '#E8F2FA',
  star: '#F5B942',

  // Soft category / illustration tints (mirrors the reference design)
  tintGreen: '#EAF6E9',
  tintRed: '#FDECEC',
  tintAmber: '#FDF4E3',
  tintPurple: '#F3ECFB',
  tintBlue: '#E8F3FB',
  tintPink: '#FCEDF3',
  tintSky: '#E9F5FC',
};

export const darkColors: typeof lightColors = {
  // Brand
  primary: '#5FC544',
  primaryLight: '#7DD46A',
  primaryDark: '#2F8F3E',
  primarySoft: '#16301A',
  primaryTint: '#12240F',

  // Supporting brand tones
  secondary: '#4BC49A',
  secondarySoft: '#122C24',
  accent: '#E9A23B',
  admin: '#8FB3C4',

  // Surfaces
  background: '#101412',
  surface: '#181D1A',
  surfaceAlt: '#1E2421',
  card: '#181D1A',
  input: '#1E2421',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Neutrals
  white: '#FFFFFF',
  black: '#F2F5F3',
  text: '#F2F5F3',
  textSecondary: '#A3AEA8',
  gray: '#A3AEA8',
  muted: '#7C8781',
  lightGray: '#2A322D',
  lighterGray: '#1E2421',
  border: '#2A322D',
  borderStrong: '#3A443E',
  shadow: '#000000',
  transparent: 'transparent',

  // Semantic
  error: '#F07373',
  errorSoft: '#331A1A',
  success: '#5FC544',
  successSoft: '#16301A',
  warning: '#F0AE4A',
  warningSoft: '#33260F',
  info: '#5FAEE6',
  infoSoft: '#122534',
  star: '#F5B942',

  // Soft category / illustration tints
  tintGreen: '#18301A',
  tintRed: '#301A1A',
  tintAmber: '#302716',
  tintPurple: '#241D33',
  tintBlue: '#152735',
  tintPink: '#2E1B26',
  tintSky: '#152B36',
};

/** CTA gradient used by the primary button and hero surfaces. */
export const gradients = {
  primary: ['#5FC544', '#2F8F3E'] as const,
  primarySoft: ['#EDF9EC', '#DFF3DD'] as const,
  hero: ['#E9F6EA', '#F3F5F4'] as const,
  dark: ['#1F6B2B', '#14471D'] as const,
};

export type ColorScheme = typeof lightColors;
