'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  prepareVaultDeposit,
  prepareVaultWithdraw,
  submitVaultTransaction,
} from '@/lib/api';
import { signDeployWithWallet } from '@/lib/casper';
import { sseEmitter } from '@/lib/sse';
import { useWallet } from '@/hooks/useWallet';
import { useUiStore } from '@/store/ui.store';
import { useTxStore } from '@/store/tx.store';
import type { SseEvent } from '@/types/api.types';

function formatTxError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Transaction failed';
}

/**
 * Listen for a VAULT_EVENT SSE for a specific deployHash.
 * Resolves as soon as we get any definitive result (confirmed / failed / pending-timeout).
 */
function waitForVaultConfirmation(
  deployHash: string,
  timeoutMs = 360_000,
): Promise<{ success: boolean; pending?: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;

    const settle = (result: { success: boolean; pending?: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      sseEmitter.off('VAULT_EVENT', handler);
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(
      () => settle({ success: false, pending: true }),
      timeoutMs,
    );

    const handler = (event: SseEvent) => {
      const d = event.data as Record<string, unknown> | undefined;
      if (!d || d.deployHash !== deployHash) return;
      const eventName = d.event as string | undefined;
      if (!eventName) return;

      if (eventName.endsWith('_confirmed')) {
        settle({ success: true });
      } else if (eventName.endsWith('_failed')) {
        settle({ success: false, error: (d.error as string) ?? 'On-chain execution failed' });
      } else if (eventName.endsWith('_pending')) {
        // Backend polled but still unconfirmed — treat as submitted/pending
        settle({ success: false, pending: true });
      }
    };

    sseEmitter.on('VAULT_EVENT', handler);
  });
}

export function useTransaction() {
  const { address, canSign } = useWallet();
  const { addToast } = useUiStore();
  const queryClient = useQueryClient();
  const { addTx, confirmTx, failTx } = useTxStore();

  const invalidateVault = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['vault-position'] });
    queryClient.invalidateQueries({ queryKey: ['vault-stats'] });
  }, [queryClient]);

  const deposit = useCallback(
    async (amountMotes: string) => {
      if (!address) throw new Error('Connect wallet first');
      if (!canSign)
        throw new Error('On-chain deposits require the Casper Wallet browser extension');

      const activeToasts: string[] = [];
      const showPending = (msg: string) => {
        const id = addToast({ type: 'pending', message: msg });
        activeToasts.push(id);
        return id;
      };
      const { removeToast } = useUiStore.getState();
      const clearPending = () => {
        activeToasts.forEach((id) => removeToast(id));
        activeToasts.length = 0;
      };

      try {
        showPending('Preparing deposit…');
        const prepared = await prepareVaultDeposit(address, amountMotes);

        clearPending();
        showPending('Sign in Casper Wallet…');
        const signedDeploy = await signDeployWithWallet(prepared.unsignedDeploy, address);

        clearPending();
        showPending('Submitting to testnet…');
        const result = await submitVaultTransaction({
          signedDeploy,
          address,
          operation: 'deposit',
          amountMotes,
          estimatedLpTokens: prepared.estimatedLpTokens,
        });

        clearPending();

        // ── Register in global tx tracker + optimistic store ──────────────
        const explorerUrl = `https://testnet.cspr.live/deploy/${result.deployHash}`;
        addTx({
          deployHash: result.deployHash,
          operation: 'deposit',
          amountMotes,
          estimatedLpTokens: prepared.estimatedLpTokens,
          explorerUrl,
        });

        // ── Background: wait for on-chain confirmation via SSE ────────────
        waitForVaultConfirmation(result.deployHash).then(({ success, pending, error }) => {
          if (success) {
            confirmTx(result.deployHash);
            invalidateVault();
            addToast({ type: 'success', message: 'Deposit confirmed on-chain!' });
          } else if (pending) {
            // Still on the network — tracker shows it as pending; don't fail it
            addToast({
              type: 'info',
              message: `Deposit submitted — track at testnet.cspr.live/deploy/${result.deployHash.slice(0, 10)}…`,
            });
          } else {
            failTx(result.deployHash, error);
            addToast({
              type: 'error',
              message: error ?? 'Deposit may have failed — check your wallet history',
            });
          }
        });

        return result;
      } catch (err) {
        clearPending();
        throw new Error(formatTxError(err));
      }
    },
    [address, canSign, addToast, addTx, confirmTx, failTx, invalidateVault],
  );

  const withdraw = useCallback(
    async (lpTokenAmountMotes: string) => {
      if (!address) throw new Error('Connect wallet first');
      if (!canSign)
        throw new Error('On-chain withdrawals require the Casper Wallet browser extension');

      const activeToasts: string[] = [];
      const showPending = (msg: string) => {
        const id = addToast({ type: 'pending', message: msg });
        activeToasts.push(id);
        return id;
      };
      const { removeToast } = useUiStore.getState();
      const clearPending = () => {
        activeToasts.forEach((id) => removeToast(id));
        activeToasts.length = 0;
      };

      try {
        showPending('Preparing withdrawal…');
        const prepared = await prepareVaultWithdraw(address, lpTokenAmountMotes);

        clearPending();
        showPending('Sign in Casper Wallet…');
        const signedDeploy = await signDeployWithWallet(prepared.unsignedDeploy, address);

        clearPending();
        showPending('Submitting to testnet…');
        const result = await submitVaultTransaction({
          signedDeploy,
          address,
          operation: 'withdraw',
          lpTokenAmountMotes,
          estimatedCspr: prepared.estimatedCspr,
        });

        clearPending();

        const explorerUrl = `https://testnet.cspr.live/deploy/${result.deployHash}`;
        addTx({
          deployHash: result.deployHash,
          operation: 'withdraw',
          amountMotes: lpTokenAmountMotes,
          estimatedCspr: prepared.estimatedCspr,
          explorerUrl,
        });

        waitForVaultConfirmation(result.deployHash).then(({ success, pending, error }) => {
          if (success) {
            confirmTx(result.deployHash);
            invalidateVault();
            addToast({ type: 'success', message: 'Withdrawal confirmed on-chain!' });
          } else if (pending) {
            addToast({
              type: 'info',
              message: `Withdrawal submitted — track at testnet.cspr.live/deploy/${result.deployHash.slice(0, 10)}…`,
            });
          } else {
            failTx(result.deployHash, error);
            addToast({
              type: 'error',
              message: error ?? 'Withdrawal may have failed — check your wallet history',
            });
          }
        });

        return result;
      } catch (err) {
        clearPending();
        throw new Error(formatTxError(err));
      }
    },
    [address, canSign, addToast, addTx, confirmTx, failTx, invalidateVault],
  );

  return { deposit, withdraw, canSign };
}
