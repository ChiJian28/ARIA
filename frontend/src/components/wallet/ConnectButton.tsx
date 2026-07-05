'use client';

import { useState } from 'react';
import { Wallet, ChevronDown, ExternalLink, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore } from '@/store/wallet.store';
import { formatAddress } from '@/lib/formatters';
import { EXPLORER_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function ConnectButton() {
  const { address, isConnecting, connect, disconnect, isConnected } = useWallet();
  const [open, setOpen] = useState(false);

  if (!isConnected) {
    return (
      <Button size="sm" onClick={connect} disabled={isConnecting}>
        <Wallet className="w-3.5 h-3.5" />
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-violet-500/30 bg-bg-elevated px-3 py-2 text-sm text-text-primary hover:border-violet-500/60 transition-colors',
        )}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="font-mono">{formatAddress(address!, 5)}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-secondary transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-violet-500/20 bg-bg-surface shadow-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-violet-500/[0.12]">
              <p className="text-xs text-text-secondary mb-1">Connected account</p>
              <p className="font-mono text-xs text-text-primary break-all">{address}</p>
            </div>
            <div className="p-2 space-y-1">
              <a
                href={`${EXPLORER_URL}/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Explorer
              </a>
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
