'use client';

/**
 * Date picker with separate Month, Day, Year fields.
 * Locale-aware with translated month names and labels.
 */

import { useState, useEffect } from 'react';
import { getUIContent } from '../i18n';

interface DatePickerInputProps {
  /** Current date value */
  value: Date | null;
  /** Callback when date changes */
  onChange: (date: Date | null) => void;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Minimum selectable date */
  minDate?: Date;
  /** Locale for translations (default: 'en') */
  locale?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

const MONTH_NAMES_EN = [
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

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getMonthNames(locale: string): string[] {
  const normalizedLocale = locale.split('-')[0];
  if (normalizedLocale === 'pt') return MONTH_NAMES_PT;
  return MONTH_NAMES_EN;
}

export function DatePickerInput({
  value,
  onChange,
  maxDate,
  minDate,
  locale = 'en',
  compact = false,
}: DatePickerInputProps) {
  const content = getUIContent(locale);
  const monthNames = getMonthNames(locale);

  const max = maxDate || new Date(2100, 11, 31);
  const min = minDate || new Date(1900, 0, 1);
  const maxYear = max.getFullYear();
  const minYear = min.getFullYear();

  // Separate state for each field
  const [month, setMonth] = useState<number | ''>(value ? value.getMonth() : '');
  const [day, setDay] = useState<string>(value ? String(value.getDate()) : '');
  const [year, setYear] = useState<string>(value ? String(value.getFullYear()) : '');

  // Sync when external value changes
  useEffect(() => {
    if (value) {
      setMonth(value.getMonth());
      setDay(String(value.getDate()));
      setYear(String(value.getFullYear()));
    }
  }, [value]);

  // Validate and update parent when all fields are filled
  const tryUpdateDate = (m: number | '', d: string, y: string) => {
    if (m === '' || !d || !y) {
      return;
    }

    const dayNum = parseInt(d, 10);
    const yearNum = parseInt(y, 10);

    if (isNaN(dayNum) || isNaN(yearNum)) return;
    if (yearNum < minYear || yearNum > maxYear) return;
    if (dayNum < 1 || dayNum > 31) return;

    const newDate = new Date(yearNum, m, dayNum, 12, 0, 0);

    // Validate the date is real (e.g., Feb 30 would roll over)
    if (newDate.getMonth() !== m || newDate.getDate() !== dayNum) return;

    // Check min/max date
    if (newDate > max || newDate < min) return;

    onChange(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const m = val === '' ? '' : parseInt(val, 10);
    setMonth(m);
    tryUpdateDate(m, day, year);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(val);
    tryUpdateDate(month, val, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    tryUpdateDate(month, day, val);
  };

  // Days in selected month
  const daysInMonth =
    month !== '' && year
      ? new Date(parseInt(year, 10) || 2000, month + 1, 0).getDate()
      : 31;

  const isComplete = value !== null;

  const baseInputClass = compact
    ? 'bg-transparent text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:bg-white/5 transition-colors'
    : 'bg-transparent text-white text-base px-3 py-3 rounded-lg focus:outline-none focus:bg-white/5 transition-colors';

  return (
    <div className="w-full">
      <div
        className={`flex gap-2 p-1 rounded-xl border transition-all ${
          isComplete
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-white/20 bg-white/5'
        }`}
      >
        {/* Month dropdown */}
        <select
          value={month === '' ? '' : month}
          onChange={handleMonthChange}
          className={`flex-1 ${baseInputClass} appearance-none cursor-pointer`}
          style={{ minWidth: compact ? '80px' : '110px' }}
        >
          <option value="" disabled className="bg-neutral-900 text-neutral-400">
            {content.dateSlider.month}
          </option>
          {monthNames.map((name, idx) => (
            <option key={idx} value={idx} className="bg-neutral-900 text-white">
              {name}
            </option>
          ))}
        </select>

        {/* Day input */}
        <input
          type="text"
          inputMode="numeric"
          placeholder={content.dateSlider.day}
          value={day}
          onChange={handleDayChange}
          maxLength={2}
          className={`${compact ? 'w-12' : 'w-16'} ${baseInputClass} text-center placeholder-neutral-500`}
        />

        {/* Year input */}
        <input
          type="text"
          inputMode="numeric"
          placeholder={content.dateSlider.year}
          value={year}
          onChange={handleYearChange}
          maxLength={4}
          className={`${compact ? 'w-14' : 'w-20'} ${baseInputClass} text-center placeholder-neutral-500`}
        />

        {/* Status indicator */}
        {isComplete && (
          <div className="flex items-center px-2">
            <svg
              className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Validation hints */}
      {year && parseInt(year, 10) > maxYear && (
        <p className="mt-1.5 text-xs text-red-400">{content.dateSlider.yearFuture}</p>
      )}
      {year && parseInt(year, 10) < minYear && year.length === 4 && (
        <p className="mt-1.5 text-xs text-red-400">{content.dateSlider.yearPast}</p>
      )}
      {day && parseInt(day, 10) > daysInMonth && (
        <p className="mt-1.5 text-xs text-red-400">{content.dateSlider.invalidDay}</p>
      )}
    </div>
  );
}
