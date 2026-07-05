import { create } from 'zustand';
import type { RwaSummary, RwaSubmitInput } from '@/types/api.types';

interface RwaState {
  myRwas: RwaSummary[];
  draft: Partial<RwaSubmitInput>;
  setMyRwas: (rwas: RwaSummary[]) => void;
  updateDraft: (patch: Partial<RwaSubmitInput>) => void;
  clearDraft: () => void;
}

export const useRwaStore = create<RwaState>((set) => ({
  myRwas: [],
  draft: {},
  setMyRwas: (myRwas) => set({ myRwas }),
  updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  clearDraft: () => set({ draft: {} }),
}));
