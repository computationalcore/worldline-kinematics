/**
 * Hook for sharing journey as an image.
 */

import { useState, useCallback, useMemo } from 'react';
import { createShareCard, type ShareCardData } from '../share/createShareCard';
import { getUIContent } from '../i18n';

interface UseShareJourneyOptions {
  locale?: string;
  appUrl?: string;
  appName?: string;
}

interface UseShareJourneyReturn {
  shareJourney: (canvas: HTMLCanvasElement, data: ShareCardData) => Promise<void>;
  isSharing: boolean;
  canShare: boolean;
}

/**
 * Detects if the Web Share API with file support is available.
 */
function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  // Check if files can be shared (not all browsers support this)
  if (!navigator.canShare) {
    return false;
  }

  // Test with a dummy file
  const testFile = new File(['test'], 'test.png', { type: 'image/png' });
  try {
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Downloads a blob as a file.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Hook for sharing journey statistics as an image.
 */
export function useShareJourney(
  options: UseShareJourneyOptions = {}
): UseShareJourneyReturn {
  const {
    locale = 'en',
    appUrl = 'https://www.spacetimejourney.com',
    appName = 'Spacetime Journey',
  } = options;
  const [isSharing, setIsSharing] = useState(false);

  const canShare = useMemo(() => canShareFiles(), []);
  const t = useMemo(() => getUIContent(locale), [locale]);

  const shareJourney = useCallback(
    async (canvas: HTMLCanvasElement, data: ShareCardData) => {
      setIsSharing(true);

      const labels = {
        title: t.share?.title || 'My Cosmic Journey',
        totalDistance: t.share?.totalDistance || 'Total Distance Traveled',
        billion: t.units?.billion || 'Billion',
        trillion: t.units?.trillion || 'Trillion',
        million: t.units?.million || 'Million',
        years: t.share?.years || t.journey?.modal?.years || 'years',
        months: t.share?.months || t.journey?.modal?.months || 'months',
        days: t.share?.days || t.journey?.modal?.days || 'days',
        appName,
        appUrl,
        bornOn: t.share?.bornOn || 'Born on',
        thatsLike: t.share?.thatsLike || "That's like",
        tripsToTheMoonAndBack:
          t.share?.tripsToTheMoonAndBack || 'trips to the Moon and back',
        ofALightYear: t.share?.ofALightYear || 'of a light-year',
        frameLabels: {
          spin: t.share?.frameLabels?.spin || 'Spin',
          orbit: t.share?.frameLabels?.orbit || 'Orbit',
          galaxy: t.share?.frameLabels?.galaxy || 'Galaxy',
          cmb: t.share?.frameLabels?.cmb || 'CMB',
        },
      };

      // Build share text with "Made with" prefix
      const madeWith = t.share?.madeWith || 'Made with';
      const displayUrl = appUrl.replace(/^https?:\/\//, '');
      const shareText = `${t.share?.shareText || 'Check out my cosmic journey!'} ${madeWith} ${displayUrl}`;

      try {
        const blob = await createShareCard(canvas, data, labels);
        const file = new File([blob], 'cosmic-journey.png', { type: 'image/png' });

        if (canShare) {
          try {
            await navigator.share({
              files: [file],
              title: labels.title,
              text: shareText,
            });
          } catch (error) {
            // User cancelled or share failed, fall back to download
            if (error instanceof Error && error.name !== 'AbortError') {
              downloadBlob(blob, 'cosmic-journey.png');
            }
          }
        } else {
          downloadBlob(blob, 'cosmic-journey.png');
        }
      } finally {
        setIsSharing(false);
      }
    },
    [canShare, t, appUrl, appName]
  );

  return {
    shareJourney,
    isSharing,
    canShare,
  };
}
