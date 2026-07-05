'use client';

import { cn } from '@/lib/cn';
import {
  COUNCIL_AGENT_PROFILES,
  type CouncilAgentProfile,
} from '@/lib/demo/landing-mock';

export interface CouncilOrbVisualProfile {
  id: string;
  label: string;
  tag: string;
  orbColorClass: string;
  pingColor: string;
  innerColor: string;
}

const ORCHESTRATOR_PROFILE: CouncilOrbVisualProfile = {
  id: 'orchestrator',
  label: 'Orchestrator Agent',
  tag: '🎯 Pipeline Level: Coordinating',
  orbColorClass:
    'from-violet-500/30 to-violet-700/20 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.6)]',
  pingColor: 'bg-violet-500',
  innerColor: 'bg-violet-500',
};

function toVisualProfile(profile: CouncilAgentProfile): CouncilOrbVisualProfile {
  return {
    id: profile.id,
    label: profile.label,
    tag: profile.tag,
    orbColorClass: profile.orbColorClass,
    pingColor: profile.pingColor,
    innerColor: profile.innerColor,
  };
}

export function getCouncilAgentProfile(agentId: string): CouncilOrbVisualProfile {
  const found = COUNCIL_AGENT_PROFILES.find((p) => p.id === agentId);
  if (found) return toVisualProfile(found);
  if (agentId === 'orchestrator') return ORCHESTRATOR_PROFILE;
  return toVisualProfile(COUNCIL_AGENT_PROFILES[0]);
}

type OrbState = 'idle' | 'thinking' | 'voted' | 'error';

interface CouncilAgentShowcaseOrbProps {
  agentId: string;
  orbState?: OrbState;
  vote?: 'APPROVE' | 'REJECT';
  size?: 'sm' | 'md';
  className?: string;
}

export function CouncilAgentShowcaseOrb({
  agentId,
  orbState = 'idle',
  vote,
  size = 'md',
  className,
}: CouncilAgentShowcaseOrbProps) {
  const profile = getCouncilAgentProfile(agentId);
  const isThinking = orbState === 'thinking';
  const isVoted = orbState === 'voted';
  const isError = orbState === 'error';

  const orbSize = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';
  const innerDot = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  const voteOrbClass =
    vote === 'APPROVE'
      ? 'from-teal-500/30 to-teal-700/20 border-teal-500/50 shadow-[0_0_25px_rgba(20,184,166,0.5)]'
      : vote === 'REJECT'
        ? 'from-red-500/30 to-red-700/20 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
        : null;

  const voteInnerClass =
    vote === 'APPROVE' ? 'bg-teal-400' : vote === 'REJECT' ? 'bg-red-400' : profile.innerColor;

  return (
    <div
      className={cn(
        'relative rounded-full bg-gradient-to-b flex items-center justify-center border shrink-0',
        orbSize,
        isError
          ? 'from-red-500/30 to-red-700/20 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
          : isVoted && voteOrbClass
            ? voteOrbClass
            : profile.orbColorClass,
        isThinking && 'ring-2 ring-teal-400/40 ring-offset-2 ring-offset-bg-deep',
        isError && 'ring-2 ring-red-400/40 ring-offset-2 ring-offset-bg-deep',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-1.5 rounded-full opacity-25',
          isVoted && vote === 'APPROVE'
            ? 'bg-teal-400'
            : isVoted && vote === 'REJECT'
              ? 'bg-red-400'
              : profile.pingColor,
          isThinking ? 'animate-pulse opacity-40' : 'opacity-15',
        )}
      />
      <div
        className={cn(
          innerDot,
          'rounded-full shadow-[0_0_15px_rgba(255,255,255,0.7)] z-10',
          voteInnerClass,
        )}
      />
    </div>
  );
}
