'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { useWallet } from '@/hooks/useWallet';
import { useRwas } from '@/hooks/useRwa';
import { RwaList } from '@/components/rwa/RwaList';
import { LpPositionCard } from '@/components/vault/LpPositionCard';
import { cn } from '@/lib/cn';

type Tab = 'rwas' | 'vault';

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>('rwas');
  const { address, isConnected } = useWallet();
  const { data: rwas, isLoading } = useRwas({ owner: address ?? undefined });

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>

      {!isConnected && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-400 text-sm">
          Connect your wallet to view your portfolio
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-bg-card p-1 w-fit">
        {(['rwas', 'vault'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t === 'rwas' ? 'My RWAs' : 'Vault Position'}
          </button>
        ))}
      </div>

      {tab === 'rwas' && (
        <RwaList rwas={rwas ?? []} isLoading={isLoading} />
      )}

      {tab === 'vault' && <LpPositionCard />}
    </motion.div>
  );
}
