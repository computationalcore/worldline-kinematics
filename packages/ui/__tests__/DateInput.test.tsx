/**
 * Tests for DateInput component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateInput } from '../src/inputs/DateInput';

describe('DateInput', () => {
  describe('rendering', () => {
    it('renders with default label', () => {
      render(<DateInput value={null} onChange={vi.fn()} />);
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<DateInput value={null} onChange={vi.fn()} label="Start Date" />);
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    });

    it('displays current value formatted as YYYY-MM-DD', () => {
      const date = new Date(1990, 4, 15, 12, 0, 0);
      render(<DateInput value={date} onChange={vi.fn()} />);
      const input = screen.getByLabelText('Birth Date') as HTMLInputElement;
      expect(input.value).toBe('1990-05-15');
    });

    it('applies custom className', () => {
      const { container } = render(
        <DateInput value={null} onChange={vi.fn()} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('input behavior', () => {
    it('calls onChange with parsed Date when valid date entered', () => {
      const onChange = vi.fn();
      render(<DateInput value={null} onChange={onChange} />);

      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '1990-05-15' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      const passedDate = onChange.mock.calls[0][0] as Date;
      expect(passedDate).toBeInstanceOf(Date);
      expect(passedDate.getFullYear()).toBe(1990);
      expect(passedDate.getMonth()).toBe(4);
      expect(passedDate.getDate()).toBe(15);
    });

    it('parses date as local noon to avoid timezone issues', () => {
      const onChange = vi.fn();
      render(<DateInput value={null} onChange={onChange} />);

      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '2020-01-01' } });

      const passedDate = onChange.mock.calls[0][0] as Date;
      expect(passedDate.getHours()).toBe(12);
      expect(passedDate.getMinutes()).toBe(0);
      expect(passedDate.getSeconds()).toBe(0);
    });

    it('regex validates YYYY-MM-DD format', () => {
      const onChange = vi.fn();
      render(<DateInput value={null} onChange={onChange} />);

      // Valid format should call with Date
      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '1990-05-15' } });
      expect(onChange).toHaveBeenCalled();

      const passedDate = onChange.mock.calls[0][0] as Date;
      expect(passedDate).not.toBeNull();
    });

    it('calls onChange with null for empty value', () => {
      const onChange = vi.fn();
      render(<DateInput value={new Date()} onChange={onChange} />);

      const input = screen.getByLabelText('Birth Date');
      fireEvent.change(input, { target: { value: '' } });

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('input constraints', () => {
    it('has max attribute set to today', () => {
      render(<DateInput value={null} onChange={vi.fn()} />);
      const input = screen.getByLabelText('Birth Date') as HTMLInputElement;

      const today = new Date().toISOString().split('T')[0];
      expect(input.max).toBe(today);
    });

    it('input type is date', () => {
      render(<DateInput value={null} onChange={vi.fn()} />);
      const input = screen.getByLabelText('Birth Date') as HTMLInputElement;
      expect(input.type).toBe('date');
    });
  });

  describe('value synchronization', () => {
    it('updates input when value prop changes', () => {
      const { rerender } = render(<DateInput value={null} onChange={vi.fn()} />);

      const newDate = new Date(2000, 0, 1, 12, 0, 0);
      rerender(<DateInput value={newDate} onChange={vi.fn()} />);

      const input = screen.getByLabelText('Birth Date') as HTMLInputElement;
      expect(input.value).toBe('2000-01-01');
    });

    it('clears input when value becomes null', () => {
      const date = new Date(1990, 4, 15, 12, 0, 0);
      const { rerender } = render(<DateInput value={date} onChange={vi.fn()} />);

      rerender(<DateInput value={null} onChange={vi.fn()} />);

      const input = screen.getByLabelText('Birth Date') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
