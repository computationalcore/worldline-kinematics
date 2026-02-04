/**
 * Middleware for locale detection and routing.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  defaultLocale,
  isValidLocale,
  LOCALE_COOKIE_KEY,
  type Locale,
} from './i18n/config';

/**
 * Detect the preferred locale from the Accept-Language header.
 */
function getPreferredLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header (e.g., "pt-BR,pt;q=0.9,en;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(), // "pt-BR" -> "pt"
        q: qValue ? parseFloat(qValue) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Find first matching locale
  for (const { code } of languages) {
    if (isValidLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameLocale = pathname.split('/')[1];
  if (isValidLocale(pathnameLocale)) {
    // Valid locale in path, proceed
    return NextResponse.next();
  }

  // No locale in path - redirect to preferred locale
  const preferredLocale = getPreferredLocale(request);

  // Check for stored preference in cookie
  const storedLocale = request.cookies.get(LOCALE_COOKIE_KEY)?.value;
  const locale =
    storedLocale && isValidLocale(storedLocale) ? storedLocale : preferredLocale;

  // Redirect to localized path
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  newUrl.search = request.nextUrl.search;

  return NextResponse.redirect(newUrl);
}

export const config = {
  // Match all paths except static files
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
