import type { RwaSubmitInput } from '@/types/api.types';

const STORAGE_KEY = 'observatory-rwa-focus';

export interface ObservatoryFocus {
  rwaId: string;
  preview?: RwaSubmitInput;
}

export function setObservatoryFocus(rwaId: string, preview?: RwaSubmitInput): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ rwaId, preview }));
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
