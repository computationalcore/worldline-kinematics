/**
 * Latitude slider component.
 */

'use client';

import * as Slider from '@radix-ui/react-slider';
import { cn } from '../utils';

interface LatitudeSliderProps {
  /** Current latitude in degrees (-90 to 90) */
  value: number;
  /** Callback when latitude changes */
  onChange: (latitude: number) => void;
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Slider for selecting latitude.
 */
export function LatitudeSlider({
  value,
  onChange,
  label = 'Latitude',
  className,
}: LatitudeSliderProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-neutral-300">{label}</label>
        <span className="text-sm text-neutral-400">
          {value.toFixed(1)}° {value >= 0 ? 'N' : 'S'}
        </span>
      </div>
      <Slider.Root
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? value)}
        min={-90}
        max={90}
        step={0.1}
        className="relative flex items-center select-none touch-none w-full h-5"
      >
        <Slider.Track className="bg-neutral-700 relative grow rounded-full h-1">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            'block w-4 h-4 bg-white rounded-full shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-transform hover:scale-110'
          )}
          aria-label="Latitude"
        />
      </Slider.Root>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>-90° (South Pole)</span>
        <span>0° (Equator)</span>
        <span>+90° (North Pole)</span>
      </div>
    </div>
  );
}
