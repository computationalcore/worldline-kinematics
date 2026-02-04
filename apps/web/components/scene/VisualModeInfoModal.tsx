'use client';

/**
 * Educational modal explaining visual modes and cosmic scale.
 * Uses the reusable InfoModal component.
 */

import { InfoModal } from '@worldline-kinematics/ui';
import { GITHUB_URL } from '../../config';
import { getAppContent } from '../../i18n';

interface VisualModeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
}

/**
 * Parses a translation string with <basketball> and <highlight> markers and returns styled JSX.
 */
function parseVisualizationChallengeDesc(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Find the next tag
    const basketballMatch = remaining.match(/<basketball>(.*?)<\/basketball>/);
    const highlightMatch = remaining.match(/<highlight>(.*?)<\/highlight>/);

    // Determine which comes first
    const basketballIndex = basketballMatch
      ? remaining.indexOf(basketballMatch[0])
      : Infinity;
    const highlightIndex = highlightMatch
      ? remaining.indexOf(highlightMatch[0])
      : Infinity;

    if (basketballIndex === Infinity && highlightIndex === Infinity) {
      // No more tags, add remaining text
      if (remaining) parts.push(remaining);
      break;
    }

    if (basketballIndex < highlightIndex) {
      // Basketball tag comes first
      if (basketballIndex > 0) {
        parts.push(remaining.substring(0, basketballIndex));
      }
      parts.push(
        <span key={key++} className="text-white font-semibold">
          {basketballMatch![1]}
        </span>
      );
      remaining = remaining.substring(basketballIndex + basketballMatch![0].length);
    } else {
      // Highlight tag comes first
      if (highlightIndex > 0) {
        parts.push(remaining.substring(0, highlightIndex));
      }
      parts.push(
        <span key={key++} className="text-amber-300 font-semibold">
          {highlightMatch![1]}
        </span>
      );
      remaining = remaining.substring(highlightIndex + highlightMatch![0].length);
    }
  }

  return parts;
}

export default function VisualModeInfoModal({
  isOpen,
  onClose,
  locale,
}: VisualModeInfoModalProps) {
  const content = getAppContent(locale ?? 'en');
  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={content.visualModes.understandingCosmicScale}
      subtitle={content.visualModes.whyVisualizationModes}
      size="lg"
      closeLabel={content.common.close}
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all text-sm"
        >
          {content.common.close}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Challenge explanation */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.05) 100%)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-amber-300">
                {content.visualModes.visualizationChallenge}
              </h3>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {parseVisualizationChallengeDesc(
                content.visualModes.visualizationChallengeDesc
              )}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              key: 'sun',
              label: content.planets.Sun,
              value: '1.39M',
              unit: 'km',
              color: 'from-orange-500/20 to-yellow-500/10',
            },
            {
              key: 'earth',
              label: content.planets.Earth,
              value: '12,756',
              unit: 'km',
              color: 'from-blue-500/20 to-cyan-500/10',
            },
            {
              key: 'distance',
              label: content.planetInfo.distance,
              value: '149.6M',
              unit: 'km',
              color: 'from-purple-500/20 to-pink-500/10',
            },
            {
              key: 'ratio',
              label: content.visualModes.stats.ratio,
              value: '11,740',
              unit: 'x',
              color: 'from-emerald-500/20 to-teal-500/10',
              highlight: true,
            },
          ].map((stat) => (
            <div
              key={stat.key}
              className={`rounded-xl p-3 text-center ${stat.highlight ? 'ring-1 ring-emerald-500/30' : ''}`}
              style={{
                background:
                  `linear-gradient(135deg, ${stat.color.split(' ')[0].replace('from-', '')} 0%, ${stat.color.split(' ')[1].replace('to-', '')} 100%)`
                    .replace(/\//g, ' ')
                    .replace(/-/g, ''),
              }}
            >
              <div
                className={`text-lg sm:text-xl font-bold ${stat.highlight ? 'text-emerald-400' : 'text-white'}`}
              >
                {stat.value}
                <span className="text-xs ml-0.5 opacity-60">{stat.unit}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Three modes */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            {content.visualModes.threeModes}
          </h3>
          {[
            {
              name: content.visualModes.scholar.name,
              tag: content.visualModes.scholar.tag,
              color: '#3b82f6',
              desc: content.visualModes.scholar.description,
            },
            {
              name: content.visualModes.trueSizes.name,
              tag: content.visualModes.trueSizes.tag,
              color: '#8b5cf6',
              desc: content.visualModes.trueSizes.description,
            },
            {
              name: content.visualModes.trueScale.name,
              tag: content.visualModes.trueScale.tag,
              color: '#10b981',
              desc: content.visualModes.trueScale.description,
            },
          ].map((mode) => (
            <div
              key={mode.name}
              className="flex items-start gap-4 p-4 rounded-xl transition-all hover:bg-white/[0.02]"
              style={{ borderLeft: `3px solid ${mode.color}` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${mode.color}20` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: mode.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">{mode.name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: `${mode.color}20`, color: mode.color }}
                  >
                    {mode.tag}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">{mode.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Speed of light */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,146,60,0.1) 0%, rgba(234,88,12,0.05) 100%)',
          }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-bl from-orange-500/30 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-center mb-4">
              <div className="text-3xl sm:text-4xl font-bold text-white">
                299,792{' '}
                <span className="text-lg text-orange-400">{content.units.kms}</span>
              </div>
              <div className="text-sm text-neutral-400 mt-1">
                {content.visualModes.speedOfLight}
              </div>
            </div>
            <div className="flex justify-center gap-6 sm:gap-10 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-400">7.5x</div>
                <div className="text-xs text-neutral-500">
                  {content.visualModes.earthLoopsSec}
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-400">8 min</div>
                <div className="text-xs text-neutral-500">
                  {content.visualModes.sunToEarth}
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-400">
                  4.1 hrs
                </div>
                <div className="text-xs text-neutral-500">
                  {content.visualModes.sunToNeptune}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About section */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {content.visualModes.about.builtWith}
              </div>
              <div className="text-xs text-neutral-500">
                {content.visualModes.about.description}
              </div>
            </div>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            {content.visualModes.about.github}
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Ephemeris info */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {content.visualModes.about.ephemerides}
              </div>
              <div className="text-xs text-neutral-500">
                {content.visualModes.about.ephemeridesDesc}
              </div>
            </div>
          </div>
          <a
            href="https://github.com/cosinekitty/astronomy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            {content.visualModes.about.github}
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-neutral-500">
          <span className="text-neutral-400">{content.common.tip}:</span>{' '}
          {content.visualModes.tip}
        </p>
      </div>
    </InfoModal>
  );
}
