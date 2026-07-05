'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchRwa, fetchRwaVotes } from '@/lib/api';
import { sseEmitter } from '@/lib/sse';
import {
  getSseAgentId,
  getSsePayload,
  getSseRwaId,
  stageToMessage,
} from '@/lib/sse-helpers';
import type { SseEvent, RwaDetail, AgentVote } from '@/types/api.types';
import { deriveCouncilOutcome } from '@/lib/council-display';
import { COUNCIL_THEATER_AGENT_IDS, COUNCIL_VOTING_AGENT_IDS } from '@/lib/constants';

export type AgentOrbState = 'idle' | 'thinking' | 'voted' | 'error';

export interface AgentVoteState {
  vote: 'APPROVE' | 'REJECT';
  confidence?: number;
  txHash?: string;
}

export interface CouncilSessionState {
  agentStates: Record<string, AgentOrbState>;
  agentLogs: Record<string, string[]>;
  votes: Record<string, AgentVoteState>;
  approveCount: number;
  consensusReached: boolean;
  approved: boolean;
  nftMinted: boolean;
  climax: boolean;
  verdictMemo?: string;
}

const INITIAL: CouncilSessionState = {
  agentStates: {},
  agentLogs: {},
  votes: {},
  approveCount: 0,
  consensusReached: false,
  approved: false,
  nftMinted: false,
  climax: false,
};

const TERMINAL_RWA_STATUSES = new Set(['APPROVED', 'REJECTED', 'SETTLED', 'DEFAULTED']);

function appendLog(logs: Record<string, string[]>, agentId: string, line: string): Record<string, string[]> {
  const prev = logs[agentId] ?? [];
  if (prev.includes(line)) return logs;
  return { ...logs, [agentId]: [...prev, line] };
}

function initAgentMaps(): Pick<CouncilSessionState, 'agentStates' | 'agentLogs'> {
  const agentStates: Record<string, AgentOrbState> = {};
  const agentLogs: Record<string, string[]> = {};
  for (const id of COUNCIL_THEATER_AGENT_IDS) {
    agentStates[id] = 'idle';
    agentLogs[id] = [];
  }
  return { agentStates, agentLogs };
}

function finalizeAgentsOnConsensus(prev: CouncilSessionState, approved: boolean): CouncilSessionState {
  const agentStates = { ...prev.agentStates };
  let agentLogs = { ...prev.agentLogs };

  for (const id of COUNCIL_VOTING_AGENT_IDS) {
    if (prev.votes[id]) {
      agentStates[id] = 'voted';
      continue;
    }
    if (agentStates[id] === 'thinking' || agentStates[id] === 'idle') {
      agentStates[id] = 'error';
      agentLogs = appendLog(
        agentLogs,
        id,
        approved ? 'Vote pending · council decided early' : 'Analysis incomplete · counted as REJECT',
      );
    }
  }

  agentStates.orchestrator = 'voted';

  return {
    ...prev,
    agentStates,
    agentLogs,
    consensusReached: true,
    approved,
    climax: true,
  };
}

function mergeVoteFromApi(
  prev: CouncilSessionState,
  vote: AgentVote,
): CouncilSessionState {
  const agentId = vote.agentId;
  if (!COUNCIL_VOTING_AGENT_IDS.includes(agentId as (typeof COUNCIL_VOTING_AGENT_IDS)[number])) {
    return prev;
  }

  if (vote.vote === 'PENDING') return prev;

  const decision: 'APPROVE' | 'REJECT' = vote.vote === 'APPROVE' ? 'APPROVE' : 'REJECT';
  const votes: Record<string, AgentVoteState> = {
    ...prev.votes,
    [agentId]: {
      vote: decision,
      confidence: vote.confidence,
      txHash: vote.txHash ?? undefined,
    },
  };

  let agentLogs = prev.agentLogs;
  if (vote.reasoning) {
    agentLogs = appendLog(agentLogs, agentId, `Verdict · ${vote.vote} (${Math.round(vote.confidence * 100)}% confidence)`);
  }
  agentLogs = appendLog(
    agentLogs,
    agentId,
    `Vote recorded · ${decision}${vote.txHash ? ` · tx ${vote.txHash.slice(0, 12)}…` : ''}`,
  );

  return {
    ...prev,
    votes,
    agentLogs,
    agentStates: { ...prev.agentStates, [agentId]: 'voted' },
    approveCount: Object.values(votes).filter((v) => v.vote === 'APPROVE').length,
  };
}

