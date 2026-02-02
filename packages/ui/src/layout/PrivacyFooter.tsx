/**
 * Privacy notice footer.
 */

import { cn } from '../utils';
import { getUIContent } from '../i18n';

interface PrivacyFooterProps {
  /** Additional CSS classes */
  className?: string;
  /** Locale for i18n content */
  locale?: string;
}

/**
 * Footer with privacy notice about client-side computation.
 */
export function PrivacyFooter({ className, locale }: PrivacyFooterProps) {
  const content = getUIContent(locale ?? 'en');

  return (
    <footer className={cn('text-center text-sm text-neutral-500 py-4 px-6', className)}>
      <p>{content.common.privacyNotice}</p>
    </footer>
  );
}
