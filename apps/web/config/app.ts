/**
 * Application configuration from environment variables.
 * All NEXT_PUBLIC_ prefixed variables are accessible in the browser.
 */

// App Identity
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Spacetime Journey';
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.spacetimejourney.com';

// Storage key prefix (for localStorage)
export const STORAGE_PREFIX =
  process.env.NEXT_PUBLIC_STORAGE_PREFIX || 'spacetime-journey';

// Storage keys derived from prefix
export const STORAGE_KEYS = {
  BIRTH_DATE: `${STORAGE_PREFIX}-birth-date`,
  BIRTH_LAT: `${STORAGE_PREFIX}-birth-lat`,
  BIRTH_LON: `${STORAGE_PREFIX}-birth-lon`,
  BIRTH_PLACE: `${STORAGE_PREFIX}-birth-place`,
} as const;

// GitHub repository URL
export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ||
  'https://github.com/computationalcore/worldline-kinematics';

// Social/SEO metadata
export const APP_KEYWORDS = [
  'spacetime',
  'journey',
  'cosmic',
  'space',
  'velocity',
  'physics',
  'solar system',
  'planets',
];

// Theme
export const THEME_COLOR = '#0a0a0c';

// Debug/Development mode
// In development, disables texture caching to allow testing loading behavior
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
