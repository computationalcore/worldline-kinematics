/**
 * Birth date input with local noon parsing.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '../utils';

interface DateInputProps {
  /** Current date value */
  value: Date | null;
  /** Callback when date changes */
  onChange: (date: Date | null) => void;
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats a Date as YYYY-MM-DD for HTML date input.
 * Uses local date components to match the local noon parsing convention.
 */
function formatDateForInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD) as local noon.
 * This avoids timezone/DST issues where the date could shift backward.
 */
function parseDateAsLocalNoon(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Date input for birth date entry.
 * Uses native date input for best mobile support.
 */
export function DateInput({
  value,
  onChange,
  label = 'Birth Date',
  className,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState(value ? formatDateForInput(value) : '');

  // Sync input value when prop changes externally
  useEffect(() => {
    setInputValue(value ? formatDateForInput(value) : '');
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const date = parseDateAsLocalNoon(val);
        if (!isNaN(date.getTime())) {
          onChange(date);
        }
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor="birth-date" className="text-sm font-medium text-neutral-300">
        {label}
      </label>
      <input
        id="birth-date"
        type="date"
        value={inputValue}
        onChange={handleChange}
        max={new Date().toISOString().split('T')[0]}
        className={cn(
          'px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700',
          'text-white placeholder-neutral-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-colors'
        )}
      />
    </div>
  );
}
