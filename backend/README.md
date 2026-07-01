# ARIA Backend

**Autonomous RWA Intelligence Agent** — TypeScript backend for the Casper Buildathon.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Fill in your GEMINI_API_KEY and other values

# 4. Generate agent keys
npm run generate-keys

# 5. Start dev server
npm run dev
```

## Architecture

ARIA is a 4-AI-agent protocol that evaluates, approves, and monitors tokenized trade finance instruments on Casper.

### Agent Pipeline

```
RWA Submission → Orchestrator → [Risk | Valuation | Compliance] → Synthesizer → Council Vote → NFT Mint
                                                                              ↑
                                                                        Sentinel (ongoing)
```

### Directory Structure

- `src/config/` — Environment validation and configuration
- `src/agents/` — AI agent implementations (Gemini-powered)
- `src/blockchain/` — Casper SDK integration
- `src/services/` — External integrations (Gemini, x402, CSPR.cloud)
- `src/db/` — PostgreSQL database layer
- `src/api/` — Express REST API + SSE streaming
- `src/jobs/` — BullMQ background job processing
- `scripts/` — Deployment and setup utilities

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /rwa/submit | Submit new RWA for evaluation |
| GET | /rwa/:id | Get RWA status and agent votes |
| GET | /vault/stats | Vault TVL and yield metrics |
| GET | /agents | Agent list and reputation scores |
| GET | /council/pending | Pending council votes |
| GET | /sse/events | SSE stream for real-time updates |
| GET | /health | System health check |

## Environment Variables

See `.env.example` for all required configuration.

## Scripts

```bash
npm run generate-keys   # Generate ED25519 key pairs for all 4 agents
npm run register-agents # Register agents on-chain in AgentCouncil contract
npm run fund-accounts   # Fund agent accounts from testnet faucet
npm run seed-rwa        # Submit sample invoice RWA for demo
```
