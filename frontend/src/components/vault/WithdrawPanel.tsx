'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUiStore } from '@/store/ui.store';
import { useWallet } from '@/hooks/useWallet';
import { useVaultPosition } from '@/hooks/useVault';
import { useTransaction } from '@/hooks/useTransaction';
import { motesToCspr } from '@/lib/formatters';

export function WithdrawPanel() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { address, isConnected, canSign } = useWallet();
  const { addToast } = useUiStore();
  const { data: position } = useVaultPosition(address);
  const { withdraw } = useTransaction();

  const maxLp = position ? motesToCspr(position.lpTokens).toFixed(2) : '0';

  const handleWithdraw = async () => {
    if (!address || !amount) return;
    setLoading(true);
    try {
      const motes = String(Math.round(parseFloat(amount) * 1_000_000_000));
      await withdraw(motes);
      setAmount('');
    } catch (e) {
      addToast({ type: 'error', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Withdraw</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>Available LP</span>
          <button onClick={() => setAmount(maxLp)} className="text-violet-400 hover:text-violet-300">Max: {maxLp}</button>
        </div>
        <Input
          label="LP Token Amount"
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="rounded-lg bg-bg-elevated border border-violet-500/20 p-3 text-xs space-y-1">
          <div className="flex justify-between text-text-secondary">
            <span>You will receive</span>
            <span className="font-mono text-text-primary">~{amount || '0'} CSPR</span>
          </div>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          disabled={!amount || !isConnected || !canSign || loading}
          onClick={handleWithdraw}
        >
          {loading ? 'Withdrawing…' : 'Withdraw'}
        </Button>
        {isConnected && !canSign && (
          <p className="text-xs text-center text-amber-400">
            On-chain withdrawals require Casper Wallet extension
          </p>
        )}
      </CardContent>
    </Card>
  );
}
