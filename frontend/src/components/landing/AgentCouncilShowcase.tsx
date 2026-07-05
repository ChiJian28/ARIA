'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { MiniTerminal } from '@/components/agents/MiniTerminal';
import { fadeUp } from '@/lib/animations';
import { fetchAgents, fetchLeaderboard } from '@/lib/api';
import {
  agentOnChainExplorerUrl,
  formatAgentOnChainLabel,
  resolveAgentPublicKey,
} from '@/lib/council-agent-identity';
import { formatUSD } from '@/lib/formatters';
import {
  COUNCIL_AGENT_PROFILES,
  type CouncilAgentProfile,
  type CouncilTabId,
} from '@/lib/demo/landing-mock';
import { COUNCIL_MERIT_AGENT_IDS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { AgentInfo, LeaderboardEntry } from '@/types/api.types';

const TABS: CouncilTabId[] = [...COUNCIL_MERIT_AGENT_IDS];

function mergeProfileWithApi(
  profile: CouncilAgentProfile,
  agents?: AgentInfo[],
  leaderboard?: LeaderboardEntry[],
): CouncilAgentProfile {
  const entry = leaderboard?.find((e) => e.agentId === profile.id);
  const agentPublicKey = resolveAgentPublicKey(profile.id, agents, leaderboard);
  const explorerUrl = agentOnChainExplorerUrl(agentPublicKey);

  return {
    ...profile,
    accuracy: entry && entry.totalVotes > 0 ? entry.accuracy : profile.accuracy,
    reputationNft: formatAgentOnChainLabel(agentPublicKey),
    nftLink: explorerUrl ?? '',
  };
}

export function AgentCouncilShowcase() {
  const [activeTab, setActiveTab] = useState<CouncilTabId>('risk');

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 30_000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 30_000,
  });

  const profiles = useMemo(
    () => COUNCIL_AGENT_PROFILES.map((p) => mergeProfileWithApi(p, agents, leaderboard)),
    [agents, leaderboard],
  );

  const active = profiles.find((p) => p.id === activeTab) ?? profiles[0];

  return (
    <section id="council" className="py-20 px-6 scroll-mt-24 bg-bg-deep">
      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center max-w-xl mx-auto space-y-3"
        >
          <h2 className="text-xs font-mono text-teal-400 tracking-widest uppercase">
            THE INTELLECTUAL SWARM
          </h2>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">
            Meet the Underwriting Council
          </p>
          <p className="text-sm text-text-secondary font-light">
            Four specialized agents operate on Casper Network. Each holds a reputation NFT that tracks their decision-making precision and micro-payment expenditures.
          </p>
        </motion.div>

        {/* Interactive Agent Select Tabs */}
        <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
          {TABS.map((id) => {
            const profile = COUNCIL_AGENT_PROFILES.find((p) => p.id === id);
            const label = profile?.label ?? id;
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs font-mono border transition-all duration-300 flex items-center space-x-2 cursor-pointer',
                  isActive
                    ? 'bg-violet-500/15 border-violet-500/40 text-text-primary shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                    : 'bg-bg-card border-violet-500/10 text-text-secondary hover:text-text-primary hover:border-violet-500/30',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', isActive ? 'bg-teal-400 animate-pulse' : 'bg-text-muted')} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Main 3-Column Interactive Console */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid lg:grid-cols-12 gap-6 max-w-6xl mx-auto items-stretch"
        >
          {/* Left Column (Identity & Battle Record): 4 cols */}
          <div className="lg:col-span-4 p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                IDENTITY &amp; REPUTATION
              </span>

              {/* Avatar Orb */}
              <div className="flex items-center space-x-4">
                <div className={cn(
                  'relative w-16 h-16 rounded-full bg-gradient-to-b flex items-center justify-center border',
                  active.orbColorClass
                )}>
                  <div className={cn('absolute inset-1.5 rounded-full opacity-25 animate-pulse', active.pingColor)} />
                  <div className={cn('w-4 h-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.7)] z-10', active.innerColor)} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">
                    {active.label}
                  </h3>
                  <span className="text-[10px] text-teal-400 font-mono font-semibold block bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md mt-1 w-fit">
                    {active.tag}
                  </span>
                </div>
              </div>

              {/* On-chain identity — same agentPublicKey as Observatory Meritocracy */}
              <div className="pt-2">
                {active.nftLink ? (
                  <a
                    href={active.nftLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono text-violet-300 bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/20 transition-all w-full justify-between"
                  >
                    <span>{active.reputationNft}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-mono text-text-muted bg-bg-deep/40 border border-violet-500/10 w-full">
                    {active.reputationNft}
                  </span>
                )}
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-violet-500/10 pt-6">
              <div className="bg-bg-deep/40 p-3 rounded-xl border border-violet-500/10">
                <span className="block text-[10px] font-mono text-text-muted uppercase">Accuracy</span>
                <span className="text-sm font-mono font-bold text-teal-400">{active.accuracy}%</span>
              </div>
              <div className="bg-bg-deep/40 p-3 rounded-xl border border-violet-500/10">
                <span className="block text-[10px] font-mono text-text-muted uppercase">Assets Evaluated</span>
                <span className="text-sm font-mono font-bold text-text-primary">
                  {formatUSD(active.assetsEvaluatedUsd)}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Column (Tool & Gas Consumption Area): 4 cols */}
          <div className="lg:col-span-4 p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                ORACLES &amp; MICROPAYMENTS
              </span>
              
              <h4 className="font-mono text-xs font-bold text-teal-400 uppercase tracking-wide">
                {active.oracleSubtitle}
              </h4>

              {/* Tools List */}
              <div className="space-y-2.5">
                {active.oracles.map((tool, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-violet-500/10 bg-bg-deep/20 text-xs text-text-primary font-mono"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-teal-400 font-bold">⚡</span>
                      {tool.name}
                    </span>
                    <span className={cn('text-xs font-mono shrink-0', tool.free ? 'text-emerald-400' : 'text-amber-400')}>
                      {tool.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aside / Voiceover narration */}
            <div className="p-3.5 rounded-xl border border-teal-500/10 bg-teal-950/5 text-[11px] text-teal-300/90 font-mono leading-relaxed">
              &ldquo;{active.voiceover}&rdquo;
            </div>
          </div>

          {/* Right Column (X-Ray Live Decision Terminal): 4 cols */}
          <div className="lg:col-span-4 p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col justify-between space-y-4">
            <div className="space-y-3 h-full flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-3">
                  LIVE DECISION STREAM
                </span>

                {/* Terminal Window */}
                <div className="bg-black/95 border border-violet-500/10 rounded-xl p-4 font-mono h-48 overflow-y-auto flex flex-col justify-between shadow-inner border-t-2 border-t-teal-500">
                  <MiniTerminal
                    key={activeTab}
                    lines={active.terminalLines}
                    className="border-0 bg-transparent p-0 text-[11px]"
                    charDelayMs={18}
                  />
                  
                  <div className="flex items-center justify-between text-[9px] text-text-muted border-t border-violet-500/10 pt-2.5 mt-2">
                    <span>SECURE PIPELINE V1</span>
                    <span>NODE ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-text-secondary font-mono leading-relaxed bg-bg-deep/30 p-3 rounded-xl border border-violet-500/10">
                <span className="text-violet-400 font-semibold uppercase block text-[10px] mb-1">
                  COGNITIVE PROCESS LOGIC
                </span>
                Autonomous decision weights verified via Casper Smart Contract CEP-78 metadata records.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
