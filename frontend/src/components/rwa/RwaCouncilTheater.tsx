'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { XCircle, ExternalLink } from 'lucide-react';
import { CouncilTheaterAgentNode } from '@/components/agents/CouncilTheaterAgentNode';
import { ConsensusProgress } from '@/components/agents/ConsensusProgress';
import { NftPreviewCard } from '@/components/rwa/NftPreviewCard';
import { useRwaCouncilSession } from '@/hooks/useRwaCouncilSession';
import { useRwa } from '@/hooks/useRwa';
import { useUiStore } from '@/store/ui.store';
import { councilCardClimax, councilHandoffEnter, nftClimaxReveal } from '@/lib/animations';
import { COUNCIL_THEATER_AGENT_IDS, COUNCIL_VOTING_COUNT } from '@/lib/constants';
import { deriveCouncilOutcome } from '@/lib/council-display';
import { cn } from '@/lib/cn';
import type { RwaSubmitInput, RwaDetail } from '@/types/api.types';

const THEATER_AGENTS = COUNCIL_THEATER_AGENT_IDS.map((id) => ({
  id,
  isVoter: id !== 'orchestrator',
}));

const GRID_SLOTS = [
  'col-start-1 row-start-1',
  'col-start-3 row-start-1',
  'col-start-1 row-start-3',
  'col-start-3 row-start-3',
];

interface RwaCouncilTheaterProps {
  rwaId: string;
  preview?: RwaSubmitInput;
  embedded?: boolean;
  onViewDetail?: (rwaId: string) => void;
}

function ViewDetailButton({
  rwaId,
  onViewDetail,
  className,
}: {
  rwaId: string;
  onViewDetail?: (rwaId: string) => void;
  className?: string;
}) {
  if (!onViewDetail) return null;
  return (
    <button
      type="button"
      onClick={() => onViewDetail(rwaId)}
      className={cn(
        'inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-semibold',
        'bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 transition-colors',
        className,
      )}
    >
      <ExternalLink className="w-3.5 h-3.5" />
      View detail
    </button>
  );
}

