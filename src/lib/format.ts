export function timeAgo(iso?: string | null) {
  if (!iso) return 'just now';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [secs, name] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return n + ' ' + name + (n > 1 ? 's' : '') + ' ago';
  }
  return 'just now';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function formatPrivacyCount(count: number, threshold = 3): string {
  if (!Number.isFinite(count) || count < 0) {
    throw new RangeError('Count must be a non-negative finite number.');
  }
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new RangeError('Privacy threshold must be a positive integer.');
  }
  return count < threshold ? `Fewer than ${threshold}` : count.toLocaleString();
}
