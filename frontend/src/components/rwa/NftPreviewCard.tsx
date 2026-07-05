'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { nftClimaxReveal } from '@/lib/animations';
import type { RwaDetail } from '@/types/api.types';
import { formatDate, formatUSD } from '@/lib/formatters';
import { explorerDeployUrl } from '@/lib/explorer';
import { ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';

interface NftPreviewCardProps {
  rwa: RwaDetail;
  holographic?: boolean;
  className?: string;
}

export function NftPreviewCard({ rwa, holographic = false, className }: NftPreviewCardProps) {
  const Wrapper = holographic ? motion.div : 'div';
  const wrapperProps = holographic
    ? { variants: nftClimaxReveal, initial: 'hidden' as const, animate: 'visible' as const }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'relative rounded-2xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-950 via-bg-card to-teal-950 p-5 shadow-xl',
        holographic && 'shadow-2xl shadow-teal-500/20 border-teal-500/40',
        className,
      )}
      style={holographic ? { transformStyle: 'preserve-3d' as const } : undefined}
    >
      {/* Iridescent overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-medium text-violet-400 uppercase tracking-widest mb-1">
              ARIA RWA NFT · CEP-78
            </p>
            <h3 className="text-base font-bold text-text-primary">
              {rwa.assetType.replace('_', ' ')}
            </h3>
          </div>
          <StatusBadge status={rwa.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-text-muted mb-0.5">Face Value</p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {formatUSD(rwa.faceValue)} {rwa.currency}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted mb-0.5">Maturity</p>
            <p className="text-sm font-mono text-text-primary">{formatDate(rwa.maturityDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted mb-0.5">Counterparty</p>
            <p className="text-sm text-text-secondary truncate">{rwa.counterpartyName}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted mb-0.5">Jurisdiction</p>
            <p className="text-sm text-text-secondary">{rwa.counterpartyJurisdiction}</p>
          </div>
        </div>

        {(rwa.mintTxHash || rwa.nftTokenId) && (
          <div className="flex flex-col gap-1.5">
            {rwa.mintTxHash && (
              <a
                href={explorerDeployUrl(rwa.mintTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View mint deploy on testnet
              </a>
            )}
            {rwa.nftTokenId && !/^[a-f0-9]{64}$/i.test(rwa.nftTokenId) && (
              <p className="text-[10px] text-text-muted font-mono truncate">
                Token · {rwa.nftTokenId.slice(0, 16)}…
              </p>
            )}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
