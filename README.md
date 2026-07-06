# ARIA — Autonomous RWA Intelligence Agent

> **A $50,000 invoice sits in a drawer. A factory waits for cash. A bank wants three weeks of paperwork.**
>
> ARIA closes that gap in minutes — not with another dashboard, but with a **council of AI agents** that read the invoice, pay for credit data, vote on-chain, mint a collateralized NFT, and route liquidity from a DeFi vault. Every decision is signed. Every asset is auditable. Every yield is real cash flow from settled invoices — on **Casper**.

Built for the [Casper Agentic Buildathon 2026](https://www.casper.network/ai) · Casper Testnet · Open source.


## Problem Statement

Small and mid-sized enterprises (SMEs) worldwide rely on **trade finance** — invoices, purchase orders, and receivables — to keep operations running. Yet accessing liquidity against these assets remains painfully slow:

- **Manual underwriting** takes days or weeks; credit committees are expensive and opaque.
- **Off-chain paperwork** doesn't travel — investors can't verify claims or enforce recourse digitally.
- **DeFi liquidity** exists, but lacks a trust layer for real-world assets: who validates the invoice? Who prices the risk? Who signs on-chain?

The result: idle capital on one side, unfunded invoices on the other, and no autonomous bridge between them.


## Solution

**ARIA** (Autonomous RWA Intelligence Agent) is an agentic underwriting and liquidity platform on Casper Network. Agents don't just advise — they **analyze, pay, vote, sign, monitor, and settle** autonomously. Humans submit invoices and deposit liquidity; everything in between is agent-driven and on-chain auditable.

### End-to-end flow

1. **Submit** — An SME uploads a trade finance document (PDF/XML/JSON). Gemini extracts structured fields; a SHA-256 hash anchors provenance.
2. **Council deliberates** — Risk, Valuation, and Compliance agents run in parallel, each producing an APPROVE/REJECT vote with reasoning.
3. **Consensus → chain** — The Orchestrator synthesizes votes with Gemini. Approved assets trigger: council vote finalization on `AgentCouncil`, **CEP-78 NFT mint** on `RwaRegistry`, collateral lock in `LiquidityVault`, and instrument registration in `SettlementEngine`.
4. **Earn yield** — LP depositors fund the pool. At maturity, settlement repays principal + interest; net yield distributes pro-rata to ARIA-LP holders.

The **Observatory** streams live agent deliberations via SSE. The **Vault** shows TVL, utilization, and on-chain proof of every funded claim.

### What makes ARIA different

**Agents pay for their own data (x402)**  
Risk, Valuation, and Compliance agents don't scrape free APIs — they settle **x402 micropayments** before every external call (credit bureau, FX rates, KYC, market data). Each payment carries cryptographic proof; larger amounts settle on-chain in CSPR. Data acquisition is machine-to-machine commerce, built into the underwriting pipeline — not a demo sidebar.

**Agents make binding decisions — humans don't underwrite**  
Each council agent holds its own ED25519 key, runs Gemini inference on paid data, and **casts a real on-chain vote** via `AgentCouncil`. The Orchestrator only synthesizes consensus — it does not override specialist votes. Approval requires council quorum (3-of-3 votes); only then does the pipeline mint the RWA NFT, lock vault collateral, and register the instrument. The human appears at submission and deposit — not in the credit committee.

**Sentinel Agent — 24/7 post-approval monitoring**  
After an asset goes ACTIVE, the **Sentinel** runs on a scheduled BullMQ job (`sentinel-scan`). It re-evaluates live positions with Gemini, emits `SENTINEL_ALERT` events to the Observatory, and can **trigger on-chain liquidation** when risk delta exceeds the configured threshold — protecting LP capital without manual intervention.

**Agent Reputation — on-chain accountability loop**  
Every council vote is recorded in Postgres and on-chain. When an RWA reaches a terminal outcome (settled or defaulted), `scoreAgentReputationsForRwa()` scores each agent: **APPROVE on a repaid asset = correct; REJECT on a default = correct**. Scores persist in `agent_reputation` and sync to `RwaRegistry.update_reputation` on Casper Testnet. Over time, agents build a verifiable track record — a self-improving meritocracy for AI underwriters.

**Automated Settlement — real yield, not synthetic APY**  
The `settlement-check` cron scans matured instruments and runs `settleMaturedRwa()`: on-chain repayment via `SettlementEngine`, yield received into the vault, collateral released, and **pro-rata yield distributed** to LP positions (`distributeYieldToLps`). Pool Yield Realized and per-wallet YIELD EARNED reflect actual settled cash flows — the 18% APY shown in the Vault is a forward estimate until invoices mature.


## Tech Stack

| Layer | Technology | Role in ARIA |
|-------|------------|--------------|
| **Frontend** | Next.js 16 · React 19 · Tailwind · TanStack Query · Zustand | Dashboard: Submit · Observatory · Vault · Portfolio |
| **Backend** | Node.js · Express · TypeScript · BullMQ · node-cron | REST API, job queues, agent orchestration |
| **Database** | PostgreSQL (Supabase) | RWA submissions, agent votes, vault positions, settlement events |
| **Queue / Cache** | Redis (Upstash) + BullMQ | `rwa-pipeline` · `sentinel-scan` · `settlement-check` workers |
| **LLM** | Google Gemini 2.5 Flash | Agent reasoning, document parsing, council synthesis |
| **Blockchain** | Casper Testnet · casper-js-sdk | Deploys, queries, wallet signing |
| **Smart Contracts** | Odra (Rust/WASM) | RWA Registry · Agent Council · Liquidity Vault · Settlement Engine |

### Casper AI Toolkit Usage

| Toolkit Component | How ARIA Uses It |
|-------------------|------------------|
| **x402 Micropayments** | Risk, Valuation, and Compliance agents pay per API request before fetching credit, FX, KYC, and market data. Supports signed deploy proofs (< 2.5 CSPR) and on-chain transfers for larger amounts. |
| **MCP Servers** | MCP client layer for blockchain queries and trade operations — contract state reads, vote counts, deploy submission. Initialized at backend startup alongside agent workers. |
| **CSPR.click / Agent Keys** | Each agent (Risk, Valuation, Compliance, Orchestrator, Sentinel) holds its own ED25519 key pair. Agents sign and broadcast on-chain council votes autonomously. |
| **CSPR.cloud APIs** | Deploy status polling, node RPC streaming, and event watching for transaction finality during mint, lock, and settlement flows. |
| **Odra Framework** | Four production contracts compiled to WASM and deployed on Casper Testnet: NFT registry, voting council, LP vault, and maturity settlement. |


## Architecture


![ARIA Architecture](./architecture.svg)



## Demo

<!-- Replace with your public demo video URL before submission -->
> 🎬 **Demo video:** *[Coming soon — link to YouTube/Loom walkthrough]*

**Suggested walkthrough (≈ 3 min):**

1. Connect Casper Wallet → deposit CSPR into the Liquidity Vault
2. Submit a sample invoice → watch the Observatory council vote live
3. Show on-chain mint tx + collateral lock in Pool Proof table
4. Highlight x402 micropayment flow in backend logs
5. End on Vault stats: TVL, utilization, expected APY

**Live app (Testnet):** *[Add deployed frontend URL]*  
**Backend health:** `GET /api/health`


## Installation

### Prerequisites

- Node.js 20+
- Casper Wallet extension (testnet CSPR for gas + vault deposits)
- Gemini API key
- Deployer + agent key pairs (see scripts below)
- **Database:** local Docker *or* [Supabase](https://supabase.com) Postgres
- **Redis:** local Docker *or* [Upstash](https://upstash.com) Redis

### 1. Clone & install

```bash
git clone https://github.com/ChiJian28/ARIA.git
cd ARIA

cd backend && npm install
cd ../frontend && npm install
```

### 2. Infrastructure

**Option A — Local Docker (dev)**

```bash
cd backend
docker compose up -d   # Postgres :5433 · Redis :6379
```

**Option B — Cloud (demo / deploy)**

Use Supabase connection string + Upstash `rediss://` URL in `.env` (see `.env.example`).

### 3. Backend configuration

```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, GEMINI_API_KEY, contract hashes, agent key paths
```

Generate keys and deploy contracts (Testnet):

```bash
npm run generate-deployer-key
npm run generate-keys
npm run deploy-contracts
npm run register-agents
npm run fund-agents
```

Start the backend (runs migrations, BullMQ workers, cron schedulers, SSE listener):

```bash
npm run dev    # http://localhost:3001
```

### 4. Frontend configuration

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXT_PUBLIC_CSPR_ENV=testnet" >> .env.local
npm run dev    # http://localhost:3000
```


## Future Roadmap

| Item | Notes |
|------|-------|
| **Real third-party APIs** | Replace local gateway mocks with live Credit Bureau, FX, KYC, and Market Data providers |
| **Mobile-responsive UI** | Current dashboard is desktop-first; optimize Observatory theater and Vault for mobile |
| **More asset types** | Extend beyond invoices to purchase orders and trade receivables|
| **Live MCP integration** | Extend the current `casper-js-sdk` + CSPR.cloud integration by adopting the production Casper MCP Server and CSPR.trade MCP for agent-native blockchain interactions. |