/**
 * Tests for SpeedHUD component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpeedHUD } from '../src/display/SpeedHUD';
import type { FrameVelocity } from '@worldline-kinematics/core';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SpeedHUD', () => {
  const baseVelocity: FrameVelocity = {
    frame: 'orbit',
    velocityKms: 29.78,
    hasSignificantUncertainty: false,
    metadata: {},
  };

  describe('mode labels', () => {
    it('shows Rotation Speed for spin mode', () => {
      render(<SpeedHUD mode="spin" velocity={{ ...baseVelocity, frame: 'spin' }} />);
      expect(screen.getByText('Rotation Speed')).toBeInTheDocument();
    });

    it('shows Orbital Speed for orbit mode', () => {
      render(<SpeedHUD mode="orbit" velocity={baseVelocity} />);
      expect(screen.getByText('Orbital Speed')).toBeInTheDocument();
    });

    it('shows Galactic Speed for galaxy mode', () => {
      render(<SpeedHUD mode="galaxy" velocity={{ ...baseVelocity, frame: 'galaxy' }} />);
      expect(screen.getByText('Galactic Speed')).toBeInTheDocument();
    });

    it('shows CMB Drift Speed for cmb mode', () => {
      render(<SpeedHUD mode="cmb" velocity={{ ...baseVelocity, frame: 'cmb' }} />);
      expect(screen.getByText('CMB Drift Speed')).toBeInTheDocument();
    });
  });

  describe('speed formatting', () => {
    it('formats speed in km/s with 2 decimal places', () => {
      render(<SpeedHUD mode="orbit" velocity={baseVelocity} unit="km/s" />);
      expect(screen.getByText('29.78')).toBeInTheDocument();
      expect(screen.getByText('km/s')).toBeInTheDocument();
    });

    it('formats speed in km/h without decimals', () => {
      const velocity = { ...baseVelocity, velocityKms: 10 };
      render(<SpeedHUD mode="orbit" velocity={velocity} unit="km/h" />);
      expect(screen.getByText('36,000')).toBeInTheDocument();
      expect(screen.getByText('km/h')).toBeInTheDocument();
    });

    it('formats speed in mph without decimals', () => {
      const velocity = { ...baseVelocity, velocityKms: 10 };
      render(<SpeedHUD mode="orbit" velocity={velocity} unit="mph" />);
      // 10 km/s = 36000 km/h = 36000/1.609344 mph ≈ 22,369
      expect(screen.getByText('22,369')).toBeInTheDocument();
      expect(screen.getByText('mph')).toBeInTheDocument();
    });

    it('defaults to km/s when no unit specified', () => {
      render(<SpeedHUD mode="orbit" velocity={baseVelocity} />);
      expect(screen.getByText('km/s')).toBeInTheDocument();
    });
  });

  describe('uncertainty display', () => {
    it('shows uncertainty when hasSignificantUncertainty is true', () => {
      const velocity: FrameVelocity = {
        ...baseVelocity,
        hasSignificantUncertainty: true,
        uncertaintyKms: 5,
      };
      render(<SpeedHUD mode="orbit" velocity={velocity} />);
      expect(screen.getByText('Model uncertainty: ±5 km/s')).toBeInTheDocument();
    });

    it('hides uncertainty when hasSignificantUncertainty is false', () => {
      const velocity: FrameVelocity = {
        ...baseVelocity,
        hasSignificantUncertainty: false,
        uncertaintyKms: 5,
      };
      render(<SpeedHUD mode="orbit" velocity={velocity} />);
      expect(screen.queryByText(/uncertainty/i)).not.toBeInTheDocument();
    });

    it('hides uncertainty when uncertaintyKms is undefined', () => {
      const velocity: FrameVelocity = {
        ...baseVelocity,
        hasSignificantUncertainty: true,
        uncertaintyKms: undefined,
      };
      render(<SpeedHUD mode="orbit" velocity={velocity} />);
      expect(screen.queryByText(/uncertainty/i)).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SpeedHUD mode="orbit" velocity={baseVelocity} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
