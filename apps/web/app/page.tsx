/**
 * Main application page with scene and overlays.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  computeWorldlineState,
  breakdownDuration,
  type ReferenceFrame,
} from '@worldline-kinematics/core';
import { JourneyModal } from '@worldline-kinematics/ui';
import Scene from '../components/Scene';
import {
  SceneShell,
  OverlayTopCenter,
  OverlayBottomLeft,
  OverlayBottomRight,
  FullscreenButton,
} from '../components/SceneShell';
import { useGeolocation, useCinematicMode } from '@worldline-kinematics/ui';

export default function Home() {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  // Default to ~45° latitude (mid-latitudes where most people live)
  // The effect on calculations is minimal, so we simplify the UX
  const [latitude, setLatitude] = useState(45);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Date picker state for onboarding
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Time picker state (optional, defaults to midnight if not specified)
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  const geo = useGeolocation();

  // Journey modal state
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [speedUnit, setSpeedUnit] = useState<'km/s' | 'km/h' | 'mph'>('km/s');

  // Cinematic mode (keyboard shortcuts)
  const { isUIHidden } = useCinematicMode({
    onToggleDrawer: () => setShowJourneyModal((prev) => !prev),
  });

  // Auto-detect location silently for better accuracy (optional)
  useEffect(() => {
    if (geo.latitude !== null) {
      setLatitude(geo.latitude);
    }
  }, [geo.latitude]);

  // Physics frame for calculations (solar system = orbit frame)
  const mode: ReferenceFrame = 'orbit';

  const worldline = useMemo(() => {
    if (!birthDate) return null;
    return computeWorldlineState(birthDate, latitude);
  }, [birthDate, latitude]);

  // Compute age using the core library
  const age = useMemo(() => {
    if (!worldline) return null;
    return breakdownDuration(worldline.durationSeconds);
  }, [worldline]);

  const handleOnboardingComplete = () => {
    if (selectedYear && selectedMonth !== null && selectedDay) {
      // Create date with optional time (defaults to midnight)
      const date = new Date(
        selectedYear,
        selectedMonth,
        selectedDay,
        selectedHour,
        selectedMinute,
        0
      );
      setBirthDate(date);
      // Show the journey modal after completing onboarding
      setShowJourneyModal(true);
    }
    setShowOnboarding(false);
  };

  const handleSkip = () => {
    setShowOnboarding(false);
  };

  const handleChangeBirthDate = () => {
    setShowJourneyModal(false);
    setShowOnboarding(true);
  };

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  // Generate month options
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Generate day options based on selected month/year
  const daysInMonth =
    selectedYear && selectedMonth !== null
      ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
      : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDateComplete = selectedYear && selectedMonth !== null && selectedDay;

  return (
    <main className="h-screen w-screen overflow-hidden">
      {/* Full-screen scene with overlay UI */}
      <SceneShell
        className="h-full w-full"
        overlay={
          <>
            {/* Title - top center (hidden in cinematic mode) */}
            {!isUIHidden && (
              <OverlayTopCenter>
                <div className="text-center px-4">
                  <h1 className="text-base sm:text-xl font-bold mb-0.5">
                    Worldline Kinematics
                  </h1>
                  <p className="text-[10px] sm:text-xs text-neutral-400 hidden sm:block">
                    Cosmic Observer Motion Across Reference Frames
                  </p>
                </div>
              </OverlayTopCenter>
            )}

            {/* Fullscreen button - bottom left (hidden in cinematic mode) */}
            {!isUIHidden && (
              <OverlayBottomLeft className="flex items-end gap-2">
                <FullscreenButton />
              </OverlayBottomLeft>
            )}

            {/* Journey button - bottom right (always visible except during onboarding modal or cinematic mode) */}
            {!showOnboarding && !isUIHidden && (
              <OverlayBottomRight>
                <button
                  onClick={() => {
                    if (birthDate) {
                      setShowJourneyModal(true);
                    } else {
                      setShowOnboarding(true);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border
                             border-white/30 text-white hover:from-blue-500/90 hover:to-purple-500/90 hover:border-white/40
                             transition-all flex items-center gap-2 text-xs sm:text-sm shadow-lg shadow-blue-500/20"
                  title="View your cosmic journey (J)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Your Cosmic Journey</span>
                  <span className="sm:hidden">Journey</span>
                </button>
              </OverlayBottomRight>
            )}
          </>
        }
      >
        <Scene mode={mode} latitude={latitude} longitude={0} />
      </SceneShell>

      {/* Journey Modal - 70% viewport, darkened background */}
      <JourneyModal
        isOpen={showJourneyModal}
        onClose={() => setShowJourneyModal(false)}
        worldline={worldline}
        age={age}
        speedUnit={speedUnit}
        onSpeedUnitChange={setSpeedUnit}
        onChangeBirthDate={handleChangeBirthDate}
      />

      {/* Beautiful Onboarding - Immersive date picker */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
          {/* Single modal container with solid background */}
          <div className="w-[80%] max-w-[800px] bg-neutral-900 border border-neutral-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Cosmic intro text */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-block mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Your Cosmic Journey Begins
              </h1>
              <p className="text-sm sm:text-base text-neutral-400">
                Since birth, Earth, the Solar System, and the Galaxy have carried you
                through the cosmos.
                <span className="hidden sm:inline">
                  <br />
                </span>
                <span className="sm:hidden"> </span>
                <span className="text-neutral-500">
                  Let's see how far you've traveled.
                </span>
              </p>
            </div>

            {/* Date selection section */}
            <div className="border-t border-neutral-800 pt-6">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                  When did your journey begin?
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Select your birth date
                </p>
              </div>

              {/* Custom date picker - responsive grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {/* Year selector */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-neutral-400 mb-1.5 sm:mb-2 text-center">
                    Year
                  </label>
                  <div className="relative">
                    <select
                      value={selectedYear || ''}
                      onChange={(e) => setSelectedYear(Number(e.target.value) || null)}
                      className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-lg
                               px-2 sm:px-3 py-2.5 sm:py-3 text-white text-center text-base sm:text-lg font-semibold
                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                               cursor-pointer hover:bg-neutral-750"
                    >
                      <option value="">--</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Month selector */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-neutral-400 mb-1.5 sm:mb-2 text-center">
                    Month
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonth ?? ''}
                      onChange={(e) =>
                        setSelectedMonth(
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-lg
                               px-2 sm:px-3 py-2.5 sm:py-3 text-white text-center text-base sm:text-lg font-semibold
                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                               cursor-pointer hover:bg-neutral-750"
                    >
                      <option value="">--</option>
                      {months.map((month, i) => (
                        <option key={month} value={i}>
                          {month.slice(0, 3)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Day selector */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-neutral-400 mb-1.5 sm:mb-2 text-center">
                    Day
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDay || ''}
                      onChange={(e) => setSelectedDay(Number(e.target.value) || null)}
                      className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-lg
                               px-2 sm:px-3 py-2.5 sm:py-3 text-white text-center text-base sm:text-lg font-semibold
                               focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                               cursor-pointer hover:bg-neutral-750"
                    >
                      <option value="">--</option>
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional time picker */}
              {isDateComplete && (
                <div className="mb-4 sm:mb-6">
                  {!showTimeInput ? (
                    <button
                      onClick={() => setShowTimeInput(true)}
                      className="w-full text-center text-xs sm:text-sm text-neutral-500 hover:text-blue-400 transition-colors py-2"
                    >
                      + Add birth time for more precision
                    </button>
                  ) : (
                    <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] sm:text-xs text-neutral-400">
                          Birth Time (optional)
                        </span>
                        <button
                          onClick={() => {
                            setShowTimeInput(false);
                            setSelectedHour(0);
                            setSelectedMinute(0);
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-300"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Hour selector */}
                        <div>
                          <label className="block text-[10px] text-neutral-500 mb-1 text-center">
                            Hour
                          </label>
                          <div className="relative">
                            <select
                              value={selectedHour}
                              onChange={(e) => setSelectedHour(Number(e.target.value))}
                              className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-lg
                                       px-2 py-2 text-white text-center text-sm font-medium
                                       focus:outline-none focus:border-blue-500
                                       cursor-pointer hover:bg-neutral-850"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                  {String(i).padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {/* Minute selector */}
                        <div>
                          <label className="block text-[10px] text-neutral-500 mb-1 text-center">
                            Minute
                          </label>
                          <div className="relative">
                            <select
                              value={selectedMinute}
                              onChange={(e) => setSelectedMinute(Number(e.target.value))}
                              className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-lg
                                       px-2 py-2 text-white text-center text-sm font-medium
                                       focus:outline-none focus:border-blue-500
                                       cursor-pointer hover:bg-neutral-850"
                            >
                              {Array.from({ length: 60 }, (_, i) => (
                                <option key={i} value={i}>
                                  {String(i).padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview of selected date */}
              {isDateComplete && (
                <div className="text-center mb-4 sm:mb-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-lg border border-white/5">
                  <div className="text-xs sm:text-sm text-neutral-400">
                    Your journey began on
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-white">
                    {months[selectedMonth!]} {selectedDay}, {selectedYear}
                    {showTimeInput && (
                      <span className="text-base sm:text-lg text-neutral-400 ml-2">
                        at {String(selectedHour).padStart(2, '0')}:
                        {String(selectedMinute).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-600
                           bg-neutral-800/50 hover:bg-neutral-700/50
                           text-neutral-300 hover:text-white hover:border-neutral-500
                           transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span className="hidden sm:inline">
                    Skip, let me explore the planets
                  </span>
                  <span className="sm:hidden">Explore first</span>
                </button>
                <button
                  onClick={handleOnboardingComplete}
                  disabled={!isDateComplete}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600
                           hover:from-blue-500 hover:to-purple-500
                           text-white font-medium transition-all text-xs sm:text-sm
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600
                           shadow-lg shadow-blue-500/25"
                >
                  Begin Journey
                </button>
              </div>
            </div>

            {/* Privacy note - matches results modal style */}
            <p className="text-xs text-neutral-400 text-center mt-4 flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>
                All calculations run locally. Your data never leaves your browser.
              </span>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
