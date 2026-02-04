'use client';

/**
 * Animated loading screen for Spacetime Journey app.
 * Optimized for smooth animations during heavy main thread work (texture loading).
 * Uses only transform/opacity for compositor-friendly animations.
 */

import { useState, useEffect, useMemo } from 'react';
import { getAppContent } from '../i18n';
import { SpacetimeTitle } from './SpacetimeTitle';
import { useLocale } from '../hooks/useLocale';

/**
 * Animated orbital rings SVG component with 3D perspective.
 * Planets move along static orbits using GPU-accelerated transforms.
 * No drop-shadow filters to avoid main thread work.
 */
function SpacetimeLogo({ className = '' }: { className?: string }) {
  return (
    <div
      className={`${className}`}
      style={{
        perspective: '400px',
        perspectiveOrigin: '50% 50%',
        contain: 'layout style paint',
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
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="orbitGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="orbitGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="orbitGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
            {/* Glow effects as radial gradients instead of drop-shadow */}
            <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <circle cx="100" cy="100" r="80" fill="url(#centerGlow)" />

          {/* Static orbit paths */}
          <ellipse
            cx="100"
            cy="100"
            rx="75"
            ry="75"
            stroke="url(#orbitGradient1)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="52"
            ry="52"
            stroke="url(#orbitGradient2)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="30"
            ry="30"
            stroke="url(#orbitGradient3)"
            strokeWidth="1"
            strokeDasharray="2 4"
            fill="none"
          />

          {/* Keplerian orbital periods: T^2 proportional to r^3 */}
          {/* Inner (r=30): 1s | Middle (r=52): 2.3s | Outer (r=75): 4s */}

          {/* Planet 1 - blue - outermost orbit (glow + solid) */}
          <g
            className="animate-[orbitOuter_4s_linear_infinite]"
            style={{ transformOrigin: '100px 100px', willChange: 'transform' }}
          >
            <circle cx="175" cy="100" r="12" fill="url(#blueGlow)" />
            <circle cx="175" cy="100" r="6" fill="#3b82f6" />
          </g>

          {/* Planet 2 - orange - middle orbit (glow + solid) */}
          <g
            className="animate-[orbitMiddle_2.3s_linear_infinite]"
            style={{ transformOrigin: '100px 100px', willChange: 'transform' }}
          >
            <circle cx="152" cy="100" r="10" fill="url(#orangeGlow)" />
            <circle cx="152" cy="100" r="5" fill="#f59e0b" />
          </g>

          {/* Planet 3 - green - inner orbit (glow + solid) */}
          <g
            className="animate-[orbitInner_1s_linear_infinite]"
            style={{ transformOrigin: '100px 100px', willChange: 'transform' }}
          >
            <circle cx="130" cy="100" r="7" fill="url(#greenGlow)" />
            <circle cx="130" cy="100" r="3.5" fill="#10b981" />
          </g>

          {/* Center "Sun" with glow (no pulse - static is fine) */}
          <circle cx="100" cy="100" r="28" fill="url(#sunGlow)" />
          <circle cx="100" cy="100" r="14" fill="#fbbf24" />
          <circle cx="100" cy="100" r="9" fill="#fef3c7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Static stars background - no animation to avoid jank during loading.
 * Stars are rendered once and stay static.
 */
function StarsBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate fewer stars, static (no animation)
  const stars = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 30 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.2 + Math.random() * 0.4,
    }));
  }, [mounted]);

  if (!mounted) {
    return <div className="absolute inset-0 overflow-hidden" />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ contain: 'strict' }}>
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 bg-white rounded-full"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Simple loading indicator using CSS-only animation.
 * Three dots that pulse with staggered timing.
 */
function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      <span
        className="w-1.5 h-1.5 bg-blue-400/60 rounded-full"
        style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: '0ms',
          willChange: 'opacity',
        }}
      />
      <span
        className="w-1.5 h-1.5 bg-purple-400/60 rounded-full"
        style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: '200ms',
          willChange: 'opacity',
        }}
      />
      <span
        className="w-1.5 h-1.5 bg-amber-400/60 rounded-full"
        style={{
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: '400ms',
          willChange: 'opacity',
        }}
      />
    </span>
  );
}

interface LoadingScreenProps {
  /** Optional custom message */
  message?: string;
  /** Show minimal version (no stars, smaller logo) */
  minimal?: boolean;
  /** Optional locale override */
  locale?: string;
}

export function LoadingScreen({
  message,
  minimal = false,
  locale: localeProp,
}: LoadingScreenProps) {
  const detectedLocale = useLocale();
  const locale = localeProp || detectedLocale;
  const content = getAppContent(locale);

  return (
    <div
      className="w-full h-full bg-[#050508] flex items-center justify-center relative overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {/* Stars background - only on full version, static */}
      {!minimal && <StarsBackground />}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <SpacetimeLogo className={minimal ? 'w-24 h-24' : 'w-32 h-32 sm:w-40 sm:h-40'} />

        {/* App name */}
        <SpacetimeTitle size="lg" />

        {/* Loading indicator */}
        <div className="flex items-center text-white/30 text-xs sm:text-sm">
          <span>{message || content.common.loading.replace('...', '')}</span>
          <LoadingDots />
        </div>
      </div>

      {/* Subtle gradient overlay - static, no animation */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none" />
    </div>
  );
}

export default LoadingScreen;
