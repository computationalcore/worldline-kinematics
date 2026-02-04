/**
 * Locale-specific layout with proper lang attribute and metadata.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, isValidLocale } from '../../i18n/config';
import { getAppContent } from '../../i18n';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Generate static params for all supported locales.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Generate metadata based on locale.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getAppContent(locale);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://spacetimejourney.app';
  const canonicalUrl = `${baseUrl}/${locale}`;

  return {
    title: content.meta.title,
    description: content.meta.description,
    keywords: content.meta.keywords,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(locales.map((loc) => [loc, `${baseUrl}/${loc}`])),
    },
    openGraph: {
      type: 'website',
      siteName: content.meta.title,
      title: content.meta.title,
      description: content.meta.description,
      url: canonicalUrl,
      locale: locale,
      alternateLocale: locales.filter((l) => l !== locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: content.meta.title,
      description: content.meta.description,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  return children;
}