function mergeFromApi(prev: CouncilSessionState, rwa: RwaDetail, apiVotes: AgentVote[]): CouncilSessionState {
  let next = { ...prev };

  for (const vote of apiVotes) {
    next = mergeVoteFromApi(next, vote);
  }

  const outcome = deriveCouncilOutcome(apiVotes, rwa.status, {
    nftTokenId: rwa.nftTokenId,
    mintTxHash: rwa.mintTxHash,
    finalDecisionMemo: rwa.finalDecisionMemo,
  });

  const isTerminal = TERMINAL_RWA_STATUSES.has(rwa.status) || outcome.consensusReached;

  if (isTerminal && outcome.consensusReached) {
    next = finalizeAgentsOnConsensus(next, outcome.councilApproved);
    next.approved = outcome.councilApproved;
    next.consensusReached = true;
    next.climax = true;
    next.nftMinted = outcome.councilApproved && Boolean(rwa.mintTxHash || rwa.nftTokenId);
    next.verdictMemo = outcome.summaryMessage ?? rwa.finalDecisionMemo;
  } else if (rwa.status === 'ANALYZING' || rwa.status === 'VOTING') {
    for (const id of COUNCIL_VOTING_AGENT_IDS) {
      if (!next.votes[id] && next.agentStates[id] === 'idle') {
        next.agentStates = { ...next.agentStates, [id]: 'thinking' };
      }
    }
    if (next.agentStates.orchestrator === 'idle') {
      next.agentStates = { ...next.agentStates, orchestrator: 'thinking' };
    }
  }

  return next;
}

export function useRwaCouncilSession(rwaId: string | null) {
  const [session, setSession] = useState<CouncilSessionState>(() => ({
    ...INITIAL,
    ...initAgentMaps(),
  }));

  const reset = useCallback(() => {
    setSession({ ...INITIAL, ...initAgentMaps() });
  }, []);

  const applyApiSnapshot = useCallback((rwa: RwaDetail, votes: AgentVote[]) => {
    setSession((prev) => mergeFromApi(prev, rwa, votes));
  }, []);

  // REST poll — catches missed SSE + terminal state
  useEffect(() => {
    if (!rwaId) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const [rwa, votes] = await Promise.all([fetchRwa(rwaId), fetchRwaVotes(rwaId)]);
        if (cancelled) return;
        applyApiSnapshot(rwa, votes);
        if (TERMINAL_RWA_STATUSES.has(rwa.status) && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch {
        // ignore transient errors
      }
    };

    poll();
    interval = setInterval(poll, 2500);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [rwaId, applyApiSnapshot]);

  useEffect(() => {
    if (!rwaId) return;

    reset();

    const handler = (event: SseEvent) => {
      const eventRwaId = getSseRwaId(event);
      if (eventRwaId && eventRwaId !== rwaId) return;

      const agentId = getSseAgentId(event);
      const payload = getSsePayload(event);

      setSession((prev) => {
        let next = { ...prev };

        if (event.type === 'PIPELINE_STATUS' && payload.stage === 'dispatching_agents') {
          next.agentStates = { ...next.agentStates, orchestrator: 'thinking' };
          next.agentLogs = appendLog(next.agentLogs, 'orchestrator', 'Council session initiated · agents dispatched');
        }

        if (event.type === 'AGENT_STARTED' && agentId) {
          next.agentStates = { ...next.agentStates, [agentId]: 'thinking' };
          const msg = stageToMessage(payload.stage);
          if (msg) next.agentLogs = appendLog(next.agentLogs, agentId, msg);
        }

        if (event.type === 'AGENT_STATUS_UPDATE' && agentId && typeof payload.message === 'string') {
          next.agentStates = {
            ...next.agentStates,
            [agentId]: next.agentStates[agentId] === 'voted' ? 'voted' : 'thinking',
          };
          next.agentLogs = appendLog(next.agentLogs, agentId, payload.message);
        }

        if (event.type === 'VOTE_CAST' && agentId) {
          const vote = payload.vote === 'REJECT' ? 'REJECT' : 'APPROVE';
          const confidence = typeof payload.confidence === 'number' ? payload.confidence : undefined;
          const txHash = typeof payload.txHash === 'string' ? payload.txHash : undefined;
          next.votes = { ...next.votes, [agentId]: { vote, confidence, txHash } };
          next.agentStates = { ...next.agentStates, [agentId]: 'voted' };
          next.agentLogs = appendLog(
            next.agentLogs,
            agentId,
            `Vote cast on-chain · ${vote}${txHash ? ` · tx ${txHash.slice(0, 12)}…` : ''}`,
          );
          next.approveCount = Object.values(next.votes).filter((v) => v.vote === 'APPROVE').length;
        }

        if (event.type === 'CONSENSUS_REACHED') {
          const approved = payload.approved === true;
          const memo = typeof payload.memo === 'string' ? payload.memo : undefined;
          next = finalizeAgentsOnConsensus(next, approved);
          next.verdictMemo = memo;
          next.agentLogs = appendLog(
            next.agentLogs,
            'orchestrator',
            approved ? 'Consensus reached · APPROVED' : 'Consensus reached · REJECTED',
          );
        }

        if (event.type === 'NFT_MINTED') {
          next.nftMinted = true;
          next.climax = true;
          next.approved = true;
          next.agentLogs = appendLog(next.agentLogs, 'orchestrator', 'CEP-78 RWA NFT minted on Casper testnet ✓');
        }

        return next;
      });
    };

    sseEmitter.on('*', handler);
    return () => {
      sseEmitter.off('*', handler);
    };
  }, [rwaId, reset]);

  return session;
}
