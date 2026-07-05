export type CouncilTabId = 'risk' | 'compliance' | 'valuation' | 'sentinel';

export interface X402OracleRow {
  name: string;
  cost: string;
  free?: boolean;
}

export interface CouncilAgentProfile {
  id: CouncilTabId;
  label: string;
  tag: string;
  reputationNft: string;
  nftLink: string;
  accuracy: number;
  assetsEvaluatedUsd: number;
  orbColorClass: string;
  pingColor: string;
  innerColor: string;
  oracleSubtitle: string;
  oracles: X402OracleRow[];
  voiceover: string;
  terminalLines: string[];
}

export const DEMO_TICKER_EVENTS = [
  { type: 'x402' as const, text: 'Risk Agent paid 0.05 CSPR via x402 · credit bureau API' },
  { type: 'tvl' as const, text: 'TVL: $128,450 CSPR · 4 agents active on testnet' },
  { type: 'vote' as const, text: 'Valuation Agent voted APPROVE on Invoice #812 · confidence 94%' },
  { type: 'x402' as const, text: 'Compliance Agent paid 0.10 CSPR via x402 · KYC/AML provider' },
  { type: 'chain' as const, text: 'Multi-sig consensus reached · TX 0x8b5c…f6a3 confirmed' },
  { type: 'sentinel' as const, text: 'Sentinel Agent monitoring 3 active collateral positions' },
];

export const COUNCIL_AGENT_PROFILES: CouncilAgentProfile[] = [
  {
    id: 'risk',
    label: 'Risk Agent',
    tag: '🛡️ Security Level: Critical',
    reputationNft: 'CEP-78 NFT: 0x8B5...F6A',
    nftLink: 'https://testnet.cspr.live/contract/0x8B530a12e345fcbf8bda1234ea7890cfbde12845c',
    accuracy: 97.2,
    assetsEvaluatedUsd: 12_400_000,
    orbColorClass: 'from-orange-500/30 to-orange-700/20 border-orange-500/40 shadow-[0_0_25px_rgba(249,115,22,0.6)]',
    pingColor: 'bg-orange-500',
    innerColor: 'bg-orange-500',
    oracleSubtitle: 'Data Oracles & x402 Micropayments',
    oracles: [
      { name: 'Dun & Bradstreet API', cost: '0.05 CSPR / call' },
      { name: 'Casper MCP Server', cost: 'Free', free: true },
    ],
    voiceover: 'Fully autonomous data retrieval using x402 cryptographic payment proofs.',
    terminalLines: [
      '[14:02:11] RISK_AGENT: Assessed Invoice #104.',
      'Counterparty risk low.',
      'Generating approval payload...',
      'Signed TX: 0x3f2a…9c1d',
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance Agent',
    tag: '⚖️ Regulatory Level: Strict',
    reputationNft: 'CEP-78 NFT: 0x33c...7E0',
    nftLink: 'https://testnet.cspr.live/contract/0x33c7e09abdf764352f10b75da901fc8ebdfef8e1',
    accuracy: 100.0,
    assetsEvaluatedUsd: 11_800_000,
    orbColorClass: 'from-teal-500/30 to-teal-700/20 border-teal-500/40 shadow-[0_0_25px_rgba(20,184,166,0.6)]',
    pingColor: 'bg-teal-500',
    innerColor: 'bg-teal-500',
    oracleSubtitle: 'Sanctions & PEP Registries',
    oracles: [
      { name: 'OFAC Watchlist Oracle', cost: '0.02 CSPR / query' },
      { name: 'World-Check Realtime API', cost: '0.08 CSPR / call' },
    ],
    voiceover: 'Autonomous compliance gates triggered automatically on Casper Network.',
    terminalLines: [
      '[14:03:02] COMPLIANCE_AGENT: KYC verification passed for Invoice #104.',
      'No AML matches found.',
      'Voted Approved.',
    ],
  },
  {
    id: 'valuation',
    label: 'Valuation Agent',
    tag: '📊 Audit Level: High Precision',
    reputationNft: 'CEP-78 NFT: 0x55d...2BA',
    nftLink: 'https://testnet.cspr.live/contract/0x55d2ba8b12fcf45214efcdb87311ef3ab9c21efc',
    accuracy: 98.1,
    assetsEvaluatedUsd: 12_100_000,
    orbColorClass: 'from-fuchsia-500/30 to-fuchsia-700/20 border-fuchsia-500/40 shadow-[0_0_25px_rgba(217,70,239,0.6)]',
    pingColor: 'bg-fuchsia-500',
    innerColor: 'bg-fuchsia-500',
    oracleSubtitle: 'Liquidity & FX Valuation Oracles',
    oracles: [
      { name: 'Casper Defi Pools Price Index', cost: 'Free', free: true },
      { name: 'Reuters FX Exchange Oracle', cost: '0.03 CSPR / call' },
    ],
    voiceover: 'Ensuring collateral precision and managing FX drift in multi-currency settlements.',
    terminalLines: [
      '[14:04:15] VALUATION_AGENT: Discounting invoice at 85.3% Face Value.',
      'Generating pricing payload.',
      'Signed.',
    ],
  },
  {
    id: 'sentinel',
    label: 'Sentinel Agent',
    tag: '🔒 Consensus Level: Guarded',
    reputationNft: 'CEP-78 NFT: 0x9a8...3C5',
    nftLink: 'https://testnet.cspr.live/contract/0x9a82ba8b12fcf45214efcdb87311ef3ab9c21efc',
    accuracy: 99.9,
    assetsEvaluatedUsd: 12_400_000,
    orbColorClass: 'from-violet-500/30 to-violet-700/20 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.6)]',
    pingColor: 'bg-violet-500',
    innerColor: 'bg-violet-500',
    oracleSubtitle: 'Multisig Guard & Gas Relays',
    oracles: [
      { name: 'Casper Node Signature Validator', cost: 'Free', free: true },
      { name: 'Gas Price Oracle', cost: '0.01 CSPR / call' },
    ],
    voiceover: 'Enforcing the 3-of-4 multisig threshold and executing final state commitment.',
    terminalLines: [
      '[14:05:22] SENTINEL_AGENT: Threshold reached.',
      'Relaying Casper deployment package to on-chain pool.',
    ],
  },
];

export const PIPELINE_STEPS = [
  {
    step: 1,
    title: 'SME Invoice Submission',
    desc: 'A borrower uploads their PDF invoice to ARIA. The raw metadata (Face Value, Debtor balance sheets, maturity conditions) is immediately structured into a standardized, machine-readable JSON object on-chain.',
    tag: 'Off-chain → Schema',
  },
  {
    step: 2,
    title: 'Autonomous Swarm Swotting',
    desc: 'Four specialized AI agents inspect the proposal. Next to auditing risk, agents send x402 Micropayments to on-chain identity and credit registry oracles.',
    tag: 'x402 · Gemini AI',
  },
  {
    step: 3,
    title: 'Casper Consensus Multi-Sig',
    desc: 'If the required approval threshold is reached, the council signs a Casper deployment package. The multisig deploy requires cryptographic approvals to unlock capital and issue contract state.',
    tag: 'On-chain Vote',
  },
  {
    step: 4,
    title: 'Funding & Yield Distribution',
    desc: 'Approved RWAs mint as CEP-78 NFTs. Liquid funds are instantly disbursed to the SME borrower on Casper. Concurrently, a secure CEP-78 NFT mapping the collateral is locked in the vault, with yield systematically accruing back to liquidity providers.',
    tag: 'CEP-78 · CEP-18',
  },
];
