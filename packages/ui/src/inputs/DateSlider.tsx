'use client';

/**
 * Date and time slider component for time travel through history.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDateTime } from '../utils';
import { getUIContent } from '../i18n';
import { DatePickerInput } from './DatePickerInput';

/**
 * View mode for the date slider.
 */
export type DateSliderViewMode = 'live' | 'birth' | 'custom';

interface DateSliderProps {
  /** Current date value */
  date: Date;
  /** Callback when date changes */
  onChange: (d: Date) => void;
  /** Optional birth date for "jump to birth" feature */
  birthDate?: Date | null;
  /** Current view mode */
  viewMode: DateSliderViewMode;
  /** Callback to jump to birth date */
  onJumpToBirth?: () => void;
  /** Callback to jump to current time */
  onJumpToNow?: () => void;
  /** Callback to edit birth data */
  onEditBirthData?: () => void;
  /** Birth place name to display (e.g., "Rio de Janeiro, Brazil") */
  birthPlaceName?: string | null;
  /** Locale for translations (default: 'en') */
  locale?: string;
  /** Additional CSS classes */
  className?: string;
}

const viewModeConfig = {
  live: {
    label: 'Now',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  birth: {
    label: 'Your Birth',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  custom: {
    label: 'Custom',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
};

/**
 * Format time for native time input (HH:MM).
 */
function formatTimeForInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Shorten a place name to "City, Country" format.
 */
function shortenPlaceName(name: string): string {
  const parts = name.split(', ');
  if (parts.length <= 2) return name;
  // Take first part (city) and last part (country)
  return `${parts[0]}, ${parts[parts.length - 1]}`;
}

/**
 * Date and time slider with expandable panel.
 */
export function DateSlider({
  date,
  onChange,
  birthDate,
  viewMode,
  onJumpToBirth,
  onJumpToNow,
  onEditBirthData,
  birthPlaceName,
  locale = 'en',
  className = '',
}: DateSliderProps) {
  const content = getUIContent(locale);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for time input to prevent reset while typing
  const [timeInputValue, setTimeInputValue] = useState(formatTimeForInput(date));

  // View mode labels from i18n
  const viewModeLabels = {
    live: content.dateSlider.now,
    birth: content.dateSlider.yourBirth,
    custom: content.dateSlider.custom,
  };

  // Sync local state when date prop changes externally
  useEffect(() => {
    setTimeInputValue(formatTimeForInput(date));
  }, [date]);

  // Close on click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Date range: 1900 to 2100
  const minDate = new Date('1900-01-01T00:00:00');
  const maxDate = new Date('2100-12-31T23:59:59');
  const minTime = minDate.getTime();
  const maxTime = maxDate.getTime();

  const sliderValue = date.getTime();

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = parseInt(e.target.value, 10);
      onChange(new Date(newTime));
    },
    [onChange]
  );

  // Handle date change from DatePickerInput
  const handleDateChange = useCallback(
    (newDate: Date | null) => {
      if (newDate) {
        // Preserve the current time
        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
        onChange(newDate);
      }
    },
    [date, onChange]
  );

  const handleTimeInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTimeInputValue(val);

      const parts = val.split(':').map(Number);
      const hours = parts[0];
      const minutes = parts[1];
      if (
        hours !== undefined &&
        minutes !== undefined &&
        !isNaN(hours) &&
        !isNaN(minutes)
      ) {
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        if (!isNaN(newDate.getTime())) {
          onChange(newDate);
        }
      }
    },
    [date, onChange]
  );

  const modeConfig = viewModeConfig[viewMode];
  const modeLabel = viewModeLabels[viewMode];
  const shortPlaceName = birthPlaceName ? shortenPlaceName(birthPlaceName) : null;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center gap-1 sm:gap-2 ${className}`}
    >
      {/* View mode indicator + date display */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/70 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/20 hover:bg-black/80 transition-colors flex items-center gap-1.5 sm:gap-2"
      >
        <span
          className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${modeConfig.bgColor} ${modeConfig.color} font-medium`}
        >
          {modeLabel}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/60 sm:w-[14px] sm:h-[14px]"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-white text-xs sm:text-sm font-medium">
          {formatDateTime(date)}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Birth place indicator - shown when in birth mode and place is set */}
      {viewMode === 'birth' && shortPlaceName && !isExpanded && (
        <div className="flex items-center gap-1.5 text-[9px] text-purple-300/70 bg-purple-500/10 px-2.5 py-1 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {shortPlaceName}
        </div>
      )}

      {/* Expanded slider panel */}
      {isExpanded && (
        <div className="bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 flex flex-col gap-3 min-w-[340px]">
          {/* Year slider */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-white/40 uppercase tracking-wider">
              {content.dateSlider.year}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/50 w-8">1900</span>
              <input
                type="range"
                min={minTime}
                max={maxTime}
                value={sliderValue}
                onChange={handleSliderChange}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] text-white/50 w-8">2100</span>
            </div>
          </div>

          {/* Quick jump buttons */}
          {(birthDate || onJumpToNow) && (
            <div className="flex items-center gap-2">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                {content.dateSlider.jumpTo}
              </div>
              <div className="flex gap-2">
                {birthDate && onJumpToBirth && (
                  <button
                    onClick={onJumpToBirth}
                    className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      viewMode === 'birth'
                        ? 'bg-purple-500/40 border border-purple-400/60 text-purple-200'
                        : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-300'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    {content.dateSlider.yourBirth}
                  </button>
                )}
                {onJumpToNow && (
                  <button
                    onClick={onJumpToNow}
                    className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      viewMode === 'live'
                        ? 'bg-emerald-500/40 border border-emerald-400/60 text-emerald-200'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {content.dateSlider.now}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Date and time inputs */}
          <div className="flex items-start gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                {content.dateSlider.date}
              </div>
              <DatePickerInput
                value={date}
                onChange={handleDateChange}
                minDate={minDate}
                maxDate={maxDate}
                locale={locale}
                compact
              />
            </div>
            <div className="w-24 flex flex-col gap-1">
              <div className="text-[9px] text-white/40 uppercase tracking-wider">
                {content.dateSlider.time}
              </div>
              <input
                type="time"
                value={timeInputValue}
                onChange={handleTimeInputChange}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm outline-none focus:border-blue-400 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Birth place display when in birth mode */}
          {viewMode === 'birth' && shortPlaceName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-purple-400 flex-shrink-0"
              >
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-purple-300">{shortPlaceName}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
            <div className="text-[9px] text-blue-300/70 text-center">
              {content.dateSlider.viewingMoment}
            </div>
            <div className="text-[9px] text-white/30 text-center">
              {content.dateSlider.localTimeUtc} {date.toISOString().slice(0, 19)}Z
            </div>

            {onEditBirthData && (
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onEditBirthData();
                }}
                className="mt-1 text-[9px] text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {birthDate
                  ? content.dateSlider.changeBirthDateTimeLocation
                  : content.dateSlider.addYourBirthDate}
              </button>
            )}

            <div className="flex items-center justify-center gap-1 text-[8px] text-white/25 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {content.dateSlider.dataSavedLocally}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
