/**
 * Canonical SPACETIME JOURNEY title component.
 */

'use client';

interface SpacetimeTitleProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show background box */
  withBox?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Reusable SPACETIME JOURNEY title with consistent styling.
 *
 * Variants:
 * - sm: For in-scene overlay (mobile)
 * - md: For in-scene overlay (desktop)
 * - lg: For loading screen
 */
export function SpacetimeTitle({
  size = 'md',
  withBox = false,
  className = '',
}: SpacetimeTitleProps) {
  const sizeStyles = {
    sm: {
      container: 'px-4 py-1.5',
      title: 'text-sm tracking-[0.15em]',
      subtitle: 'text-[8px] tracking-[0.3em] mt-0.5',
    },
    md: {
      container: 'px-5 py-2',
      title: 'text-base tracking-[0.15em]',
      subtitle: 'text-[10px] tracking-[0.3em] mt-1',
    },
    lg: {
      container: 'px-6 py-3',
      title: 'text-xl sm:text-2xl tracking-[0.15em]',
      subtitle: 'text-sm sm:text-lg tracking-[0.35em] mt-2',
    },
  };

  const styles = sizeStyles[size];

  const content = (
    <>
      <h1 className={`font-semibold ${styles.title}`}>
        <span className="text-blue-400">SPACE</span>
        <span className="text-purple-400">TIME</span>
      </h1>
      <p
        className={`font-normal text-white ${styles.subtitle}`}
        style={{
          textShadow: '0 0 20px rgba(251,191,36,0.6), 0 0 40px rgba(251,191,36,0.3)',
        }}
      >
        JOURNEY
      </p>
    </>
  );

  if (withBox) {
    return (
      <div
        className={`text-center bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 ${styles.container} ${className}`}
      >
        {content}
      </div>
    );
  }

  return <div className={`text-center ${className}`}>{content}</div>;
}
