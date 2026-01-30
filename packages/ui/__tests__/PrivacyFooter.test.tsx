/**
 * Tests for PrivacyFooter component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyFooter } from '../src/layout/PrivacyFooter';

describe('PrivacyFooter', () => {
  describe('rendering', () => {
    it('renders privacy notice text', () => {
      render(<PrivacyFooter />);
      expect(
        screen.getByText(
          'All calculations run in your browser. Your birth date is never transmitted.'
        )
      ).toBeInTheDocument();
    });

    it('renders as footer element', () => {
      render(<PrivacyFooter />);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<PrivacyFooter className="custom-class" />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toHaveClass('custom-class');
    });
  });
});
