import { create } from 'zustand';

export type TxStatus = 'pending' | 'confirmed' | 'failed';

export interface VaultTx {
  deployHash: string;
  operation: 'deposit' | 'withdraw';
  /** CSPR in motes (deposit amount or implied CSPR for withdraw) */
  amountMotes: string;
  estimatedLpTokens?: string;
  estimatedCspr?: string;
  /** Unix ms when backend accepted the deploy */
  submittedAt: number;
  status: TxStatus;
  explorerUrl: string;
  errorMessage?: string;
}

interface TxState {
  txs: VaultTx[];
  addTx: (tx: Omit<VaultTx, 'submittedAt' | 'status'>) => void;
  confirmTx: (deployHash: string) => void;
  failTx: (deployHash: string, errorMessage?: string) => void;
  dismissTx: (deployHash: string) => void;
  /** Sum of pending deposit estimatedLpTokens (in motes string) for optimistic balance */
  getPendingLpMotes: () => bigint;
}

export const useTxStore = create<TxState>((set, get) => ({
  txs: [],

  addTx: (tx) =>
    set((s) => ({
      txs: [
        ...s.txs,
        { ...tx, submittedAt: Date.now(), status: 'pending' },
      ],
    })),

  confirmTx: (deployHash) =>
    set((s) => ({
      txs: s.txs.map((t) =>
        t.deployHash === deployHash ? { ...t, status: 'confirmed' } : t,
      ),
    })),

  failTx: (deployHash, errorMessage) =>
    set((s) => ({
      txs: s.txs.map((t) =>
        t.deployHash === deployHash ? { ...t, status: 'failed', errorMessage } : t,
      ),
    })),

  // Auto-remove after caller decides (e.g., 3s after confirmed)
  dismissTx: (deployHash) =>
    set((s) => ({ txs: s.txs.filter((t) => t.deployHash !== deployHash) })),

  getPendingLpMotes: () => {
    const pending = get().txs.filter(
      (t) => t.status === 'pending' && t.operation === 'deposit' && t.estimatedLpTokens,
    );
    return pending.reduce((sum, t) => sum + BigInt(t.estimatedLpTokens!), 0n);
  },
}));
