'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/badge';
import { AddressBadge } from '@/components/ui/address-badge';
import { NftPreviewCard } from '@/components/rwa/NftPreviewCard';
import { AgentCouncilPanel } from '@/components/agents/AgentCouncilPanel';
import { ReasoningDrawer } from '@/components/agents/ReasoningDrawer';
import { RiskScoreGauge } from '@/components/rwa/RiskScoreGauge';
import { useRwa, useRwaVotes } from '@/hooks/useRwa';
import { formatDate, formatUSD } from '@/lib/formatters';
import { explorerDeployUrl } from '@/lib/explorer';
import { deriveCouncilOutcome, effectiveRwaDisplayStatus } from '@/lib/council-display';
import type { AgentVote } from '@/types/api.types';

interface RwaDetailModalProps {
  rwaId: string | null;
  onClose: () => void;
}

export function RwaDetailModal({ rwaId, onClose }: RwaDetailModalProps) {
  const { data: rwa, isLoading } = useRwa(rwaId ?? '');
  const { data: votes } = useRwaVotes(rwaId ?? '');
  const [selectedVote, setSelectedVote] = useState<AgentVote | null>(null);

  const handleClose = () => {
    setSelectedVote(null);
    onClose();
  };

  const effectiveVotes = votes ?? rwa?.votes;
  const councilOutcome = rwa
    ? deriveCouncilOutcome(effectiveVotes, rwa.status, {
        nftTokenId: rwa.nftTokenId,
        mintTxHash: rwa.mintTxHash,
        finalDecisionMemo: rwa.finalDecisionMemo,
      })
    : null;
  const displayStatus = rwa && councilOutcome
    ? effectiveRwaDisplayStatus(rwa.status, councilOutcome)
    : rwa?.status;

  return (
    <>
      <Modal
        open={Boolean(rwaId)}
        onClose={handleClose}
        size="xl"
        title={rwa ? `${rwa.assetType.replace('_', ' ')} — RWA Detail` : 'RWA Detail'}
      >
        {isLoading && (
          <div className="p-6 space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-56" />
          </div>
        )}

        {!isLoading && !rwa && (
          <p className="p-8 text-center text-text-muted text-sm">RWA not found</p>
        )}

        {rwa && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <AddressBadge address={rwa.id} chars={8} />
                {displayStatus && <StatusBadge status={displayStatus} />}
                {councilOutcome?.mintPending && (
                  <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    NFT mint pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {rwa.mintTxHash && (
                  <a
                    href={explorerDeployUrl(rwa.mintTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mint on explorer
                  </a>
                )}
                <Link
                  href={`/rwa/${rwa.id}`}
                  className="text-xs text-violet-400 hover:text-violet-300"
                  onClick={handleClose}
                >
                  Open full page →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <NftPreviewCard rwa={rwa} />

                <div className="rounded-xl border border-violet-500/[0.12] bg-bg-card/50 p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Face Value</p>
                    <p className="font-mono text-text-primary">{formatUSD(rwa.faceValue)} {rwa.currency}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Maturity</p>
                    <p className="text-text-primary">{formatDate(rwa.maturityDate)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Issuer</p>
                    <p className="text-text-secondary text-xs">{rwa.counterpartyName}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Jurisdiction</p>
                    <p className="text-text-secondary text-xs">{rwa.counterpartyJurisdiction}</p>
                  </div>
                  {rwa.riskScore !== null && (
                    <div className="col-span-2 flex items-center gap-6">
                      <div>
                        <p className="text-text-muted text-xs mb-0.5">Risk Score</p>
                        <RiskScoreGauge score={rwa.riskScore} size={72} />
                      </div>
                      {rwa.collateralRatio !== null && (
                        <div>
                          <p className="text-text-muted text-xs mb-0.5">Collateral</p>
                          <p className="text-xl font-mono font-bold text-text-primary">
                            {(rwa.collateralRatio * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {rwa.description && (
                    <div className="col-span-2">
                      <p className="text-text-muted text-xs mb-0.5">Description</p>
                      <p className="text-text-secondary text-xs leading-relaxed">{rwa.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Submitted</p>
                    <p className="text-text-secondary text-xs">{formatDate(rwa.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Owner</p>
                    <AddressBadge address={rwa.ownerPublicKey} chars={5} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-violet-500/[0.12] bg-bg-card/50 p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">Agent Council</p>
                <AgentCouncilPanel
                  rwaId={rwa.id}
                  rwaStatus={rwa.status}
                  nftTokenId={rwa.nftTokenId}
                  mintTxHash={rwa.mintTxHash}
                  finalDecisionMemo={rwa.finalDecisionMemo}
                  votes={effectiveVotes}
                  onAgentClick={(_agentId, vote) => vote && setSelectedVote(vote)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ReasoningDrawer vote={selectedVote} onClose={() => setSelectedVote(null)} />
    </>
  );
}
