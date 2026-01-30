/**
 * Tests for JourneyBreakdown component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JourneyBreakdown } from '../src/drawer/JourneyBreakdown';
import type { FrameInfo } from '../src/drawer/types';

describe('JourneyBreakdown', () => {
  const sampleFrames: FrameInfo[] = [
    {
      id: 'spin',
      label: 'Earth Rotation',
      description: 'Due to planet spin',
      distanceKm: 1_000_000,
      speedKms: 0.465,
      color: '#4ade80',
    },
    {
      id: 'orbit',
      label: 'Solar Orbit',
      description: 'Around the Sun',
      distanceKm: 28_000_000_000,
      speedKms: 29.78,
      color: '#fbbf24',
    },
    {
      id: 'galaxy',
      label: 'Galactic Orbit',
      description: 'Around galactic center',
      distanceKm: 200_000_000_000,
      speedKms: 220,
      color: '#818cf8',
    },
    {
      id: 'cmb',
      label: 'CMB Frame',
      description: 'Relative to CMB',
      distanceKm: 350_000_000_000,
      speedKms: 369.82,
      color: '#f472b6',
    },
  ];

  describe('rendering', () => {
    it('renders section header', () => {
      render(<JourneyBreakdown frames={sampleFrames} speedUnit="km/s" />);
      expect(screen.getByText('Distance by Reference Frame')).toBeInTheDocument();
    });

    it('renders all frame labels', () => {
      render(<JourneyBreakdown frames={sampleFrames} speedUnit="km/s" />);

      expect(screen.getByText('Earth Rotation')).toBeInTheDocument();
      expect(screen.getByText('Solar Orbit')).toBeInTheDocument();
      expect(screen.getByText('Galactic Orbit')).toBeInTheDocument();
      expect(screen.getByText('CMB Frame')).toBeInTheDocument();
    });

    it('renders frame descriptions', () => {
      render(<JourneyBreakdown frames={sampleFrames} speedUnit="km/s" />);

      expect(screen.getByText('Due to planet spin')).toBeInTheDocument();
      expect(screen.getByText('Around the Sun')).toBeInTheDocument();
      expect(screen.getByText('Around galactic center')).toBeInTheDocument();
      expect(screen.getByText('Relative to CMB')).toBeInTheDocument();
    });
  });

  describe('distance formatting', () => {
    it('formats millions of km with M suffix', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, distanceKm: 5_000_000 }];
      render(<JourneyBreakdown frames={frames} speedUnit="km/s" />);
      expect(screen.getByText('5.00')).toBeInTheDocument();
      expect(screen.getByText('M km')).toBeInTheDocument();
    });

    it('formats billions of km with B suffix', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, distanceKm: 28_000_000_000 }];
      render(<JourneyBreakdown frames={frames} speedUnit="km/s" />);
      expect(screen.getByText('28.00')).toBeInTheDocument();
      expect(screen.getByText('B km')).toBeInTheDocument();
    });

    it('formats trillions of km with T suffix', () => {
      const frames: FrameInfo[] = [
        { ...sampleFrames[0]!, distanceKm: 2_500_000_000_000 },
      ];
      render(<JourneyBreakdown frames={frames} speedUnit="km/s" />);
      expect(screen.getByText('2.50')).toBeInTheDocument();
      expect(screen.getByText('T km')).toBeInTheDocument();
    });

    it('formats smaller distances in km', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, distanceKm: 500_000 }];
      render(<JourneyBreakdown frames={frames} speedUnit="km/s" />);
      expect(screen.getByText('km')).toBeInTheDocument();
    });
  });

  describe('speed units', () => {
    it('displays km/s with 2 decimal places', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, speedKms: 29.78 }];
      render(<JourneyBreakdown frames={frames} speedUnit="km/s" />);
      expect(screen.getByText('29.78')).toBeInTheDocument();
    });

    it('displays km/h for frame speeds', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, speedKms: 10 }];
      render(<JourneyBreakdown frames={frames} speedUnit="km/h" />);
      // 10 km/s = 36,000 km/h
      expect(screen.getByText('36K')).toBeInTheDocument();
    });

    it('displays mph for frame speeds', () => {
      const frames: FrameInfo[] = [{ ...sampleFrames[0]!, speedKms: 10 }];
      render(<JourneyBreakdown frames={frames} speedUnit="mph" />);
      // 10 km/s = ~22,369 mph, formatCompact with 0 decimals = "22K"
      expect(screen.getByText('22K')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders header even with empty frames', () => {
      render(<JourneyBreakdown frames={[]} speedUnit="km/s" />);
      expect(screen.getByText('Distance by Reference Frame')).toBeInTheDocument();
    });
  });
});
