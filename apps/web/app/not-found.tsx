/**
 * 404 Not Found page with animated logo.
 */

import Link from 'next/link';

/**
 * Animated logo with 2s Keplerian timing (relaxed pace for info pages).
 */
function SpacetimeLogoSlow() {
  return (
    <div
      className="w-40 h-40 sm:w-48 sm:h-48"
      style={{
        perspective: '400px',
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
            <radialGradient id="notFoundGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="notFoundOrbit1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="notFoundOrbit2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="notFoundOrbit3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background glow */}
          <circle cx="100" cy="100" r="80" fill="url(#notFoundGlow)" />

          {/* Static orbit paths */}
          <ellipse
            cx="100"
            cy="100"
            rx="75"
            ry="75"
            stroke="url(#notFoundOrbit1)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="52"
            ry="52"
            stroke="url(#notFoundOrbit2)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            fill="none"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="30"
            ry="30"
            stroke="url(#notFoundOrbit3)"
            strokeWidth="1"
            strokeDasharray="2 4"
            fill="none"
          />

          {/* 2s Keplerian: Inner 2s, Middle 5s, Outer 8s */}
          <circle
            cx="175"
            cy="100"
            r="6"
            fill="#3b82f6"
            className="animate-[orbitOuterSlow_8s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />
          <circle
            cx="152"
            cy="100"
            r="5"
            fill="#f59e0b"
            className="animate-[orbitMiddleSlow_5s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />
          <circle
            cx="130"
            cy="100"
            r="3.5"
            fill="#10b981"
            className="animate-[orbitInnerSlow_2s_linear_infinite]"
            style={{ transformOrigin: '100px 100px' }}
          />

          {/* Center Sun */}
          <circle cx="100" cy="100" r="14" fill="#fbbf24" className="animate-pulse" />
          <circle cx="100" cy="100" r="9" fill="#fef3c7" />
        </svg>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] text-white p-4">
      {/* Animated logo */}
      <SpacetimeLogoSlow />

      {/* App title */}
      <div className="text-center mt-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.15em]">
          <span className="text-blue-400">SPACE</span>
          <span className="text-purple-400">TIME</span>
        </h1>
        <div className="relative mt-2">
          <span
            className="absolute inset-0 text-base sm:text-lg tracking-[0.35em] font-normal text-orange-400 blur-lg opacity-60"
            aria-hidden="true"
          >
            JOURNEY
          </span>
          <p className="relative text-base sm:text-lg tracking-[0.35em] font-normal text-white drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
            JOURNEY
          </p>
        </div>
      </div>

      {/* 404 message */}
      <div className="text-center mb-8">
        <p className="text-6xl sm:text-7xl font-bold text-white/60 mb-2">404</p>
        <p className="text-neutral-400">
          Lost in spacetime? This page doesn&apos;t exist.
        </p>
      </div>

      {/* CTA button */}
      <Link
        href="/"
        className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full transition-all text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Explore the Cosmos
        <svg
          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}
