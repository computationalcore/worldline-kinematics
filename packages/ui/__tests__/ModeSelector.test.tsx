/**
 * Tests for ModeSelector component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from '../src/inputs/ModeSelector';
import type { ReferenceFrame } from '@worldline-kinematics/core';

describe('ModeSelector', () => {
  const allModes: ReferenceFrame[] = ['spin', 'orbit', 'galaxy', 'cmb'];

  describe('rendering', () => {
    it('renders all four mode buttons', () => {
      render(<ModeSelector value="spin" onChange={vi.fn()} />);

      expect(screen.getByText('Spin')).toBeInTheDocument();
      expect(screen.getByText('Orbit')).toBeInTheDocument();
      expect(screen.getByText('Galaxy')).toBeInTheDocument();
      expect(screen.getByText('CMB')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ModeSelector value="spin" onChange={vi.fn()} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('selection state', () => {
    const modeLabels: Record<string, string> = {
      spin: 'Spin',
      orbit: 'Orbit',
      galaxy: 'Galaxy',
      cmb: 'CMB',
    };

    for (const mode of allModes) {
      it(`shows ${mode} as selected when value=${mode}`, () => {
        render(<ModeSelector value={mode} onChange={vi.fn()} />);

        const buttons = screen.getAllByRole('radio');
        const selectedButton = buttons.find(
          (btn) => btn.getAttribute('data-state') === 'on'
        );
        expect(selectedButton).toBeDefined();
        // Check by text content since Radix may not expose value attribute
        expect(selectedButton?.textContent).toBe(modeLabels[mode]);
      });
    }
  });

  describe('mode switching', () => {
    it('calls onChange when clicking a different mode', () => {
      const onChange = vi.fn();
      render(<ModeSelector value="spin" onChange={onChange} />);

      fireEvent.click(screen.getByText('Orbit'));

      expect(onChange).toHaveBeenCalledWith('orbit');
    });

    it('does not call onChange when clicking the current mode', () => {
      const onChange = vi.fn();
      render(<ModeSelector value="spin" onChange={onChange} />);

      fireEvent.click(screen.getByText('Spin'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('can switch to each mode', () => {
      const onChange = vi.fn();
      const { rerender } = render(<ModeSelector value="spin" onChange={onChange} />);

      fireEvent.click(screen.getByText('Galaxy'));
      expect(onChange).toHaveBeenLastCalledWith('galaxy');

      rerender(<ModeSelector value="galaxy" onChange={onChange} />);

      fireEvent.click(screen.getByText('CMB'));
      expect(onChange).toHaveBeenLastCalledWith('cmb');
    });
  });

  describe('accessibility', () => {
    it('has accessible labels for each mode', () => {
      render(<ModeSelector value="spin" onChange={vi.fn()} />);

      expect(screen.getByLabelText('Earth Rotation')).toBeInTheDocument();
      expect(screen.getByLabelText('Solar Orbit')).toBeInTheDocument();
      expect(screen.getByLabelText('Galactic Orbit')).toBeInTheDocument();
      expect(screen.getByLabelText('CMB Frame')).toBeInTheDocument();
    });

    it('buttons are radio buttons in a group', () => {
      render(<ModeSelector value="spin" onChange={vi.fn()} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(4);
    });
  });
});
