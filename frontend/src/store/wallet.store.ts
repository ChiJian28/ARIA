import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  canSign: boolean;
  network: string;
  setAddress: (address: string | null) => void;
  setBalance: (balance: string | null) => void;
  setConnecting: (v: boolean) => void;
  setCanSign: (v: boolean) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      balance: null,
      isConnecting: false,
      canSign: false,
      network: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'casper-test',
      setAddress: (address) => set({ address }),
      setBalance: (balance) => set({ balance }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setCanSign: (canSign) => set({ canSign }),
    }),
    {
      name: 'aria-wallet',
      partialize: (state) => ({
        address: state.address,
        network: state.network,
        canSign: state.canSign,
      }),
    },
  ),
);
