/**
 * Tests for LatitudeSlider component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LatitudeSlider } from '../src/inputs/LatitudeSlider';

describe('LatitudeSlider', () => {
  describe('rendering', () => {
    it('renders with default label', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} />);
      expect(screen.getByText('Latitude')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} label="Location" />);
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <LatitudeSlider value={0} onChange={vi.fn()} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('value display', () => {
    it('shows positive latitude with N suffix', () => {
      render(<LatitudeSlider value={45} onChange={vi.fn()} />);
      expect(screen.getByText('45.0° N')).toBeInTheDocument();
    });

    it('shows negative latitude with S suffix', () => {
      render(<LatitudeSlider value={-45} onChange={vi.fn()} />);
      // Component displays absolute value with S suffix for negative latitudes
      expect(screen.getByText('-45.0° S')).toBeInTheDocument();
    });

    it('shows zero latitude with N suffix', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} />);
      expect(screen.getByText('0.0° N')).toBeInTheDocument();
    });

    it('shows pole values correctly', () => {
      const { rerender } = render(<LatitudeSlider value={90} onChange={vi.fn()} />);
      expect(screen.getByText('90.0° N')).toBeInTheDocument();

      rerender(<LatitudeSlider value={-90} onChange={vi.fn()} />);
      // Component displays value with sign and S suffix for negative
      expect(screen.getByText('-90.0° S')).toBeInTheDocument();
    });

    it('formats decimal values', () => {
      render(<LatitudeSlider value={12.3456} onChange={vi.fn()} />);
      expect(screen.getByText('12.3° N')).toBeInTheDocument();
    });
  });

  describe('reference labels', () => {
    it('shows pole and equator reference labels', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} />);
      expect(screen.getByText('-90° (South Pole)')).toBeInTheDocument();
      expect(screen.getByText('0° (Equator)')).toBeInTheDocument();
      expect(screen.getByText('+90° (North Pole)')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible slider thumb', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Latitude');
    });

    it('slider has correct min/max attributes', () => {
      render(<LatitudeSlider value={0} onChange={vi.fn()} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '-90');
      expect(slider).toHaveAttribute('aria-valuemax', '90');
    });

    it('slider reflects current value', () => {
      render(<LatitudeSlider value={45} onChange={vi.fn()} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '45');
    });
  });
});
