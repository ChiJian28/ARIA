import { useEffect, useState } from 'react';

/** True only after the client has mounted — avoids SSR/client mismatches from browser-only APIs. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
