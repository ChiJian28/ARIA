'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUiStore } from '@/store/ui.store';
import { useWallet } from '@/hooks/useWallet';
import { useTransaction } from '@/hooks/useTransaction';

export function DepositPanel() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { address, isConnected, canSign } = useWallet();
  const { addToast } = useUiStore();
  const { deposit } = useTransaction();

  const handleDeposit = async () => {
    if (!address || !amount) return;
    setLoading(true);
    try {
      const motes = String(Math.round(parseFloat(amount) * 1_000_000_000));
      await deposit(motes);
      setAmount('');
    } catch (e) {
      addToast({ type: 'error', message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Deposit</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input
          label="Amount (CSPR)"
          type="number"
          placeholder="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="rounded-lg bg-bg-elevated border border-violet-500/20 p-3 text-xs space-y-1">
          <div className="flex justify-between text-text-secondary">
            <span>Estimated LP tokens</span>
            <span className="font-mono text-text-primary">{amount || '0'}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Ratio</span>
            <span className="font-mono">pro-rata</span>
          </div>
        </div>
        <Button
          size="lg"
          variant="teal"
          className="w-full"
          disabled={!amount || !isConnected || !canSign || loading}
          onClick={handleDeposit}
        >
          {loading ? 'Depositing…' : 'Deposit'}
        </Button>
        {!isConnected && (
          <p className="text-xs text-center text-amber-400">Connect wallet to deposit</p>
        )}
        {isConnected && !canSign && (
          <p className="text-xs text-center text-amber-400">
            On-chain deposits require Casper Wallet extension (demo/manual key cannot sign)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
