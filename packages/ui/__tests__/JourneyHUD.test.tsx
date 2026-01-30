/**
 * Tests for JourneyHUD component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JourneyHUD } from '../src/drawer/JourneyHUD';
import type { AgeDuration } from '@worldline-kinematics/core';

describe('JourneyHUD', () => {
  const mockAge: AgeDuration = {
    years: 30,
    months: 5,
    days: 15,
    hours: 10,
    minutes: 30,
    seconds: 45,
    isPreBirth: false,
  };

  const defaultProps = {
    age: mockAge,
    totalDistanceKm: 1_000_000_000,
    currentSpeedKms: 220,
    speedUnit: 'km/s' as const,
    onSpeedUnitChange: vi.fn(),
    drawerState: 'docked' as const,
    onStateChange: vi.fn(),
  };

  describe('mission duration display', () => {
    it('renders Mission Duration header', () => {
      render(<JourneyHUD {...defaultProps} />);
      expect(screen.getByText('Mission Duration')).toBeInTheDocument();
    });

    it('displays years, months, days', () => {
      render(<JourneyHUD {...defaultProps} />);
      // Values appear in multiple places, just check they exist
      const thirties = screen.getAllByText('30');
      expect(thirties.length).toBeGreaterThan(0);
    });

    it('displays hours, minutes, seconds with zero padding', () => {
      render(<JourneyHUD {...defaultProps} />);
      // Values are formatted with padStart, check for '10' (hours)
      const tens = screen.getAllByText('10');
      expect(tens.length).toBeGreaterThan(0);
    });

    it('shows placeholder when age is null', () => {
      render(<JourneyHUD {...defaultProps} age={null} />);
      expect(screen.getByText('--y --m --d')).toBeInTheDocument();
    });

    it('applies pre-birth styling when isPreBirth is true', () => {
      const preBirthAge = { ...mockAge, isPreBirth: true };
      render(<JourneyHUD {...defaultProps} age={preBirthAge} />);

      // The container should have amber color for pre-birth
      const yearText = screen.getAllByText('30')[0];
      const container = yearText?.closest('div[class*="font-bold"]');
      expect(container).toHaveClass('text-amber-400');
    });
  });

  describe('speed unit toggle', () => {
    it('displays current speed unit', () => {
      render(<JourneyHUD {...defaultProps} speedUnit="km/s" />);
      expect(screen.getByText('Units: km/s')).toBeInTheDocument();
    });

    it('cycles through units on click', () => {
      const onSpeedUnitChange = vi.fn();
      render(
        <JourneyHUD
          {...defaultProps}
          speedUnit="km/s"
          onSpeedUnitChange={onSpeedUnitChange}
        />
      );

      fireEvent.click(screen.getByText('Units: km/s'));
      expect(onSpeedUnitChange).toHaveBeenCalledWith('km/h');
    });

    it('cycles from km/h to mph', () => {
      const onSpeedUnitChange = vi.fn();
      render(
        <JourneyHUD
          {...defaultProps}
          speedUnit="km/h"
          onSpeedUnitChange={onSpeedUnitChange}
        />
      );

      fireEvent.click(screen.getByText('Units: km/h'));
      expect(onSpeedUnitChange).toHaveBeenCalledWith('mph');
    });

    it('cycles from mph back to km/s', () => {
      const onSpeedUnitChange = vi.fn();
      render(
        <JourneyHUD
          {...defaultProps}
          speedUnit="mph"
          onSpeedUnitChange={onSpeedUnitChange}
        />
      );

      fireEvent.click(screen.getByText('Units: mph'));
      expect(onSpeedUnitChange).toHaveBeenCalledWith('km/s');
    });

    it('has tooltip on unit toggle button', () => {
      render(<JourneyHUD {...defaultProps} />);
      const button = screen.getByTitle('Click to change units');
      expect(button).toBeInTheDocument();
    });
  });

  describe('time labels', () => {
    it('shows time unit labels', () => {
      render(<JourneyHUD {...defaultProps} />);
      // The component uses y, m, d, h, m, s as labels
      // m appears twice (months and minutes), h appears once
      const yLabels = screen.getAllByText('y');
      const hLabels = screen.getAllByText('h');
      const sLabels = screen.getAllByText('s');
      expect(yLabels.length).toBeGreaterThan(0);
      expect(hLabels.length).toBeGreaterThan(0);
      expect(sLabels.length).toBeGreaterThan(0);
    });

    it('shows hour/minute/second labels', () => {
      render(<JourneyHUD {...defaultProps} />);
      // m appears for both months and minutes
      const mLabels = screen.getAllByText('m');
      expect(mLabels.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('handles zero values in age', () => {
      const zeroAge: AgeDuration = {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPreBirth: false,
      };
      render(<JourneyHUD {...defaultProps} age={zeroAge} />);

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('pads single digit hours/minutes/seconds', () => {
      const singleDigitAge: AgeDuration = {
        years: 1,
        months: 1,
        days: 1,
        hours: 5,
        minutes: 3,
        seconds: 9,
        isPreBirth: false,
      };
      render(<JourneyHUD {...defaultProps} age={singleDigitAge} />);

      expect(screen.getByText('05')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
      expect(screen.getByText('09')).toBeInTheDocument();
    });
  });
});
