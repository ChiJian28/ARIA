'use client';

import { MiniTerminal } from '@/components/agents/MiniTerminal';
import { CouncilAgentShowcaseOrb, getCouncilAgentProfile } from '@/components/agents/CouncilAgentShowcaseOrb';
import { cn } from '@/lib/cn';

type OrbState = 'idle' | 'thinking' | 'voted' | 'error';

interface CouncilTheaterAgentNodeProps {
  agentId: string;
  orbState: OrbState;
  vote?: 'APPROVE' | 'REJECT';
  terminalLines: string[];
  compact?: boolean;
}

function statusTag(orbState: OrbState, vote?: 'APPROVE' | 'REJECT'): string {
  if (orbState === 'thinking') return '⚡ Processing…';
  if (orbState === 'error') return '⚠ Error';
  if (orbState === 'voted' && vote === 'APPROVE') return '✓ APPROVE';
  if (orbState === 'voted' && vote === 'REJECT') return '✗ REJECT';
  return 'STANDBY';
}

export function CouncilTheaterAgentNode({
  agentId,
  orbState,
  vote,
  terminalLines,
  compact = false,
}: CouncilTheaterAgentNodeProps) {
  const profile = getCouncilAgentProfile(agentId);
  const tag = statusTag(orbState, vote);

  return (
    <div
      className={cn(
        'rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col overflow-hidden transition-all duration-300',
        compact ? 'h-[148px]' : 'h-[168px]',
        orbState === 'thinking' && 'border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.08)]',
        orbState === 'voted' &&
          vote === 'APPROVE' &&
          'border-teal-500/25 shadow-[0_0_15px_rgba(20,184,166,0.06)]',
        orbState === 'voted' &&
          vote === 'REJECT' &&
          'border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.06)]',
        orbState === 'error' && 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]',
      )}
    >
      {/* Identity header — matches AgentCouncilShowcase left column */}
      <div className="flex items-center gap-3 p-3 border-b border-violet-500/10 bg-bg-deep/20">
        <CouncilAgentShowcaseOrb
          agentId={agentId}
          orbState={orbState}
          vote={vote}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-text-primary text-xs truncate">{profile.label}</h4>
          <span
            className={cn(
              'text-[9px] font-mono font-semibold block px-1.5 py-0.5 rounded-md mt-0.5 w-fit truncate max-w-full',
              orbState === 'thinking' && 'text-teal-400 bg-teal-500/10 border border-teal-500/20',
              orbState === 'voted' &&
                vote === 'APPROVE' &&
                'text-teal-400 bg-teal-500/10 border border-teal-500/20',
              orbState === 'voted' &&
                vote === 'REJECT' &&
                'text-red-400 bg-red-500/10 border border-red-500/20',
              orbState === 'error' && 'text-red-400 bg-red-500/10 border border-red-500/20',
              orbState === 'idle' && 'text-text-muted bg-bg-deep/40 border border-violet-500/10',
            )}
          >
            {tag}
          </span>
        </div>
      </div>

      {/* Live terminal — matches showcase right column */}
      <div className="flex-1 min-h-0 p-2.5">
        <div className="h-full bg-black/95 border border-violet-500/10 rounded-xl p-2 font-mono overflow-hidden shadow-inner border-t border-t-teal-500/50">
          <MiniTerminal
            lines={terminalLines}
            className="border-0 bg-transparent p-0 text-[9px] leading-relaxed"
            charDelayMs={14}
          />
        </div>
      </div>
    </div>
  );
}