export function RwaCouncilTheater({
  rwaId,
  preview,
  embedded = false,
  onViewDetail,
}: RwaCouncilTheaterProps) {
  const session = useRwaCouncilSession(rwaId);
  const { data: rwa } = useRwa(rwaId);
  const { addToast } = useUiStore();
  const toastFiredRef = useRef(false);

  const councilOutcome = deriveCouncilOutcome(
    Object.entries(session.votes).map(([agentId, v]) => ({
      agentId,
      vote: v.vote,
      confidence: v.confidence ?? 0,
      reasoning: '',
      txHash: v.txHash ?? null,
      votedAt: '',
    })),
    rwa?.status,
    {
      nftTokenId: rwa?.nftTokenId,
      mintTxHash: rwa?.mintTxHash,
      finalDecisionMemo: rwa?.finalDecisionMemo ?? session.verdictMemo,
    },
  );
  const councilApproved = session.approved || councilOutcome.councilApproved;
  const showClimax = session.climax;
  const hasOnChainMint = Boolean(rwa?.mintTxHash || rwa?.nftTokenId || session.nftMinted);
  const showNft = showClimax && councilApproved && !councilOutcome.mintPending && hasOnChainMint;
  const showRejection = showClimax && !councilApproved;
  const showMintPending = showClimax && councilApproved && councilOutcome.mintPending;

  useEffect(() => {
    if (!session.climax || toastFiredRef.current) return;
    toastFiredRef.current = true;

    if (councilApproved) {
      addToast({
        type: councilOutcome.mintPending ? 'info' : 'success',
        message: councilOutcome.mintPending
          ? 'Council approved · NFT mint pending (on-chain step failed)'
          : 'Council approved · CEP-78 RWA NFT minted on Casper testnet',
      });
    } else {
      addToast({
        type: 'error',
        message: 'Council rejected this RWA submission',
      });
    }
  }, [session.climax, councilApproved, councilOutcome.mintPending, addToast]);

  const votingApproves = THEATER_AGENTS.filter((a) => a.isVoter).filter(
    (a) => session.votes[a.id]?.vote === 'APPROVE',
  ).length;

  const nftRwa = rwa ?? (preview
    ? {
        id: rwaId,
        ownerPublicKey: preview.ownerPublicKey,
        assetType: preview.assetType,
        faceValue: preview.faceValue,
        currency: preview.currency,
        status: councilApproved ? ('APPROVED' as RwaDetail['status']) : ('REJECTED' as RwaDetail['status']),
        riskScore: null,
        createdAt: new Date().toISOString(),
        maturityDate: preview.maturityDate,
        counterpartyName: preview.counterpartyName,
        counterpartyJurisdiction: preview.counterpartyJurisdiction,
        description: preview.description,
        collateralRatio: null,
        nftTokenId: null,
        mintTxHash: null,
        votes: [],
      }
    : null);

  const gridMinHeight = embedded ? 'min-h-[380px]' : 'min-h-[440px]';

  return (
    <motion.div
      variants={embedded ? undefined : councilHandoffEnter}
      initial={embedded ? false : 'hidden'}
      animate={embedded ? undefined : 'visible'}
      className={cn('relative', embedded ? 'w-full' : 'max-w-3xl mx-auto')}
    >
      {!embedded && (
        <div className="text-center mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400 mb-1">
            Agent Council Live
          </p>
          <h2 className="text-xl font-bold text-text-primary">Evaluating your RWA</h2>
          <p className="text-sm text-text-secondary mt-1 font-mono">{rwaId.slice(0, 8)}…</p>
        </div>
      )}

      <div className="relative">
        {showNft && nftRwa && (
          <motion.div
            variants={nftClimaxReveal}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto"
            style={{ perspective: '800px' }}
          >
            <div className="w-full max-w-sm text-center">
              <NftPreviewCard rwa={nftRwa} holographic />
              <ViewDetailButton rwaId={rwaId} onViewDetail={onViewDetail} />
            </div>
          </motion.div>
        )}

        {showMintPending && (
          <motion.div
            variants={nftClimaxReveal}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 z-20 flex items-center justify-center px-4 pointer-events-auto"
          >
            <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/80 via-bg-card to-bg-card p-6 shadow-2xl shadow-amber-500/10 text-center">
              <h3 className="text-lg font-bold text-text-primary mb-1">Council Approved ✓</h3>
              <p className="text-sm text-amber-400 mb-3">NFT mint pending</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                All agents voted approve. On-chain CEP-78 mint failed — council decision stands.
              </p>
              <ViewDetailButton rwaId={rwaId} onViewDetail={onViewDetail} />
            </div>
          </motion.div>
        )}

        {showRejection && (
          <motion.div
            variants={nftClimaxReveal}
            initial="hidden"
            animate="visible"
            className="absolute inset-0 z-20 flex items-center justify-center px-4 pointer-events-auto"
          >
            <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/80 via-bg-card to-bg-card p-6 shadow-2xl shadow-red-500/10 text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-text-primary mb-1">Council Rejected</h3>
              <p className="text-sm text-text-secondary mb-2 leading-relaxed">
                {session.verdictMemo ??
                  'Specialist agents could not reach approval thresholds. No NFT was minted.'}
              </p>
              <ViewDetailButton rwaId={rwaId} onViewDetail={onViewDetail} />
            </div>
          </motion.div>
        )}

        <div
          className={cn(
            'grid grid-cols-3 grid-rows-3 gap-3',
            gridMinHeight,
            showClimax && 'opacity-50 pointer-events-none',
          )}
        >
          <div className="col-start-2 row-start-2 flex items-center justify-center">
            <ConsensusProgress
              approveCount={votingApproves}
              total={COUNCIL_VOTING_COUNT}
              consensusReached={session.consensusReached}
              approved={session.approved}
            />
          </div>

          {THEATER_AGENTS.map((agent, i) => {
            const orbState = session.agentStates[agent.id] ?? 'idle';
            const vote = session.votes[agent.id];

            return (
              <motion.div
                key={agent.id}
                custom={i}
                variants={councilCardClimax}
                animate={showClimax ? 'exit' : 'active'}
                className={GRID_SLOTS[i]}
              >
                <CouncilTheaterAgentNode
                  agentId={agent.id}
                  orbState={orbState}
                  vote={vote?.vote}
                  terminalLines={session.agentLogs[agent.id] ?? []}
                  compact={embedded}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {session.consensusReached && !showClimax && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-violet-400 mt-4"
        >
          {session.approved ? 'Minting CEP-78 NFT on-chain…' : 'Finalizing council verdict…'}
        </motion.p>
      )}
    </motion.div>
  );
}
