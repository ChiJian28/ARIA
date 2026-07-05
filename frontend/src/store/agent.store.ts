import { create } from 'zustand';
import type { AgentInfo, SseEvent } from '@/types/api.types';
import { getSseAgentId, getSsePayload } from '@/lib/sse-helpers';

const MAX_EVENTS = 100;

interface AgentState {
  agents: AgentInfo[];
  liveStatuses: Map<string, string>;
  sseConnected: boolean;
  sseEvents: SseEvent[];
  setAgents: (agents: AgentInfo[]) => void;
  setAgentStatus: (agentId: string, status: string) => void;
  setSseConnected: (v: boolean) => void;
  handleSseEvent: (event: SseEvent) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  liveStatuses: new Map(),
  sseConnected: false,
  sseEvents: [],
  setAgents: (agents) => set({ agents }),
  setAgentStatus: (agentId, status) =>
    set((state) => {
      const next = new Map(state.liveStatuses);
      next.set(agentId, status);
      return { liveStatuses: next };
    }),
  setSseConnected: (sseConnected) => set({ sseConnected }),
  handleSseEvent: (event) => {
    set((state) => {
      if (event.type === 'CONNECTED') return { sseConnected: true };

      const agentId = getSseAgentId(event);
      const payload = getSsePayload(event);
      const next = new Map(state.liveStatuses);

      if (event.type === 'AGENT_STARTED' && agentId) {
        next.set(agentId, 'BUSY');
      }
      if (event.type === 'AGENT_STATUS_UPDATE' && agentId) {
        next.set(agentId, 'BUSY');
      }
      if (event.type === 'AGENT_COMPLETED' && agentId) {
        next.set(agentId, 'IDLE');
      }
      if (event.type === 'VOTE_CAST' && agentId) {
        next.set(agentId, 'VOTED');
      }

      return {
        liveStatuses: next,
        sseEvents: [event, ...state.sseEvents].slice(0, MAX_EVENTS),
      };
    });
  },
}));
