'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  ShieldCheck,
  Activity,
  Award,
  Layers,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { pageTransition } from '@/lib/animations';
import {
  useVaultStats,
  useVaultPosition,
  useVaultInstruments,
  useVaultRiskDistribution,
  useVaultYieldTrend,
} from '@/hooks/useVault';
import { useWallet } from '@/hooks/useWallet';
import { useTransaction } from '@/hooks/useTransaction';
import { useUiStore } from '@/store/ui.store';
import { motesToCspr, formatDate } from '@/lib/formatters';

export default function VaultPage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const { addToast } = useUiStore();

  const { data: stats, isLoading: statsLoading } = useVaultStats();
  const { data: position, isLoading: positionLoading } = useVaultPosition(address);
  const { data: instruments, isLoading: instrumentsLoading } = useVaultInstruments();
  const { data: riskDistribution, isLoading: riskDistLoading } = useVaultRiskDistribution();
  const { data: yieldTrend, isLoading: yieldTrendLoading } = useVaultYieldTrend(address, 7);

  const { deposit, withdraw } = useTransaction();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [isTxSigning, setIsTxSigning] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);

  // Filter and process instruments
  const activeInstruments = useMemo(() => {
    return instruments ?? [];
  }, [instruments]);

  // Capital utilization — locked CSPR / total TVL (from on-chain collateral locks in DB)
  const utilizationRate = useMemo(() => {
    if (!stats) return 0;
    if (typeof stats.utilizationPct === 'number') return stats.utilizationPct;
    const tvl = motesToCspr(stats.tvlMotes);
    const locked = stats.lockedCsprMotes ? motesToCspr(stats.lockedCsprMotes) : 0;
    if (tvl <= 0) return 0;
    return Math.min(100, Math.round((locked / tvl) * 100));
  }, [stats]);

  // Handle deposit/withdrawal actions
  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return;

    if (!isConnected) {
      try {
        await connect();
      } catch (err) {
        addToast({ type: 'error', message: (err as Error).message });
      }
      return;
    }

    setIsTxSigning(true);
    setTxSuccess(false);

    try {
      const motes = String(Math.round(val * 1_000_000_000));
      if (activeTab === 'deposit') {
        await deposit(motes);
      } else {
        await withdraw(motes);
      }
      setTxSuccess(true);
      setAmountInput('');
      setTimeout(() => setTxSuccess(false), 5000);
    } catch (err) {
      addToast({ type: 'error', message: (err as Error).message });
    } finally {
      setIsTxSigning(false);
    }
  };

  // LP Conversion estimate
  const lpTokensEstimated = parseFloat(amountInput) || 0;

  // Position stats
  const userLpBalance = position ? motesToCspr(position.lpTokens) : 0;
  const userCsprEquivalent = position ? motesToCspr(position.csprDeposited) : 0;
  const userYieldEarned = position ? motesToCspr(position.yieldEarned) : 0;

  // Compounding Yield Accrual (7D Trend) — cumulative CSPR from settlement_events
  const chartData = useMemo(() => {
    if (yieldTrend?.length) {
      return yieldTrend.map((p) => motesToCspr(p.cumulativeYieldMotes));
    }
    return Array.from({ length: 7 }, () => 0);
  }, [yieldTrend]);

  const hasYield = userYieldEarned > 0 || chartData.some((v) => v > 0);
  const maxVal = Math.max(...chartData, hasYield ? 0.000001 : 1);
  const width = 500;
  const height = 110;
  const padding = 10;

  const points = useMemo(() => {
    return chartData.map((val, idx) => {
      const x = padding + (idx * (width - padding * 2)) / (chartData.length - 1);
      const y = height - padding - (val * (height - padding * 2)) / (maxVal || 1);
      return { x, y };
    });
  }, [chartData, maxVal]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    return `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  }, [pathD, points]);

  // Risk distribution
  const riskDist = riskDistribution ?? { low: 40, medium: 45, high: 15 };

  // Stats values
  const tvlCspr = stats ? motesToCspr(stats.tvlMotes) : 128450;
  const apy = stats ? (stats.currentApy * 100).toFixed(1) : '9.0';
  const poolYieldCspr = stats ? motesToCspr(stats.totalYieldEarned) : 0;
  const activeCollateral = stats ? stats.activeCollateral : 0;
  const activePositions = stats ? stats.activePositions : 12;

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8"
      id="vault-container"
    >
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 uppercase tracking-widest mb-1">
          <span>DEFI CAPITAL ACCESS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">DeFi Liquidity Vault</h2>
        <p className="text-sm text-text-secondary font-light mt-1 max-w-3xl leading-relaxed">
          Deposit idle CSPR into ARIA's automated pool to fund audited real-world assets and secure stable, risk-managed yields.
        </p>
      </div>

      {/* ================= TOP: VAULT STATS GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" id="vault-stats-grid">
        {/* TVL */}
        <div className="p-5 rounded-2xl border border-violet-500/10 bg-bg-card/40 space-y-2">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">Total Value Locked (TVL)</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-bold text-2xl text-text-primary">
              {statsLoading ? '...' : tvlCspr.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="font-mono text-xs text-teal-400 font-bold">CSPR</span>
          </div>
          <p className="text-[11px] text-text-secondary font-light flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Asset-Backed</span>
          </p>
        </div>

        {/* Current APY */}
        <div className="p-5 rounded-2xl border border-violet-500/10 bg-bg-card/40 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">Expected Net Yield (APY)</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-300">
              {statsLoading ? '...' : `${apy}%`}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary font-light flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
            <span>Forward-looking estimate</span>
          </p>
        </div>

        {/* Pool Yield Realized */}
        <div className="p-5 rounded-2xl border border-violet-500/10 bg-bg-card/40 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">Pool Yield Realized</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-bold text-2xl text-teal-400">
              {statsLoading ? '...' : poolYieldCspr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
            </span>
            <span className="font-mono text-xs text-teal-400/80 font-bold">CSPR</span>
          </div>
          <p className="text-[11px] text-text-secondary font-light flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 text-teal-400" />
            <span>Cumulative from settlements</span>
          </p>
        </div>

        {/* Capital Utilization */}
        <div className="p-5 rounded-2xl border border-violet-500/10 bg-bg-card/40 space-y-2">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">Capital Utilization</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-bold text-2xl text-text-primary">
              {statsLoading || instrumentsLoading ? '...' : `${utilizationRate}%`}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary font-light flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>Active funding efficiency</span>
          </p>
        </div>

        {/* Active SME Collateral */}
        <div className="p-5 rounded-2xl border border-violet-500/10 bg-bg-card/40 space-y-2">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">Active SME Collateral</span>
          <div className="flex items-baseline space-x-1">
            <span className="font-bold text-2xl text-text-primary">
              {statsLoading ? '...' : activeCollateral.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-text-secondary">Claims</span>
          </div>
          <p className="text-[11px] text-text-secondary font-light flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>Verified claims locked in pool</span>
          </p>
        </div>
      </div>

      {/* ================= MIDDLE: SPLIT ACTION ZONE ================= */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Action Panels (Deposit/Withdraw) */}
        <div className="p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col justify-between" id="vault-action-panel">
          <div>
            {/* Tab togglers */}
            <div className="flex space-x-2 border-b border-violet-500/10 pb-4 mb-6">
              <button
                onClick={() => {
                  setActiveTab('deposit');
                  setAmountInput('1000');
                }}
                className={`flex items-center space-x-1.5 py-2 px-4 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  activeTab === 'deposit'
                    ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                id="tab-deposit"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>DEPOSIT CAPITAL</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('withdraw');
                  setAmountInput('1000');
                }}
                className={`flex items-center space-x-1.5 py-2 px-4 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  activeTab === 'withdraw'
                    ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                id="tab-withdraw"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>WITHDRAW CAPITAL</span>
              </button>
            </div>

            {/* Main Interactive Form */}
            <form onSubmit={handleAction} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider">
                    {activeTab === 'deposit' ? 'CSPR Amount to Deposit' : 'CSPR Amount to Withdraw'}
                  </label>
                  {activeTab === 'withdraw' && isConnected && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(userLpBalance.toFixed(2))}
                      className="text-[10px] font-mono text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Max: {userLpBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} LP
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full bg-bg-deep border border-violet-500/10 pl-4 pr-16 py-3.5 rounded-xl text-lg font-mono font-bold text-text-primary focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <span className="absolute right-4 top-4 text-sm text-teal-400 font-mono font-bold">CSPR</span>
                </div>
              </div>

              {/* Estimate summary conversion */}
              <div className="p-3.5 rounded-xl border border-violet-500/10 bg-bg-deep/40 flex items-center justify-between text-xs text-text-secondary">
                <span className="font-light">
                  {activeTab === 'deposit' ? 'Estimated ARIA-LP Tokens Received' : 'CSPR Returned'}
                </span>
                <span className="font-mono font-semibold text-text-primary">
                  {lpTokensEstimated.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                  {activeTab === 'deposit' ? 'ARIA-LP' : 'CSPR'}
                </span>
              </div>

              {/* Action trigger button */}
              {!isConnected ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await connect();
                    } catch (err) {
                      addToast({ type: 'error', message: (err as Error).message });
                    }
                  }}
                  className="w-full py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-text-primary cursor-pointer shadow-lg transition-all duration-300"
                >
                  <CreditCard className="w-4.5 h-4.5" />
                  <span className="uppercase">Connect Casper Wallet</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isTxSigning || !amountInput || parseFloat(amountInput) <= 0}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg transition-all duration-300 ${
                    isTxSigning
                      ? 'bg-bg-deep border border-violet-500/10 text-violet-400 cursor-not-allowed'
                      : activeTab === 'deposit'
                      ? 'bg-teal-500 hover:bg-teal-400 text-bg-deep cursor-pointer shadow-teal-500/10'
                      : 'bg-violet-600 hover:bg-violet-500 text-text-primary cursor-pointer shadow-violet-500/15'
                  }`}
                  id="vault-action-btn"
                >
                  {isTxSigning ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin text-violet-400" />
                      <span className="font-mono text-xs">AWAITING WALLET SIGNATURE...</span>
                    </>
                  ) : (
                    <>
                      <Landmark className="w-4.5 h-4.5" />
                      <span className="uppercase font-bold">
                        {activeTab === 'deposit' ? 'Sign & Deposit CSPR' : 'Sign & Withdraw CSPR'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Wallet success notification */}
          {txSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono text-center flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              <span>TRANSACTION DEPLOYED & SIGNED SUCCESSFULLY ON CASPER!</span>
            </motion.div>
          )}
        </div>

        {/* Right Column: User Position Summary */}
        <div
          className="p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 flex flex-col justify-between relative overflow-hidden"
          id="vault-position-panel"
        >
          <div className="space-y-5">
            <h3 className="text-xs font-mono text-text-secondary uppercase tracking-wider">YOUR VAULT POSITION</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">LP BALANCE</span>
                <span className="font-mono text-base text-text-primary font-bold">
                  {positionLoading ? '...' : userLpBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-text-secondary font-mono block">ARIA-LP</span>
              </div>
              <div className="border-l border-violet-500/10 pl-4">
                <span className="block text-[10px] text-text-secondary uppercase">VALUE EQ.</span>
                <span className="font-mono text-base text-teal-400 font-bold">
                  {positionLoading ? '...' : Math.floor(userCsprEquivalent).toLocaleString('en-US')}
                </span>
                <span className="text-[9px] text-text-secondary font-mono block">CSPR</span>
              </div>
              <div className="border-l border-violet-500/10 pl-4">
                <span className="block text-[10px] text-text-secondary uppercase">YIELD EARNED</span>
                <span className="font-mono text-base text-violet-400 font-bold">
                  {positionLoading ? '...' : userYieldEarned.toFixed(6)}
                </span>
                <span className="text-[9px] text-text-secondary font-mono block">CSPR</span>
              </div>
            </div>

            {/* Custom SVG Area Chart */}
            <div className="pt-2">
              <span className="block text-[9px] font-mono text-text-secondary uppercase tracking-widest mb-2">
                Compounding Yield Accrual (7D Trend)
              </span>
              <div className="w-full h-28 bg-bg-deep/60 rounded-xl border border-violet-500/10 p-2 flex items-center justify-center relative">
                {!hasYield && !yieldTrendLoading && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-text-secondary/70 uppercase tracking-wider pointer-events-none">
                    No yield accrual yet
                  </span>
                )}
                {points.length > 0 && (
                  <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-full overflow-visible ${hasYield ? '' : 'opacity-40'}`}>
                    <defs>
                      <linearGradient id="violet-teal-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.45)" />
                        <stop offset="100%" stopColor="rgba(20, 184, 166, 0.0)" />
                      </linearGradient>
                      <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.9)" />
                        <stop offset="100%" stopColor="rgba(20, 184, 166, 0.9)" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line
                      x1="0"
                      y1={height / 2}
                      x2={width}
                      y2={height / 2}
                      stroke="rgba(255,255,255,0.03)"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1="0"
                      y1={height - padding}
                      x2={width}
                      y2={height - padding}
                      stroke="rgba(255,255,255,0.05)"
                    />

                    {/* Shaded Area */}
                    <path d={areaD} fill="url(#violet-teal-grad)" />

                    {/* Top Curve Line */}
                    <path d={pathD} fill="none" stroke="url(#line-grad)" strokeWidth="1.5" />

                    {hasYield && (
                      <>
                        <circle
                          cx={points[points.length - 1].x}
                          cy={points[points.length - 1].y}
                          r="4"
                          fill="#14b8a6"
                          className="animate-ping"
                          style={{
                            transformOrigin: `${points[points.length - 1].x}px ${points[points.length - 1].y}px`,
                          }}
                        />
                        <circle
                          cx={points[points.length - 1].x}
                          cy={points[points.length - 1].y}
                          r="3.5"
                          fill="#14b8a6"
                        />
                      </>
                    )}
                  </svg>
                )}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-secondary leading-normal font-light pt-4 border-t border-violet-500/10 mt-4">
            Yields represent genuine cash-flows generated from active invoice contracts. Liquidity assets remain fully audited on Casper Network.
          </p>
        </div>
      </div>

      {/* ================= BOTTOM: PROOF OF YIELD & CEP-78s ================= */}
      <div className="p-6 rounded-2xl border border-violet-500/10 bg-bg-card/30 space-y-6" id="vault-instruments-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
              <Award className="w-5 h-5 text-teal-400" />
              <span>Pool Proof of Yield</span>
            </h3>
            <p className="text-xs text-text-secondary font-light mt-0.5">
              The on-chain claims backing your yields. Every active CEP-78 NFT has legal recourse and undergoes automatic liquidations.
            </p>
          </div>

          {/* Risk Allocation Progress Bar */}
          <div className="md:w-72 space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-text-secondary">
              <span>Risk Tier Distribution</span>
              <span className="text-teal-400">
                {riskDistLoading ? '...' : `${riskDist.low}% Low • ${riskDist.medium}% Med • ${riskDist.high}% High`}
              </span>
            </div>
            {/* Multi-segmented progress bar */}
            <div className="w-full h-2 rounded-full bg-bg-deep overflow-hidden flex">
              <div className="h-full bg-teal-500" style={{ width: `${riskDist.low}%` }} />
              <div className="h-full bg-violet-500" style={{ width: `${riskDist.medium}%` }} />
              <div className="h-full bg-amber-500" style={{ width: `${riskDist.high}%` }} />
            </div>
          </div>
        </div>

        {/* Assets table */}
        <div className="overflow-x-auto border border-violet-500/10 rounded-xl bg-bg-deep/30">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-violet-500/10 bg-bg-deep/60 text-text-secondary font-mono text-[10px] uppercase">
                <th className="py-3 px-4 font-semibold">Mint Transaction</th>
                <th className="py-3 px-4 font-semibold">SME Borrower</th>
                <th className="py-3 px-4 font-semibold">Face Value</th>
                <th className="py-3 px-4 font-semibold">Asset Yield (APY)</th>
                <th className="py-3 px-4 font-semibold">Maturity Date</th>
                <th className="py-3 px-4 font-semibold">Risk Level</th>
                <th className="py-3 px-4 font-semibold text-right">Claims Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10">
              {instrumentsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-400" />
                    <span>LOADING ON-CHAIN INSTRUMENTS...</span>
                  </td>
                </tr>
              ) : activeInstruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary">
                    No active instruments backing the pool.
                  </td>
                </tr>
              ) : (
                activeInstruments.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => router.push(`/rwa/${asset.id}?from=vault`)}
                    className="hover:bg-bg-card-hover/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-text-secondary group-hover:text-teal-400 transition-colors max-w-[220px]">
                      {asset.mintTxHash ? (
                        <span className="text-teal-400 break-all">{asset.mintTxHash}</span>
                      ) : (
                        <span className="text-text-muted">PENDING_MINT</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-text-primary">{asset.issuerName}</div>
                      <div className="text-[10px] text-text-secondary">Debtor: {asset.buyerName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-primary font-semibold">
                      {asset.faceValue.toLocaleString()} {asset.currency}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-violet-400 font-bold">
                      {asset.assetApy}%
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary font-mono">
                      {formatDate(asset.maturityDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                          asset.riskLevel === 'Low'
                            ? 'bg-teal-500/10 border-teal-500/25 text-teal-400'
                            : asset.riskLevel === 'Medium'
                            ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                            : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                        }`}
                      >
                        {asset.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                          asset.claimsStatus === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-bg-card text-text-secondary border border-violet-500/10'
                        }`}
                      >
                        {asset.claimsStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
