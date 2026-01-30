/**
 * Privacy notice footer.
 */

import { cn } from '../utils';
import { getUIContent } from '../i18n';

const content = getUIContent('en');

interface PrivacyFooterProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Footer with privacy notice about client-side computation.
 */
export function PrivacyFooter({ className }: PrivacyFooterProps) {
  return (
    <footer className={cn('text-center text-sm text-neutral-500 py-4 px-6', className)}>
      <p>{content.common.privacyNotice}</p>
    </footer>
  );
}
