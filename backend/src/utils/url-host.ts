export function parseUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when hostname is exactly `domain` or a subdomain of it (not a suffix trick). */
export function hostnameBelongsToDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  const root = domain.toLowerCase();
  return host === root || host.endsWith(`.${root}`);
}

export function urlHostnameBelongsTo(url: string, domain: string): boolean {
  const hostname = parseUrlHostname(url);
  return hostname !== null && hostnameBelongsToDomain(hostname, domain);
}

export function urlHasQueryParam(url: string, key: string, value: string): boolean {
  try {
    return new URL(url).searchParams.get(key) === value;
  } catch {
    return false;
  }
}

export function isPlaceholderProviderUrl(url: string | undefined): boolean {
  if (!url) return true;

  const hostname = parseUrlHostname(url);
  if (!hostname) return true;

  if (hostnameBelongsToDomain(hostname, 'example.com')) return true;

  const firstLabel = hostname.split('.')[0];
  return firstLabel === 'mock' || hostname.startsWith('mock.');
}
