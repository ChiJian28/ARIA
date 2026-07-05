'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { useRwa, useRwaVotes } from '@/hooks/useRwa';
import { NftPreviewCard } from '@/components/rwa/NftPreviewCard';
import { AgentCouncilPanel } from '@/components/agents/AgentCouncilPanel';
import { ReasoningDrawer } from '@/components/agents/ReasoningDrawer';
import { RiskScoreGauge } from '@/components/rwa/RiskScoreGauge';
import { StatusBadge } from '@/components/ui/badge';
import { AddressBadge } from '@/components/ui/address-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatUSD } from '@/lib/formatters';
import { explorerDeployUrl } from '@/lib/explorer';
import { ExternalLink } from 'lucide-react';
import { deriveCouncilOutcome, effectiveRwaDisplayStatus } from '@/lib/council-display';
import type { AgentVote } from '@/types/api.types';

export default function RwaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: rwa, isLoading } = useRwa(id);
  const { data: votes } = useRwaVotes(id);
  const [selectedVote, setSelectedVote] = useState<AgentVote | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!rwa) {
    return <div className="text-center py-16 text-text-muted">RWA not found</div>;
  }

  const effectiveVotes = votes ?? rwa.votes;
  const councilOutcome = deriveCouncilOutcome(effectiveVotes, rwa.status, {
    nftTokenId: rwa.nftTokenId,
    mintTxHash: rwa.mintTxHash,
    finalDecisionMemo: rwa.finalDecisionMemo,
  });
  const displayStatus = effectiveRwaDisplayStatus(rwa.status, councilOutcome);

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{rwa.assetType.replace('_', ' ')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <AddressBadge address={rwa.id} chars={8} />
            <StatusBadge status={displayStatus} />
            {councilOutcome.mintPending && (
              <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                NFT mint pending
              </span>
            )}
          </div>
        </div>
        {rwa.mintTxHash && (
          <a
            href={explorerDeployUrl(rwa.mintTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300"
          >
            <ExternalLink className="w-4 h-4" />
            View mint on testnet explorer
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <NftPreviewCard rwa={rwa} />

          <Card>
            <CardHeader><CardTitle>Asset Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted text-xs mb-0.5">Face Value</p>
                <p className="font-mono text-text-primary">{formatUSD(rwa.faceValue)} {rwa.currency}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Maturity Date</p>
                <p className="text-text-primary">{formatDate(rwa.maturityDate)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Counterparty</p>
                <p className="text-text-secondary">{rwa.counterpartyName}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Jurisdiction</p>
                <p className="text-text-secondary">{rwa.counterpartyJurisdiction}</p>
              </div>
              {rwa.riskScore !== null && (
                <div className="col-span-2 flex items-center gap-6">
                  <div>
                    <p className="text-text-muted text-xs mb-0.5">Risk Score</p>
                    <RiskScoreGauge score={rwa.riskScore} size={80} />
                  </div>
                  {rwa.collateralRatio !== null && (
                    <div>
                      <p className="text-text-muted text-xs mb-0.5">Collateral Ratio</p>
                      <p className="text-2xl font-mono font-bold text-text-primary">{(rwa.collateralRatio * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <p className="text-text-muted text-xs mb-0.5">Description</p>
                <p className="text-text-secondary text-xs leading-relaxed">{rwa.description}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Owner</p>
                <AddressBadge address={rwa.ownerPublicKey} chars={5} />
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Submitted</p>
                <p className="text-text-secondary text-xs">{formatDate(rwa.createdAt)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted text-xs mb-0.5">RWA ID (off-chain)</p>
                <p className="text-text-secondary text-xs font-mono break-all">{rwa.id}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  This UUID is stored in contract metadata — search the mint deploy hash on testnet.cspr.live, not this ID.
                </p>
              </div>
              {rwa.mintTxHash && (
                <div className="col-span-2">
                  <p className="text-text-muted text-xs mb-0.5">Mint deploy hash</p>
                  <a
                    href={explorerDeployUrl(rwa.mintTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-sky-400 hover:text-sky-300 break-all"
                  >
                    {rwa.mintTxHash}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Agent Council</CardTitle></CardHeader>
            <CardContent className="overflow-hidden">
              <AgentCouncilPanel
                rwaId={id}
                rwaStatus={rwa.status}
                nftTokenId={rwa.nftTokenId}
                mintTxHash={rwa.mintTxHash}
                finalDecisionMemo={rwa.finalDecisionMemo}
                votes={effectiveVotes}
                onAgentClick={(agentId, vote) => vote && setSelectedVote(vote)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasoningDrawer vote={selectedVote} onClose={() => setSelectedVote(null)} />
    </motion.div>
  );
}
