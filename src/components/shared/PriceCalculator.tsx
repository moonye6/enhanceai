'use client';

import { useState } from 'react';

interface Props {
  enhanceaiPerUpscale: number;
  competitorName: string;
  competitorPrice: string;
  competitorPriceUnit: 'one-time' | 'monthly' | 'yearly' | 'free';
  competitorPerUpscale: number;
}

/**
 * Cost-per-upscale calculator. Lets visitors slide their monthly volume
 * and see honest break-even math.
 *
 * For one-time competitors (e.g. Gigapixel $99): amortizes over 24 months.
 * For monthly (e.g. Let's Enhance): straight per-month.
 */
export function PriceCalculator({
  enhanceaiPerUpscale,
  competitorName,
  competitorPrice,
  competitorPriceUnit,
  competitorPerUpscale,
}: Props) {
  const [volume, setVolume] = useState(20);

  const enhanceaiMonthlyCost = volume * enhanceaiPerUpscale;

  let competitorMonthlyCost: number;
  if (competitorPriceUnit === 'one-time') {
    const priceNum = parseFloat(competitorPrice.replace(/[^0-9.]/g, '')) || 0;
    competitorMonthlyCost = priceNum / 24; // amortize over 2 years
  } else if (competitorPriceUnit === 'yearly') {
    const priceNum = parseFloat(competitorPrice.replace(/[^0-9.]/g, '')) || 0;
    competitorMonthlyCost = priceNum / 12;
  } else if (competitorPriceUnit === 'monthly') {
    competitorMonthlyCost = competitorPerUpscale > 0
      ? volume * competitorPerUpscale
      : parseFloat(competitorPrice.replace(/[^0-9.]/g, '')) || 0;
  } else {
    competitorMonthlyCost = 0;
  }

  const winner = enhanceaiMonthlyCost < competitorMonthlyCost
    ? 'enhanceai'
    : enhanceaiMonthlyCost > competitorMonthlyCost
    ? 'competitor'
    : 'tie';

  return (
    <div className="surface p-6">
      <label className="block mb-4">
        <div
          className="flex justify-between items-baseline mb-2"
        >
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Upscales per month
          </span>
          <span
            className="text-2xl"
            data-mono
            style={{ color: 'var(--text)' }}
          >
            {volume}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="500"
          step="1"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--brand)' }}
        />
        <div
          className="flex justify-between text-xs mt-1"
          data-mono
          style={{ color: 'var(--text-faint)' }}
        >
          <span>1</span>
          <span>100</span>
          <span>500</span>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div
          className="p-4 rounded-md"
          style={{
            background: winner === 'enhanceai' ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
            border:
              winner === 'enhanceai'
                ? '1px solid var(--brand)'
                : '1px solid var(--border)',
          }}
        >
          <div
            className="text-xs uppercase tracking-wider mb-1"
            data-mono
            style={{ color: 'var(--brand)' }}
          >
            EnhanceAI
          </div>
          <div
            className="text-2xl mb-1"
            data-mono
            style={{ color: 'var(--text)' }}
          >
            ${enhanceaiMonthlyCost.toFixed(2)}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            per month
          </div>
        </div>

        <div
          className="p-4 rounded-md"
          style={{
            background: winner === 'competitor' ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
            border:
              winner === 'competitor'
                ? '1px solid var(--brand)'
                : '1px solid var(--border)',
          }}
        >
          <div
            className="text-xs uppercase tracking-wider mb-1"
            data-mono
            style={{ color: 'var(--text-faint)' }}
          >
            {competitorName}
          </div>
          <div
            className="text-2xl mb-1"
            data-mono
            style={{ color: 'var(--text)' }}
          >
            ${competitorMonthlyCost.toFixed(2)}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {competitorPriceUnit === 'one-time'
              ? 'amortized over 24 mo'
              : `per month (${competitorPriceUnit})`}
          </div>
        </div>
      </div>

      {winner !== 'tie' && (
        <p
          className="text-sm mt-4"
          style={{ color: 'var(--text-muted)' }}
        >
          At {volume} upscales/month, <strong style={{ color: 'var(--text)' }}>
            {winner === 'enhanceai' ? 'EnhanceAI' : competitorName}
          </strong>{' '}
          costs ${Math.abs(enhanceaiMonthlyCost - competitorMonthlyCost).toFixed(2)} less per month.
        </p>
      )}
    </div>
  );
}
