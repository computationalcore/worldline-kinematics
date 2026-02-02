/**
 * Canvas rendering for share image card.
 */

import type { AgeDuration } from '@worldline-kinematics/core';
import {
  moonRoundTrips,
  lightYearProgress,
  formatNumberCompact,
} from '@worldline-kinematics/core';

interface FrameData {
  id: string;
  label: string;
  distanceKm: number;
  color: string;
  percentage: number;
}

export interface ShareCardData {
  title: string;
  age: AgeDuration;
  birthDate?: Date;
  totalDistanceKm: number;
  frames: FrameData[];
  selectedBody?: string;
  locale?: string;
}

interface ShareCardLabels {
  title: string;
  totalDistance: string;
  billion: string;
  trillion: string;
  million: string;
  years: string;
  months: string;
  days: string;
  appName: string;
  appUrl: string;
  bornOn: string;
  thatsLike: string;
  tripsToTheMoonAndBack: string;
  ofALightYear: string;
  frameLabels: {
    spin: string;
    orbit: string;
    galaxy: string;
    cmb: string;
  };
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

/**
 * Formats distance for display on share card.
 */
function formatDistance(km: number, labels: ShareCardLabels): string {
  if (km >= 1e12) {
    return `${(km / 1e12).toFixed(2)} ${labels.trillion} km`;
  }
  if (km >= 1e9) {
    return `${(km / 1e9).toFixed(2)} ${labels.billion} km`;
  }
  if (km >= 1e6) {
    return `${(km / 1e6).toFixed(2)} ${labels.million} km`;
  }
  return `${km.toLocaleString()} km`;
}

/**
 * Formats age for display on share card.
 */
function formatAge(age: AgeDuration, labels: ShareCardLabels): string {
  const parts: string[] = [];
  if (age.years > 0) parts.push(`${age.years} ${labels.years}`);
  if (age.months > 0) parts.push(`${age.months} ${labels.months}`);
  if (age.days > 0) parts.push(`${age.days} ${labels.days}`);
  return parts.join(', ') || `0 ${labels.days}`;
}

/**
 * Formats birth date for display.
 */
function formatBirthDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Draws a rounded rectangle with optional fill and stroke.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: string,
  stroke?: string
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Creates a share card image by overlaying stats on the scene screenshot.
 */
export async function createShareCard(
  sceneCanvas: HTMLCanvasElement,
  data: ShareCardData,
  labels: ShareCardLabels
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw scene screenshot as background, scaled to fit
  const sceneAspect = sceneCanvas.width / sceneCanvas.height;
  const cardAspect = CARD_WIDTH / CARD_HEIGHT;

  let sx = 0,
    sy = 0,
    sw = sceneCanvas.width,
    sh = sceneCanvas.height;

  if (sceneAspect > cardAspect) {
    // Scene is wider, crop sides
    sw = sceneCanvas.height * cardAspect;
    sx = (sceneCanvas.width - sw) / 2;
  } else {
    // Scene is taller, crop top/bottom
    sh = sceneCanvas.width / cardAspect;
    sy = (sceneCanvas.height - sh) / 2;
  }

  ctx.drawImage(sceneCanvas, sx, sy, sw, sh, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Apply semi-transparent gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(0.25, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ===== HEADER SECTION =====

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(labels.title, 60, 75);

  // Age
  ctx.font = '26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(formatAge(data.age, labels), 60, 115);

  // Birth date (if available)
  if (data.birthDate) {
    const locale = data.locale || 'en';
    const birthDateStr = `${labels.bornOn} ${formatBirthDate(data.birthDate, locale)}`;
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(birthDateStr, 60, 145);
  }

  // App logo at top right - styled "SPACETIME JOURNEY"
  const logoBoxWidth = 180;
  const logoBoxHeight = 65;
  const logoBoxX = CARD_WIDTH - 50 - logoBoxWidth;
  const logoBoxY = 30;
  const logoBoxRadius = 10;

  drawRoundedRect(
    ctx,
    logoBoxX,
    logoBoxY,
    logoBoxWidth,
    logoBoxHeight,
    logoBoxRadius,
    'rgba(0, 0, 0, 0.5)',
    'rgba(255, 255, 255, 0.1)'
  );

  // "SPACETIME" with gradient
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const spacetimeX = logoBoxX + logoBoxWidth / 2;
  const spacetimeY = logoBoxY + 30;

  const textGradient = ctx.createLinearGradient(
    spacetimeX - 55,
    spacetimeY,
    spacetimeX + 55,
    spacetimeY
  );
  textGradient.addColorStop(0, '#60a5fa');
  textGradient.addColorStop(1, '#c084fc');
  ctx.fillStyle = textGradient;
  ctx.fillText('SPACETIME', spacetimeX, spacetimeY);

  // "JOURNEY" in white
  ctx.font = '500 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('JOURNEY', spacetimeX, spacetimeY + 20);

  // ===== EQUIVALENCE STATS =====

  const moonTrips = moonRoundTrips(data.totalDistanceKm);
  const lightYearPct = lightYearProgress(data.totalDistanceKm);

  // Stats container position
  const statsY = CARD_HEIGHT - 230;
  const statBoxWidth = 200;
  const statBoxHeight = 70;
  const statBoxRadius = 12;
  const statsGap = 20;

  // "That's like" label
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(labels.thatsLike.toUpperCase(), 60, statsY - 15);

  // Stat box 1: Moon round trips
  const stat1X = 60;
  drawRoundedRect(
    ctx,
    stat1X,
    statsY,
    statBoxWidth,
    statBoxHeight,
    statBoxRadius,
    'rgba(255, 255, 255, 0.08)',
    'rgba(255, 255, 255, 0.15)'
  );

  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#fbbf24'; // amber-400
  ctx.textAlign = 'left';
  ctx.fillText(`≈ ${formatNumberCompact(moonTrips)}`, stat1X + 16, statsY + 35);

  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(labels.tripsToTheMoonAndBack, stat1X + 16, statsY + 55);

  // Stat box 2: % of a light year
  const stat2X = stat1X + statBoxWidth + statsGap;
  drawRoundedRect(
    ctx,
    stat2X,
    statsY,
    statBoxWidth,
    statBoxHeight,
    statBoxRadius,
    'rgba(255, 255, 255, 0.08)',
    'rgba(255, 255, 255, 0.15)'
  );

  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#a78bfa'; // violet-400
  ctx.textAlign = 'left';
  const lightYearDisplay =
    lightYearPct >= 1 ? `${lightYearPct.toFixed(1)}%` : `${lightYearPct.toFixed(3)}%`;
  ctx.fillText(lightYearDisplay, stat2X + 16, statsY + 35);

  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(labels.ofALightYear, stat2X + 16, statsY + 55);

  // ===== TOTAL DISTANCE SECTION =====

  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(labels.totalDistance.toUpperCase(), 60, CARD_HEIGHT - 115);

  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatDistance(data.totalDistanceKm, labels), 60, CARD_HEIGHT - 70);

  // ===== FRAME COLOR BAR WITH LABELS =====

  const barY = CARD_HEIGHT - 40;
  const barHeight = 12;
  const barWidth = CARD_WIDTH - 120;
  const barRadius = 6;
  let barX = 60;

  // Draw rounded background
  drawRoundedRect(
    ctx,
    barX,
    barY,
    barWidth,
    barHeight,
    barRadius,
    'rgba(255, 255, 255, 0.1)'
  );

  // Draw frame segments
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
  ctx.clip();

  const framePositions: { x: number; width: number; color: string; id: string }[] = [];
  data.frames.forEach((frame) => {
    const segmentWidth = (frame.percentage / 100) * barWidth;
    ctx.fillStyle = frame.color;
    ctx.fillRect(barX, barY, segmentWidth, barHeight);
    framePositions.push({
      x: barX,
      width: segmentWidth,
      color: frame.color,
      id: frame.id,
    });
    barX += segmentWidth;
  });

  ctx.restore();

  // Frame labels below bar
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';

  const frameIdToLabel: Record<string, string> = {
    spin: labels.frameLabels.spin,
    orbit: labels.frameLabels.orbit,
    galaxy: labels.frameLabels.galaxy,
    cmb: labels.frameLabels.cmb,
  };

  framePositions.forEach((fp) => {
    if (fp.width > 30) {
      // Only show label if segment is wide enough
      ctx.fillStyle = fp.color;
      const labelX = fp.x + fp.width / 2;
      ctx.fillText(frameIdToLabel[fp.id] || fp.id, labelX, barY + barHeight + 14);
    }
  });

  // ===== WEBSITE URL FOOTER =====

  const displayUrl = labels.appUrl.replace(/^https?:\/\//, '');
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(displayUrl, CARD_WIDTH - 50, CARD_HEIGHT - 15);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      'image/png',
      1.0
    );
  });
}
