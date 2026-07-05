'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useTxStore, type VaultTx } from '@/store/tx.store';
import { cn } from '@/lib/cn';

// ─── Step timing ────────────────────────────────────────────────────────────
const BLOCK_PROPOSAL_MS = 45_000; // step 2 spins for ~45s

type TxStep = 0 | 1 | 2 | 3;

function getTxStep(tx: VaultTx, now: number): TxStep {
  if (tx.status === 'confirmed') return 3;
  if (tx.status === 'failed') return 2; // freeze at finality if failed
  const elapsed = now - tx.submittedAt;
  if (elapsed < BLOCK_PROPOSAL_MS) return 1;
  return 2;
}

// ─── Single step row ────────────────────────────────────────────────────────
const STEPS = (op: 'deposit' | 'withdraw') => [
  'Broadcasted',
  'Block Proposal',
  'Finality',
  op === 'deposit' ? 'LP Tokens Minted' : 'CSPR Returned',
];

function StepRow({
  label,
  index,
  currentStep,
  failed,
}: {
  label: string;
  index: number;
  currentStep: TxStep;
  failed: boolean;
}) {
  const done = index < currentStep;
  const active = index === currentStep;
  const failedHere = failed && index === currentStep;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
          done && 'bg-emerald-500/20 border border-emerald-500/50',
          active && !failedHere && 'bg-amber-500/15 border border-amber-500/40',
          failedHere && 'bg-red-500/15 border border-red-500/40',
          !done && !active && 'bg-bg-elevated border border-violet-500/15',
        )}
      >
        {done ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        ) : failedHere ? (
          <XCircle className="w-3 h-3 text-red-400" />
        ) : active ? (
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
        ) : (
          <span className="text-[9px] text-text-muted font-semibold">{index + 1}</span>
        )}
      </div>
      <span
        className={cn(
          'text-xs',
          done && 'text-emerald-400',
          active && !failedHere && 'text-amber-300',
          failedHere && 'text-red-400',
          !done && !active && 'text-text-muted',
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Single tx card ──────────────────────────────────────────────────────────
function TxCard({ tx, now }: { tx: VaultTx; now: number }) {
  const step = getTxStep(tx, now);
  const steps = STEPS(tx.operation);
  const { dismissTx } = useTxStore();

  const amountCspr = (Number(tx.amountMotes) / 1e9).toFixed(2);
  const label = tx.operation === 'deposit'
    ? `Deposit ${amountCspr} CSPR`
    : `Withdraw ${(Number(tx.estimatedCspr ?? tx.amountMotes) / 1e9).toFixed(2)} CSPR`;

  useEffect(() => {
    if (tx.status === 'confirmed' || tx.status === 'failed') {
      const t = setTimeout(() => dismissTx(tx.deployHash), 6_000);
      return () => clearTimeout(t);
    }
  }, [tx.status, tx.deployHash, dismissTx]);

  return (
    <div className="rounded-lg border border-violet-500/12 bg-bg-elevated p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-primary truncate">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {tx.status === 'confirmed' && (
            <span className="text-[10px] text-emerald-400 font-medium">Confirmed</span>
          )}
          {tx.status === 'failed' && (
            <span className="text-[10px] text-red-400 font-medium">Failed</span>
          )}
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-sky-400 transition-colors"
            title="View on testnet explorer"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-1.5 pl-0.5">
        {steps.map((label, i) => (
          <StepRow
            key={label}
            label={label}
            index={i}
            currentStep={step}
            failed={tx.status === 'failed'}
          />
        ))}
      </div>

      {/* Hash + elapsed */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[10px] font-mono text-text-muted">{tx.deployHash.slice(0, 12)}…</span>
        <ElapsedTimer submittedAt={tx.submittedAt} done={tx.status !== 'pending'} />
      </div>

      {tx.status === 'failed' && tx.errorMessage && (
        <p className="text-[10px] text-red-400/80 mt-1 leading-snug">{tx.errorMessage}</p>
      )}
    </div>
  );
}

function ElapsedTimer({ submittedAt, done }: { submittedAt: number; done: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed(Date.now() - submittedAt), 1000);
    return () => clearInterval(t);
  }, [submittedAt, done]);

  const s = Math.floor((done ? 0 : elapsed) / 1000);
  if (s === 0 && done) return null;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className="text-[10px] text-text-muted tabular-nums">{mm}:{ss}</span>;
}

// ─── Main GlobalTxTracker ────────────────────────────────────────────────────
export function GlobalTxTracker() {
  const txs = useTxStore((s) => s.txs);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for step advancement
  useEffect(() => {
    if (txs.every((t) => t.status !== 'pending')) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [txs]);

  const pendingCount = txs.filter((t) => t.status === 'pending').length;
  const hasAny = txs.length > 0;

  if (!hasAny) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="relative flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
          {pendingCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          )}
          {pendingCount > 0 ? `${pendingCount} Pending` : 'Transactions'}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-50 w-80 rounded-xl border border-violet-500/15 bg-bg-surface shadow-2xl shadow-black/40',
            'outline-none',
          )}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-3 space-y-2"
            >
              <p className="text-xs font-semibold text-text-secondary px-0.5 pb-1 border-b border-violet-500/10">
                Transaction Activity
              </p>
              {txs.map((tx) => (
                <TxCard key={tx.deployHash} tx={tx} now={now} />
              ))}
            </motion.div>
          </AnimatePresence>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
