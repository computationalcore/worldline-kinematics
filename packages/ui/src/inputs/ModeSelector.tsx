/**
 * Reference frame mode selector.
 */

'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import type { ReferenceFrame } from '@worldline-kinematics/core';
import { cn } from '../utils';

interface ModeSelectorProps {
  /** Currently selected mode */
  value: ReferenceFrame;
  /** Callback when mode changes */
  onChange: (mode: ReferenceFrame) => void;
  /** Additional CSS classes */
  className?: string;
}

const modes: { id: ReferenceFrame; label: string; shortLabel: string }[] = [
  { id: 'spin', label: 'Earth Rotation', shortLabel: 'Spin' },
  { id: 'orbit', label: 'Solar Orbit', shortLabel: 'Orbit' },
  { id: 'galaxy', label: 'Galactic Orbit', shortLabel: 'Galaxy' },
  { id: 'cmb', label: 'CMB Frame', shortLabel: 'CMB' },
];

/**
 * Toggle group for selecting reference frame mode.
 */
export function ModeSelector({ value, onChange, className }: ModeSelectorProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ReferenceFrame)}
      className={cn(
        'inline-flex rounded-lg bg-neutral-900/50 p-1 backdrop-blur-sm',
        className
      )}
    >
      {modes.map((mode) => (
        <ToggleGroup.Item
          key={mode.id}
          value={mode.id}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            'data-[state=off]:text-neutral-400 data-[state=off]:hover:text-neutral-200',
            'data-[state=on]:bg-neutral-700 data-[state=on]:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900'
          )}
          aria-label={mode.label}
        >
          {mode.shortLabel}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
