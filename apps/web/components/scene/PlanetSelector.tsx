'use client';

/**
 * Planet selector component for the solar system scene.
 */

import { useState, useEffect, useRef } from 'react';
import { getEarthSeason, getMoonPhase } from '@worldline-kinematics/core';
import { InfoModal } from '@worldline-kinematics/ui';
import {
  PLANET_INFO,
  ORBITAL_VELOCITIES,
  ROTATION_SPEEDS_KMH,
  BODY_ORDER,
  BODY_ICON_TEXTURES,
  type SelectedBody,
} from './constants';
import { getAppContent, type AppContent } from '../../i18n';

/**
 * Format a large number with suffix.
 */
function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(1);
}

/**
 * Educational modal explaining why Earth has opposite seasons in each hemisphere.
 * Uses the reusable InfoModal component.
 */
function SeasonInfoModal({
  isOpen,
  onClose,
  northSeason,
  southSeason,
  content,
}: {
  isOpen: boolean;
  onClose: () => void;
  northSeason: string;
  southSeason: string;
  content: AppContent;
}) {
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={content.seasons.modalTitle}
      subtitle={content.seasons.modalSubtitle}
      size="md"
      closeLabel={content.common.close}
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all text-sm"
        >
          {content.seasons.gotIt}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Current seasons display */}
        <div className="flex gap-3">
          <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
            <div className="text-[10px] text-blue-300/70 uppercase tracking-wider mb-1">
              {content.seasons.northern}
            </div>
            <div className="text-lg font-bold text-blue-400">{northSeason}</div>
          </div>
          <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <div className="text-[10px] text-orange-300/70 uppercase tracking-wider mb-1">
              {content.seasons.southern}
            </div>
            <div className="text-lg font-bold text-orange-400">{southSeason}</div>
          </div>
        </div>

        {/* Diagram */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/10">
          <svg viewBox="0 0 400 200" className="w-full h-auto">
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="earthN" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            {/* Sun */}
            <circle cx="50" cy="100" r="45" fill="url(#sunGlow)" />
            <circle cx="50" cy="100" r="25" fill="#fbbf24" />
            <text x="50" y="150" textAnchor="middle" fill="#fbbf24" fontSize="10">
              {content.planets.Sun}
            </text>

            {/* Sun rays to Earth */}
            <line
              x1="95"
              y1="100"
              x2="250"
              y2="60"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <line
              x1="95"
              y1="100"
              x2="250"
              y2="100"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <line
              x1="95"
              y1="100"
              x2="250"
              y2="140"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />

            {/* Earth - rotated 23.5 degrees */}
            <g transform="rotate(-23.5 280 100)">
              <ellipse
                cx="280"
                cy="100"
                rx="30"
                ry="30"
                fill="#1e3a5f"
                stroke="#3b82f6"
                strokeWidth="1"
              />
              <ellipse
                cx="280"
                cy="100"
                rx="30"
                ry="30"
                fill="url(#earthN)"
                opacity="0.3"
              />
              <line x1="280" y1="55" x2="280" y2="145" stroke="#ef4444" strokeWidth="2" />
              <circle cx="280" cy="55" r="3" fill="#ef4444" />
              <ellipse
                cx="280"
                cy="100"
                rx="30"
                ry="8"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.5"
              />
              <text x="280" y="75" textAnchor="middle" fill="#3b82f6" fontSize="8">
                N
              </text>
              <text x="280" y="130" textAnchor="middle" fill="#f97316" fontSize="8">
                S
              </text>
            </g>

            <text x="280" y="165" textAnchor="middle" fill="#94a3b8" fontSize="10">
              {content.planets.Earth}
            </text>
            <path
              d="M 280 70 A 30 30 0 0 1 295 73"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text x="305" y="65" fill="#ef4444" fontSize="8">
              23.5
            </text>
          </svg>
        </div>

        {/* Explanation */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-400 font-bold text-sm">1</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {content.seasons.explanation.title1}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                {content.seasons.explanation.description1}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-bold text-sm">2</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {content.seasons.explanation.title2}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                {content.seasons.explanation.description2}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 font-bold text-sm">3</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {content.seasons.explanation.title3}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                {content.seasons.explanation.description3}
              </p>
            </div>
          </div>
        </div>

        {/* Fun fact */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <div className="text-xs font-semibold text-purple-300 mb-1">
                {content.seasons.notAboutDistance}
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                {content.seasons.notAboutDistanceDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </InfoModal>
  );
}

interface PlanetSelectorProps {
  selected: SelectedBody;
  onChange: (p: SelectedBody) => void;
  viewDate?: Date;
  locale?: string;
}

export default function PlanetSelector({
  selected,
  onChange,
  viewDate,
  locale,
}: PlanetSelectorProps) {
  const content = getAppContent(locale ?? 'en');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showSeasonInfo, setShowSeasonInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const info = PLANET_INFO[selected];
  const orbitalSpeed = ORBITAL_VELOCITIES[selected];
  const rotationSpeedKmh = ROTATION_SPEEDS_KMH[selected] || 0;

  const yearInEarthDays = info.orbitalPeriodDays;
  const yearInEarthYears = info.orbitalPeriodDays / 365.25;

  // Get seasons for both hemispheres
  const northSeason =
    selected === 'Earth' && viewDate ? getEarthSeason(viewDate, 'northern') : null;
  const southSeason =
    selected === 'Earth' && viewDate ? getEarthSeason(viewDate, 'southern') : null;
  const moonPhase = selected === 'Moon' && viewDate ? getMoonPhase(viewDate) : null;

  const formatRotationSpeed = (kmh: number) => {
    if (kmh >= 1000) return `${(kmh / 1000).toFixed(1)}K km/h`;
    return `${kmh.toFixed(0)} km/h`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden min-w-[140px] sm:min-w-[200px]">
        <div className="flex items-center border-b border-white/10">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 sm:gap-2 flex-1 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-white/5 transition-colors"
          >
            <img
              src={BODY_ICON_TEXTURES[selected]}
              alt={selected}
              className="w-5 h-5 sm:w-7 sm:h-7 rounded-full object-cover"
            />
            <div className="flex-1 text-left min-w-0">
              <div className="text-white text-xs sm:text-sm font-medium truncate">
                {content.planets[selected as keyof typeof content.planets] || info.label}
              </div>
              <div className="text-[7px] sm:text-[9px] text-white/50">
                {content.planetTypes?.[info.type as keyof typeof content.planetTypes] ||
                  info.type}
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              className={`transition-transform flex-shrink-0 sm:w-3 sm:h-3 ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className="px-1.5 sm:px-3 py-1.5 sm:py-2 space-y-0.5 sm:space-y-1.5">
          {northSeason && southSeason && (
            <button
              onClick={() => setShowSeasonInfo(true)}
              className="w-full flex flex-col gap-1 bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 rounded px-1.5 py-1 -mx-1 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] sm:text-[9px] text-emerald-400/70 uppercase">
                  {content.planetInfo.season}
                </span>
                <svg
                  className="w-2.5 h-2.5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-medium w-full">
                <span
                  className="text-blue-400 flex items-center gap-1"
                  title={content.journeyDrawer.northernHemisphere}
                >
                  <span className="text-[7px] text-blue-400/60 uppercase">N</span>
                  {(content.seasons as unknown as Record<string, string>)[
                    northSeason.season
                  ] || northSeason.season}
                </span>
                <span
                  className="text-orange-400 flex items-center gap-1"
                  title={content.journeyDrawer.southernHemisphere}
                >
                  <span className="text-[7px] text-orange-400/60 uppercase">S</span>
                  {(content.seasons as unknown as Record<string, string>)[
                    southSeason.season
                  ] || southSeason.season}
                </span>
              </div>
            </button>
          )}

          {/* Mobile: More/Less toggle button */}
          <button
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="sm:hidden w-full text-[9px] text-white/50 py-1 hover:text-white/70 transition-colors flex items-center justify-center gap-1"
          >
            {mobileExpanded ? content.planetInfo.less : content.planetInfo.more}
            <svg
              className={`w-3 h-3 transition-transform ${mobileExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded content - always visible on desktop, toggleable on mobile */}
          <div
            className={`space-y-0.5 sm:space-y-1.5 ${mobileExpanded ? 'block' : 'hidden sm:block'}`}
          >
            {moonPhase && (
              <div className="flex justify-between items-center bg-gradient-to-r from-slate-400/10 to-transparent rounded px-1 py-0.5 -mx-1">
                <span className="text-[8px] sm:text-[9px] text-slate-300/70 uppercase">
                  {content.planetInfo.phase}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-200 font-medium">
                  {moonPhase.phase}
                </span>
              </div>
            )}

            {selected !== 'Sun' && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] sm:text-[9px] text-white/40 uppercase">
                  {content.planetInfo.orbit}
                </span>
                <span className="text-[10px] sm:text-xs text-orange-400 font-medium">
                  {orbitalSpeed.toFixed(2)} km/s
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-[8px] sm:text-[9px] text-white/40 uppercase">
                {content.planetInfo.spin}
              </span>
              <span className="text-[10px] sm:text-xs text-cyan-400 font-medium">
                {formatRotationSpeed(rotationSpeedKmh)}
                {info.rotationPeriodHours < 0 && ' (R)'}
              </span>
            </div>

            {selected !== 'Sun' && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] sm:text-[9px] text-white/40 uppercase">
                  {content.planetInfo.dist}
                </span>
                <span className="text-[10px] sm:text-xs text-green-400 font-medium">
                  {selected === 'Moon' ? '384K km' : `${info.distanceAU.toFixed(2)} AU`}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-[8px] sm:text-[9px] text-white/40 uppercase">
                {content.planetInfo.mass}
              </span>
              <span className="text-[10px] sm:text-xs text-purple-400 font-medium">
                {selected === 'Sun'
                  ? formatNumber(info.massEarth) + 'x'
                  : info.massEarth < 1
                    ? info.massEarth.toFixed(3) + 'x'
                    : info.massEarth.toFixed(1) + 'x'}{' '}
                {content.planets.Earth}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[8px] sm:text-[9px] text-white/40 uppercase">
                {content.planetInfo.size}
              </span>
              <span className="text-[10px] sm:text-xs text-white/70 font-medium">
                {formatNumber(info.diameterKm)} km
              </span>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-1 border-t border-white/5 text-[8px] sm:text-[9px] text-white/50">
              <span>
                {info.moons}{' '}
                {info.moons !== 1 ? content.planetInfo.moons : content.planetInfo.moon}
              </span>
              {selected !== 'Sun' && info.orbitalPeriodDays > 0 && (
                <span className="ml-auto">
                  {yearInEarthYears < 1
                    ? `${yearInEarthDays.toFixed(0)}${content.planetInfo.dayOrbit}`
                    : `${yearInEarthYears.toFixed(1)}${content.planetInfo.yearOrbit}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-black/95 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden min-w-[180px] sm:min-w-[200px] max-h-[280px] sm:max-h-[300px] overflow-y-auto z-[200]">
          {BODY_ORDER.map((planet) => {
            const pInfo = PLANET_INFO[planet];
            const pSpeed = ORBITAL_VELOCITIES[planet];
            return (
              <button
                key={planet}
                onClick={() => {
                  onChange(planet);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-white/10 transition-colors ${
                  planet === selected ? 'bg-blue-500/20 border-l-2 border-blue-400' : ''
                }`}
              >
                <img
                  src={BODY_ICON_TEXTURES[planet]}
                  alt={planet}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs sm:text-sm truncate">
                    {content.planets[planet as keyof typeof content.planets] || planet}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-white/40 truncate">
                    {planet === 'Sun'
                      ? content.planetInfo.center
                      : `${pSpeed.toFixed(1)} ${content.units.kms}`}
                    {planet !== 'Sun' &&
                      planet !== 'Moon' &&
                      ` | ${pInfo.distanceAU.toFixed(1)} AU`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Season explanation modal */}
      <SeasonInfoModal
        isOpen={showSeasonInfo}
        onClose={() => setShowSeasonInfo(false)}
        northSeason={
          northSeason?.season
            ? (content.seasons as unknown as Record<string, string>)[
                northSeason.season
              ] || northSeason.season
            : content.seasons.Spring
        }
        southSeason={
          southSeason?.season
            ? (content.seasons as unknown as Record<string, string>)[
                southSeason.season
              ] || southSeason.season
            : content.seasons.Autumn
        }
        content={content}
      />
    </div>
  );
}
