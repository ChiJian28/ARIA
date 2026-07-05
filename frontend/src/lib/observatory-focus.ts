import type { RwaSubmitInput } from '@/types/api.types';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'observatory-rwa-focus';

export interface ObservatoryFocus {
  rwaId: string;
  preview?: RwaSubmitInput;
}

export function setObservatoryFocus(rwaId: string, preview?: RwaSubmitInput): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ rwaId, preview }));
}

export function clearObservatoryFocus(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getObservatoryFocus(): ObservatoryFocus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ObservatoryFocus;
  } catch {
    return null;
  }
}

export function readObservatoryPreview(rwaId: string): RwaSubmitInput | undefined {
  const focus = getObservatoryFocus();
  if (focus?.rwaId === rwaId) return focus.preview;
  return undefined;
}

/** Session preview — only available after client mount (sessionStorage is not on the server). */
export function useObservatoryPreview(rwaId: string | null | undefined): RwaSubmitInput | undefined {
  const [preview, setPreview] = useState<RwaSubmitInput | undefined>(undefined);

  useEffect(() => {
    setPreview(rwaId ? readObservatoryPreview(rwaId) : undefined);
  }, [rwaId]);

  return preview;
}
