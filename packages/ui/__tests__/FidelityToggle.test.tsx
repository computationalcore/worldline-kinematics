/**
 * Tests for FidelityToggle component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FidelityToggle } from '../src/inputs/FidelityToggle';

describe('FidelityToggle', () => {
  describe('rendering', () => {
    it('renders visual quality label', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );
      expect(screen.getByText('Visual Quality')).toBeInTheDocument();
    });

    it('renders Standard button', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    it('renders Cinematic button with "Soon" badge', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );
      expect(screen.getByText('Cinematic')).toBeInTheDocument();
      expect(screen.getByText('(Soon)')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <FidelityToggle
          value="standard"
          onChange={vi.fn()}
          cinematicAvailable={true}
          className="custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('current state', () => {
    it('always shows Standard as selected (cinematic disabled)', () => {
      render(
        <FidelityToggle value="cinematic" onChange={vi.fn()} cinematicAvailable={true} />
      );

      const standardButton = screen.getByText('Standard').closest('button');
      expect(standardButton).toHaveClass('bg-neutral-700');
    });

    it('Cinematic button is disabled', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );

      const cinematicButton = screen.getByText('Cinematic').closest('button');
      expect(cinematicButton).toBeDisabled();
    });
  });

  describe('description', () => {
    it('shows performance description', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );
      expect(
        screen.getByText('Optimized for performance on all devices')
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('Cinematic button has title tooltip', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );

      const cinematicButton = screen.getByText('Cinematic').closest('button');
      expect(cinematicButton).toHaveAttribute('title', 'Coming Soon');
    });

    it('buttons are properly typed', () => {
      render(
        <FidelityToggle value="standard" onChange={vi.fn()} cinematicAvailable={true} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });
});
