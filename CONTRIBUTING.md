# Contributing to ARIA

ARIA is an open‑source monorepo for autonomous RWA intelligence on Casper.  
We welcome bug reports, docs, tests, and focused feature PRs.

## Repo structure
| Directory | Stack |
|-----------|-------|
| `frontend/` | Next.js 16, React 19, Tailwind |
| `backend/` | Node.js, Express, TypeScript, BullMQ |
| `contracts/` | Odra (Rust/WASM) on Casper Testnet |

Live: https://aria-rwa.vercel.app

---

## Before you start
- Read the [README](./README.md) for architecture & setup.
- Open an issue first for large changes.

## Development setup
- Node.js 20+, Docker (optional for Postgres+Redis), Casper Wallet, Gemini API key.
- Quick start:
  ```bash
  git clone https://github.com/ChiJian28/ARIA.git
  cd ARIA

  # Backend
  cd backend && npm install
  cp .env.example .env   # fill DATABASE_URL, REDIS_URL, GEMINI_API_KEY, etc.
  docker compose up -d   # optional (Postgres :5433, Redis :6379)
  npm run dev            # http://localhost:3001

  # Frontend (new terminal)
  cd frontend && npm install
  echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
  echo "NEXT_PUBLIC_CSPR_ENV=testnet" >> .env.local
  npm run dev            # http://localhost:3000
