/**
 * Animated Spacetime Journey logo icon with orbital animation.
 */

'use client';

interface SpacetimeIconProps {
  /** Size of the icon */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Unique ID prefix for gradients (to avoid conflicts when multiple icons) */
  id?: string;
}

const sizes = {
  xs: 'w-5 h-5',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

export function SpacetimeIcon({ size = 'md', id = 'spacetime' }: SpacetimeIconProps) {
  return (
    <div
      className={sizes[size]}
      style={{
        perspective: '200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      <div
        className="w-full h-full"
        style={{
          transform: 'rotateX(60deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id={`${id}Glow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}Orbit1`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id={`${id}Orbit2`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id={`${id}Orbit3`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background glow */}
          <circle cx="100" cy="100" r="80" fill={`url(#${id}Glow)`} />

          {/* Static orbit paths */}
          <ellipse
            cx="100"
            cy="100"
            rx="75"
            ry="75"
            stroke={`url(#${id}Orbit1)`}
            strokeWidth="2"
            strokeDasharray="4 2"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="52"
            ry="52"
            stroke={`url(#${id}Orbit2)`}
            strokeWidth="2"
            strokeDasharray="3 3"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="30"
            ry="30"
            stroke={`url(#${id}Orbit3)`}
            strokeWidth="1.5"
            strokeDasharray="2 4"
            fill="none"
          />

          {/* 2s Keplerian timing for relaxed pace */}
          <circle
            cx="175"
            cy="100"
            r="8"
            fill="#3b82f6"
            className="animate-[orbitOuterSlow_8s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />
          <circle
            cx="152"
            cy="100"
            r="6"
            fill="#f59e0b"
            className="animate-[orbitMiddleSlow_5s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />
          <circle
            cx="130"
            cy="100"
            r="5"
            fill="#10b981"
            className="animate-[orbitInnerSlow_2s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />

          {/* Center Sun */}
          <circle cx="100" cy="100" r="16" fill="#fbbf24" className="animate-pulse" />
          <circle cx="100" cy="100" r="10" fill="#fef3c7" />
        </svg>
      </div>
    </div>
  );
}
