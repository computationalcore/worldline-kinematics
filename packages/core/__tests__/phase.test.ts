/**
 * Tests for lunar phase calculations.
 */
import { describe, it, expect } from 'vitest';
import {
  getMoonPhase,
  getMoonAge,
  getMoonIllumination,
  SYNODIC_MONTH_DAYS,
} from '../src/lunar/phase';

describe('getMoonPhase', () => {
  it('returns phase info object', () => {
    const result = getMoonPhase(new Date('2024-01-11'));
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('illumination');
    expect(result).toHaveProperty('age');
    expect(result).toHaveProperty('emoji');
  });

  it('identifies New Moon correctly', () => {
    // January 11, 2024 was a new moon
    const result = getMoonPhase(new Date('2024-01-11T12:00:00Z'));
    expect(result.phase).toBe('New Moon');
    expect(result.illumination).toBeLessThan(10);
  });

  it('identifies Full Moon correctly', () => {
    // January 25, 2024 was a full moon
    const result = getMoonPhase(new Date('2024-01-25T12:00:00Z'));
    expect(result.phase).toBe('Full Moon');
    expect(result.illumination).toBeGreaterThan(90);
  });

  it('identifies First Quarter correctly', () => {
    // January 18, 2024 was first quarter
    const result = getMoonPhase(new Date('2024-01-18T12:00:00Z'));
    expect(['First Quarter', 'Waxing Gibbous']).toContain(result.phase);
    expect(result.illumination).toBeGreaterThan(40);
    expect(result.illumination).toBeLessThan(70);
  });

  it('identifies Last Quarter correctly', () => {
    // February 2, 2024 was last quarter
    const result = getMoonPhase(new Date('2024-02-02T12:00:00Z'));
    expect(['Last Quarter', 'Waning Gibbous', 'Waning Crescent']).toContain(result.phase);
  });

  it('returns valid age (0 to synodic month)', () => {
    const result = getMoonPhase(new Date());
    expect(result.age).toBeGreaterThanOrEqual(0);
    expect(result.age).toBeLessThan(SYNODIC_MONTH_DAYS);
  });

  it('returns illumination between 0 and 100', () => {
    const result = getMoonPhase(new Date());
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(100);
  });

  it('returns valid emoji', () => {
    const result = getMoonPhase(new Date());
    expect(result.emoji).toBeTruthy();
    expect(result.emoji.length).toBeGreaterThan(0);
  });

  it('handles dates before reference new moon', () => {
    const result = getMoonPhase(new Date('1999-01-01'));
    expect(result.phase).toBeTruthy();
    expect(result.age).toBeGreaterThanOrEqual(0);
  });

  it('handles far future dates', () => {
    const result = getMoonPhase(new Date('2100-01-01'));
    expect(result.phase).toBeTruthy();
    expect(result.age).toBeGreaterThanOrEqual(0);
  });
});

describe('getMoonAge', () => {
  it('returns age in days', () => {
    const age = getMoonAge(new Date('2024-01-11'));
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(SYNODIC_MONTH_DAYS);
  });

  it('returns ~0 at known new moon', () => {
    // Reference new moon is Jan 6, 2000
    const age = getMoonAge(new Date('2000-01-06T18:14:00Z'));
    expect(age).toBeLessThan(1);
  });

  it('returns ~14.7 at full moon', () => {
    // Full moon is approximately 14.77 days after new moon
    const newMoon = new Date('2024-01-11T11:57:00Z');
    const fullMoon = new Date(newMoon.getTime() + 14.77 * 24 * 60 * 60 * 1000);
    const age = getMoonAge(fullMoon);
    expect(age).toBeCloseTo(14.77, 0);
  });

  it('wraps around after synodic month', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date(date1.getTime() + SYNODIC_MONTH_DAYS * 24 * 60 * 60 * 1000);
    const age1 = getMoonAge(date1);
    const age2 = getMoonAge(date2);
    expect(age1).toBeCloseTo(age2, 0);
  });
});

describe('getMoonIllumination', () => {
  it('returns percentage between 0 and 100', () => {
    const illumination = getMoonIllumination(new Date());
    expect(illumination).toBeGreaterThanOrEqual(0);
    expect(illumination).toBeLessThanOrEqual(100);
  });

  it('returns ~0% at new moon', () => {
    const illumination = getMoonIllumination(new Date('2024-01-11T12:00:00Z'));
    expect(illumination).toBeLessThan(5);
  });

  it('returns ~100% at full moon', () => {
    const illumination = getMoonIllumination(new Date('2024-01-25T12:00:00Z'));
    expect(illumination).toBeGreaterThan(95);
  });

  it('returns ~50% at quarter moon', () => {
    const illumination = getMoonIllumination(new Date('2024-01-18T12:00:00Z'));
    expect(illumination).toBeGreaterThan(30);
    expect(illumination).toBeLessThan(70);
  });

  it('matches getMoonPhase illumination', () => {
    const date = new Date('2024-02-15');
    const phaseIllumination = getMoonPhase(date).illumination;
    const directIllumination = getMoonIllumination(date);
    expect(phaseIllumination).toBe(directIllumination);
  });
});
