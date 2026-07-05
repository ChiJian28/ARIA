'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { AgentVote } from '@/types/api.types';
import { AGENT_LABELS } from '@/lib/constants';
import { confidenceToPercent } from '@/lib/formatters';
import { explorerDeployUrl } from '@/lib/explorer';

interface ReasoningDrawerProps {
  vote: AgentVote | null;
  onClose: () => void;
}

export function ReasoningDrawer({ vote, onClose }: ReasoningDrawerProps) {
  return (
    <AnimatePresence>
      {vote && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-bg-surface border-l border-violet-500/20 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-violet-500/[0.12]">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {AGENT_LABELS[vote.agentId] ?? vote.agentId} Agent Reasoning
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {vote.vote === 'APPROVE' ? '✓ Approved' : '✗ Rejected'} · {confidenceToPercent(vote.confidence)}% confidence
                </p>
                {vote.txHash && (
                  <a
                    href={explorerDeployUrl(vote.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 mt-2 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View vote on explorer
                  </a>
                )}
              </div>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose prose-invert prose-sm max-w-none prose-p:text-text-secondary prose-headings:text-text-primary">
                <ReactMarkdown>{vote.reasoning || '_No reasoning provided._'}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
