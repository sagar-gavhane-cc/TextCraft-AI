/** Base sampling temperature by rephrase mode (before tone adjustment). */
const MODE_BASE_TEMPERATURE = {
  shorten: 0.4,
  simplify: 0.4,
  detail: 0.45,
  improve: 0.6
};

const DEFAULT_BASE = 0.6;
const MIN_TEMPERATURE = 0.2;
const MAX_TEMPERATURE = 0.85;

/**
 * Sampling temperature for rephrase requests: lower for shorten/simplify/detail,
 * slightly higher for improve; friendly/exciting tones get a small bump (capped).
 * @param {string} mode - Rephrasing mode
 * @param {string} tone - Tone of voice
 * @returns {number}
 */
export function getRephraseTemperature(mode, tone) {
  const base = MODE_BASE_TEMPERATURE[mode] ?? DEFAULT_BASE;
  let delta = 0;
  if (tone === 'exciting') delta += 0.12;
  else if (tone === 'friendly') delta += 0.08;

  const raw = base + delta;
  return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, raw));
}
