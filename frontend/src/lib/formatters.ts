export function motesToCspr(motes: string | number): number {
  return Number(motes) / 1_000_000_000;
}

export function formatCSPR(motes: string | number, decimals = 2): string {
  try {
    const value = motesToCspr(motes);
    return `${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} CSPR`;
  } catch {
    return '0.00 CSPR';
  }
}

export function formatAddress(hash: string, chars = 6): string {
  if (!hash) return '';
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Normalize agent confidence (0–1 float or 0–100 int) to 0–100 for display. */
export function confidenceToPercent(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
}

export function formatUSD(value: number | string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

export function formatNumber(value: number | string): string {
  return Number(value).toLocaleString('en-US');
}
