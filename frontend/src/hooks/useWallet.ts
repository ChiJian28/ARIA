'use client';

import { useWalletContext } from '@/providers/WalletProvider';

export function useWallet() {
  const ctx = useWalletContext();
  return {
    address: ctx.address,
    balance: ctx.balance,
    isConnecting: ctx.isConnecting,
    canSign: ctx.canSign,
    connect: ctx.connect,
    disconnect: ctx.disconnect,
    isConnected: !!ctx.address,
  };
}
