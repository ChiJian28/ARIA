'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from '@/store/wallet.store';
import { X, Wallet, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CasperWalletInstance } from '@/lib/casper';

interface WalletContextValue {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  canSign: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  balance: null,
  isConnecting: false,
  canSign: false,
  connect: async () => {},
  disconnect: () => {},
});

function ConnectModal({ onClose, onConnect }: {
  onClose: () => void;
  onConnect: (address: string, canSign: boolean) => void;
}) {
  const [manualKey, setManualKey] = useState('');
  const [tryingExtension, setTryingExtension] = useState(false);
  const hasExtension = typeof window !== 'undefined' && !!window.CasperWalletProvider;

  const connectExtension = async () => {
    if (!window.CasperWalletProvider) return;
    setTryingExtension(true);
    try {
      const provider = window.CasperWalletProvider();
      await provider.requestConnection();
      const key = await provider.getActivePublicKey();
      if (key) { onConnect(key, true); onClose(); }
    } catch {
      // extension rejected or not available
    } finally {
      setTryingExtension(false);
    }
  };

  const connectManual = () => {
    const key = manualKey.trim();
    if (key.length >= 20) { onConnect(key, false); onClose(); }
  };

  const connectDemo = () => {
    // Use the deployer key from memory.txt as demo address
    onConnect('01016126bc3A5d205B3C84871ccbeebb4FCD69B1745da5B00D29216d0565BB322029', false);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 rounded-2xl bg-bg-surface border border-violet-500/30 shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-semibold text-text-primary">Connect Wallet</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Casper Wallet Extension */}
          <button
            onClick={connectExtension}
            disabled={tryingExtension}
            className="w-full flex items-center gap-3 rounded-xl border border-violet-500/30 bg-bg-card p-4 text-left hover:border-violet-500/60 hover:bg-bg-card-hover transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              CW
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Casper Wallet</p>
              <p className="text-xs text-text-secondary">
                {hasExtension ? 'Extension detected' : 'Install extension first'}
              </p>
            </div>
            {!hasExtension && (
              <a
                href="https://www.casperwallet.io/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-sky-400 hover:text-sky-300 whitespace-nowrap"
              >
                Install →
              </a>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-violet-500/20" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-violet-500/20" />
          </div>

          {/* Manual public key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-text-muted" />
              <span className="text-xs text-text-secondary">Enter public key manually</span>
            </div>
            <Input
              placeholder="01016126bc3a… (Casper public key)"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              className="text-xs font-mono"
            />
            <Button
              onClick={connectManual}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={manualKey.trim().length < 20}
            >
              Connect with Key
            </Button>
          </div>

          {/* Demo mode */}
          <button
            onClick={connectDemo}
            className="w-full text-xs text-text-muted hover:text-violet-400 py-2 transition-colors border-t border-violet-500/[0.12] mt-1"
          >
            Use demo address (testnet deployer)
          </button>
        </div>
      </motion.div>
    </>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, balance, isConnecting, canSign, setAddress, setBalance, setConnecting, setCanSign } = useWalletStore();
  const [showModal, setShowModal] = useState(false);

  // Listen for Casper Wallet extension events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConnected = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.activeKey) {
        setAddress(detail.activeKey);
        setCanSign(true);
      }
    };
    const onDisconnected = () => {
      setAddress(null);
      setCanSign(false);
    };
    const onKeyChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.activeKey) {
        setAddress(detail.activeKey);
        setCanSign(true);
      }
    };

    window.addEventListener('casper-wallet:connected', onConnected);
    window.addEventListener('casper-wallet:disconnected', onDisconnected);
    window.addEventListener('casper-wallet:activeKeyChanged', onKeyChanged);
    // Also listen for legacy event name
    window.addEventListener('csprclick:activeKeyChanged', onKeyChanged);

    return () => {
      window.removeEventListener('casper-wallet:connected', onConnected);
      window.removeEventListener('casper-wallet:disconnected', onDisconnected);
      window.removeEventListener('casper-wallet:activeKeyChanged', onKeyChanged);
      window.removeEventListener('csprclick:activeKeyChanged', onKeyChanged);
    };
  }, [setAddress, setCanSign]);

  const connect = async () => {
    setShowModal(true);
  };

  const disconnect = () => {
    if (typeof window !== 'undefined' && window.CasperWalletProvider) {
      try { window.CasperWalletProvider().disconnectFromSite(); } catch { /* ignore */ }
    }
    setAddress(null);
    setBalance(null);
    setCanSign(false);
  };

  const handleConnect = (nextAddress: string, nextCanSign: boolean) => {
    setAddress(nextAddress);
    setCanSign(nextCanSign);
  };

  return (
    <WalletContext.Provider value={{ address, balance, isConnecting, canSign, connect, disconnect }}>
      {children}
      <AnimatePresence>
        {showModal && (
          <ConnectModal onClose={() => setShowModal(false)} onConnect={handleConnect} />
        )}
      </AnimatePresence>
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => useContext(WalletContext);
