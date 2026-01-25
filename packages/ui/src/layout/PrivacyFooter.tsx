/**
 * Privacy notice footer.
 */

import { cn } from '../utils';

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
      <p>All calculations run in your browser. Your birth date is never transmitted.</p>
    </footer>
  );
}
