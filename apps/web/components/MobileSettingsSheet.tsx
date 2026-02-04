/**
 * Mobile settings bottom sheet.
 * Contains all scene controls in a compact, touch-friendly format.
 */

'use client';

import { useState } from 'react';
import type { PresetName } from '../utils/planetaryPositions';
import type { SelectedBody } from './scene/constants';
import {
  BODY_ORDER,
  BODY_ICON_TEXTURES,
  PRESET_INFO,
  VISIBLE_PRESETS,
} from './scene/constants';
import { getAppContent } from '../i18n';
import { locales, localeNames, type Locale } from '../i18n/config';

interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Planet focus
  focusedPlanet: SelectedBody;
  onPlanetSelect: (planet: SelectedBody) => void;
  // Visual mode
  preset: PresetName;
  onPresetChange: (preset: PresetName) => void;
  // Display options
  showOrbits: boolean;
  onShowOrbitsChange: (value: boolean) => void;
  showTrails: boolean;
  onShowTrailsChange: (value: boolean) => void;
  // Language
  locale: string;
  onLocaleChange: (locale: Locale) => void;
  // Date props for display (read-only summary, edit triggers onboarding)
  birthDate?: Date | null;
  birthPlaceName?: string | null;
  onEditBirthData?: () => void;
  // Fullscreen controls (optional, passed from parent)
  fullscreenControls?: {
    isFullscreen: boolean;
    toggleFullscreen: () => Promise<void>;
    isSupported: boolean;
  } | null;
}

export function MobileSettingsSheet({
  isOpen,
  onClose,
  focusedPlanet,
  onPlanetSelect,
  preset,
  onPresetChange,
  showOrbits,
  onShowOrbitsChange,
  showTrails,
  onShowTrailsChange,
  locale,
  onLocaleChange,
  birthDate,
  birthPlaceName,
  onEditBirthData,
  fullscreenControls,
}: MobileSettingsSheetProps) {
  const content = getAppContent(locale);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  if (!isOpen) return null;

  const currentLocaleName = localeNames[locale as Locale] || 'Language';

  // Format birth date for display
  const formatBirthDate = (date: Date) => {
    const months = content.onboarding.months;
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[200]" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gray-900/95 backdrop-blur-lg rounded-t-2xl border-t border-white/10 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {content.mobileSettings?.title || 'Settings'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Birth Date Section */}
          {(birthDate || onEditBirthData) && (
            <section>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                {content.mobileSettings?.birthDate || content.onboarding.birthDate}
              </div>
              <button
                onClick={() => {
                  onClose();
                  onEditBirthData?.();
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    {birthDate ? (
                      <>
                        <div className="text-sm text-white font-medium">
                          {formatBirthDate(birthDate)}
                        </div>
                        {birthPlaceName && (
                          <div className="text-xs text-white/50">{birthPlaceName}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-white/60">
                        {content.dateSlider.addBirthDate}
                      </div>
                    )}
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </section>
          )}

          {/* Focus On (Planet Selector) */}
          <section>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              {content.mobileSettings?.focusOn || 'Focus On'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {BODY_ORDER.map((planet) => {
                const isSelected = planet === focusedPlanet;
                const planetName =
                  content.planets[planet as keyof typeof content.planets] || planet;
                return (
                  <button
                    key={planet}
                    onClick={() => onPlanetSelect(planet)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <img
                      src={BODY_ICON_TEXTURES[planet]}
                      alt={planetName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span
                      className={`text-[9px] truncate w-full text-center ${isSelected ? 'text-blue-400' : 'text-white/60'}`}
                    >
                      {planetName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Visual Mode */}
          <section>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              {content.mobileSettings?.visualMode || content.sceneOptions.visualMode}
            </div>
            <div className="flex gap-2">
              {VISIBLE_PRESETS.map((presetName) => {
                const info = PRESET_INFO[presetName];
                if (!info) return null;
                const presetTranslation =
                  content.scene.presets?.[
                    presetName as keyof typeof content.scene.presets
                  ];
                const label = presetTranslation?.label ?? info.label;
                const isSelected = preset === presetName;
                return (
                  <button
                    key={presetName}
                    onClick={() => onPresetChange(presetName)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      isSelected
                        ? 'border-current bg-current/10'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                    style={
                      isSelected
                        ? { color: info.color, borderColor: info.color }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Display Options */}
          <section>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              {content.mobileSettings?.display || content.scene.display}
            </div>
            <div className="space-y-2">
              {/* Orbit Paths toggle */}
              <button
                onClick={() => onShowOrbitsChange(!showOrbits)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span
                  className={`text-sm ${showOrbits ? 'text-indigo-300' : 'text-white/60'}`}
                >
                  {content.scene.orbitPaths}
                </span>
                <div
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                    showOrbits ? 'bg-indigo-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      showOrbits ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              {/* Orbital Trails toggle - only show if orbits are enabled */}
              {showOrbits && (
                <button
                  onClick={() => onShowTrailsChange(!showTrails)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors ml-4"
                  style={{ width: 'calc(100% - 1rem)' }}
                >
                  <span
                    className={`text-sm ${showTrails ? 'text-blue-300' : 'text-white/60'}`}
                  >
                    {content.scene.orbitalTrails}
                  </span>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                      showTrails ? 'bg-blue-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        showTrails ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              )}
            </div>
          </section>

          {/* Language */}
          <section>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              {content.mobileSettings?.language || 'Language'}
            </div>
            <button
              onClick={() => setShowLanguagePicker(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-white/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="text-sm text-white">{currentLocaleName}</span>
              </div>
              <svg
                className="w-4 h-4 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </section>

          {/* Fullscreen */}
          {fullscreenControls?.isSupported && (
            <section>
              <button
                onClick={() => {
                  fullscreenControls?.toggleFullscreen();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {fullscreenControls.isFullscreen ? (
                    <svg
                      className="w-5 h-5 text-white/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  )}
                  <span className="text-sm text-white">
                    {fullscreenControls.isFullscreen
                      ? content.mobileSettings?.exitFullscreen || 'Exit Fullscreen'
                      : content.mobileSettings?.fullscreen || 'Fullscreen'}
                  </span>
                </div>
              </button>
            </section>
          )}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowLanguagePicker(false)}
          />
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden border border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">Select Language</h3>
              <button
                onClick={() => setShowLanguagePicker(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              <div className="grid grid-cols-2 gap-2">
                {locales.map((loc) => {
                  const isCurrent = loc === locale;
                  return (
                    <button
                      key={loc}
                      onClick={() => {
                        onLocaleChange(loc);
                        setShowLanguagePicker(false);
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isCurrent
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                      }`}
                    >
                      <span className="text-sm font-medium">{localeNames[loc]}</span>
                      {isCurrent && (
                        <svg
                          className="w-4 h-4 text-white flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
