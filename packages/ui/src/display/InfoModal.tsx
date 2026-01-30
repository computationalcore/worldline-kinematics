/**
 * Reusable modal component with consistent styling across the app.
 * Features animated SpacetimeIcon header, scrollable content, and optional footer.
 */

'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { cn } from '../utils';
import { SpacetimeIcon } from '../icons';

export interface InfoModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the SpacetimeIcon in header (default: true) */
  showIcon?: boolean;
  /** Custom icon to use instead of SpacetimeIcon */
  customIcon?: ReactNode;
  /** Additional class names for the modal container */
  className?: string;
  /** Close button aria-label */
  closeLabel?: string;
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

/**
 * Modal component that renders via portal with blur backdrop.
 * Uses SpacetimeIcon by default for consistent branding.
 */
export function InfoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
  showIcon = true,
  customIcon,
  className,
  closeLabel = 'Close',
}: InfoModalProps) {
  const [mounted, setMounted] = useState(false);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !mounted) return null;

  // Generate unique ID for SpacetimeIcon based on title
  const iconId = `modal-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const iconElement =
    customIcon ?? (showIcon ? <SpacetimeIcon size="sm" id={iconId} /> : null);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'w-full',
          SIZE_CLASSES[size],
          'max-h-[90vh]',
          'bg-neutral-900/95 backdrop-blur-md',
          'rounded-2xl border border-white/20',
          'flex flex-col overflow-hidden',
          'shadow-2xl shadow-black/50',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - extends to full width, no gaps */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            {iconElement}
            <div>
              <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-white">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
            aria-label={closeLabel}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer - optional, sticky at bottom */}
        {footer && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-white/10 bg-neutral-900/95">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
