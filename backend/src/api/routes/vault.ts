import { Router, Request, Response, NextFunction } from 'express';
import { vaultRepo } from '../../db/repositories/vault.repo';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { ApiError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import {
  VaultPrepareDepositSchema,
  VaultPrepareWithdrawSchema,
  VaultSubmitSchema,
} from '../../utils/validators';
import {
  buildUnsignedDepositDeploy,
  buildUnsignedWithdrawDeploy,
  estimateCsprForWithdraw,
  estimateLpForDeposit,
  submitSignedVaultDeploy,
} from '../../blockchain/contracts/liquidity-vault';
import { getDeployStatus } from '../../services/cspr-cloud/node-api';
import { sseEmitter } from '../sse/emitter';
import { getVaultInstruments, getVaultRiskDistribution } from '../../services/vault/instruments';
import { computeWeightedPoolApy, DEFAULT_POOL_APY } from '../../services/vault/pool-apy';
import { getUserYieldTrend } from '../../services/vault/yield-trend';
import logger from '../../utils/logger';

export const vaultRouter = Router();

async function getVaultRatio(): Promise<{ totalCspr: bigint; totalLp: bigint }> {
  const tvl = await vaultRepo.getTVL();
  return {
    totalCspr: BigInt(tvl.totalCspr || '0'),
    totalLp: BigInt(tvl.totalCspr || '0'), // 1:1 LP tracking in DB mirrors pool ratio baseline
  };
}

// GET /vault/stats
vaultRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [tvl, totalYield, lockedMotes, collateralClaims, instruments] = await Promise.all([
      vaultRepo.getTVL(),
      vaultRepo.getYieldAccrued(),
      rwaRepo.getTotalLockedCollateralMotes(),
      rwaRepo.countCollateralClaims(),
      getVaultInstruments(DEFAULT_POOL_APY),
    ]);

    const tvlCspr = Number(tvl.totalCspr) / 1_000_000_000;
    const lockedCspr = Number(lockedMotes) / 1_000_000_000;
    const poolApy = computeWeightedPoolApy(instruments);
    const utilizationPct = tvlCspr > 0
      ? Math.min(100, Math.round((lockedCspr / tvlCspr) * 100))
      : 0;

    res.json({
      success: true,
      data: {
        tvlMotes: tvl.totalCspr,
        tvlCspr: tvlCspr.toFixed(2),
        totalLpTokens: tvl.totalCspr,
        activePositions: tvl.totalPositions,
        activeCollateral: collateralClaims,
        lockedCsprMotes: lockedMotes,
        lockedCspr: lockedCspr.toFixed(2),
        utilizationPct,
        currentApy: poolApy,
        totalYieldEarned: totalYield,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /vault/instruments — funded collateral with per-asset APY and risk level
vaultRouter.get('/instruments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instruments = await getVaultInstruments(DEFAULT_POOL_APY);
    const poolApy = computeWeightedPoolApy(instruments);
    res.json({ success: true, data: instruments, count: instruments.length, poolApy });
  } catch (err) {
    next(err);
  }
});

// GET /vault/risk-distribution — portfolio risk tier breakdown (Low / Medium / High %)
vaultRouter.get('/risk-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instruments = await getVaultInstruments(DEFAULT_POOL_APY);
    const poolApy = computeWeightedPoolApy(instruments);
    const distribution = await getVaultRiskDistribution(poolApy);
    res.json({ success: true, data: distribution });
  } catch (err) {
    next(err);
  }
});

// GET /vault/yield-trend?address=...&days=7 — LP cumulative yield over recent days
vaultRouter.get('/yield-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = typeof req.query.address === 'string' ? req.query.address : undefined;
    const days = Math.min(30, Math.max(1, parseInt(String(req.query.days ?? '7'), 10) || 7));
    const trend = await getUserYieldTrend(address, days);
    res.json({ success: true, data: trend, days });
  } catch (err) {
    next(err);
  }
});

// GET /vault/positions/:address
vaultRouter.get('/positions/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const position = await vaultRepo.getPosition(req.params.address);
    if (!position) {
      res.json({ success: true, data: null, message: 'No position found for this address' });
      return;
    }
    res.json({ success: true, data: position });
  } catch (err) {
    next(err);
  }
});

// POST /vault/deposit — build unsigned on-chain deposit deploy
vaultRouter.post(
  '/deposit',
  validateBody(VaultPrepareDepositSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address, amountMotes } = req.body as { address: string; amountMotes: string };

      const amount = BigInt(amountMotes);
      if (amount <= 0n) throw new ApiError(400, 'amountMotes must be greater than zero');

      const { totalCspr, totalLp } = await getVaultRatio();
      const estimatedLpTokens = estimateLpForDeposit(amount, totalCspr, totalLp).toString();

      let unsignedDeploy: Record<string, unknown>;
      try {
        unsignedDeploy = buildUnsignedDepositDeploy(amountMotes, address);
      } catch (err) {
        logger.error('Failed to build deposit deploy', { error: (err as Error).message });
        throw new ApiError(503, 'Vault contract not available. Deploy contracts to testnet first.');
      }

      res.json({
        success: true,
        data: {
          unsignedDeploy,
          estimatedLpTokens,
          amountMotes,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /vault/withdraw — build unsigned on-chain withdraw deploy
vaultRouter.post(
  '/withdraw',
  validateBody(VaultPrepareWithdrawSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address, lpTokenAmountMotes } = req.body as {
        address: string;
        lpTokenAmountMotes: string;
      };

      const lpAmount = BigInt(lpTokenAmountMotes);
      if (lpAmount <= 0n) throw new ApiError(400, 'lpTokenAmountMotes must be greater than zero');

      const position = await vaultRepo.getPosition(address);
      if (!position) throw new ApiError(404, 'No vault position found for this address');

      const held = BigInt(position.lpTokens ?? '0');
      if (lpAmount > held) throw new ApiError(400, 'Insufficient LP token balance');

      const { totalCspr, totalLp } = await getVaultRatio();
      const estimatedCspr = estimateCsprForWithdraw(lpAmount, totalCspr, totalLp).toString();

      let unsignedDeploy: Record<string, unknown>;
      try {
        unsignedDeploy = buildUnsignedWithdrawDeploy(lpTokenAmountMotes, address);
      } catch (err) {
        logger.error('Failed to build withdraw deploy', { error: (err as Error).message });
        throw new ApiError(503, 'Vault contract not available. Deploy contracts to testnet first.');
      }

      res.json({
        success: true,
        data: {
          unsignedDeploy,
          estimatedCspr,
          lpTokenAmountMotes,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /vault/submit — submit wallet-signed deploy, respond immediately, confirm via SSE
vaultRouter.post(
  '/submit',
  validateBody(VaultSubmitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as {
        signedDeploy: unknown;
        address: string;
        operation: 'deposit' | 'withdraw';
        amountMotes?: string;
        lpTokenAmountMotes?: string;
        estimatedLpTokens?: string;
        estimatedCspr?: string;
      };

      logger.info('[vault/submit] Received signed deploy', {
        operation: body.operation,
        address: body.address,
        amountMotes: body.amountMotes,
        lpTokenAmountMotes: body.lpTokenAmountMotes,
      });

      // Submit deploy to network — returns deployHash once accepted by the node.
      // Does NOT wait for block finality (which can take 60-120s) to avoid HTTP timeouts.
      let deployHash: string;
      try {
        deployHash = await submitSignedVaultDeploy(body.signedDeploy);
      } catch (submitErr) {
        const msg = (submitErr as Error).message;
        if (msg.includes('Invalid Deploy')) {
          throw new ApiError(
            400,
            'Deploy rejected by testnet node (Invalid Deploy). Re-prepare the transaction and sign again — stale or under-gassed deploys are rejected before execution.',
          );
        }
        throw submitErr;
      }

      logger.info('[vault/submit] Deploy submitted — responding to frontend immediately', {
        deployHash,
        operation: body.operation,
      });

      // Respond to frontend immediately with "submitted" status.
      res.json({
        success: true,
        data: { deployHash, status: 'submitted' },
      });

      // Background: poll getDeployStatus until confirmed/failed/timeout.
      // Casper testnet SSE is unreliable (frequent disconnects), so we poll directly
      // instead of waiting for the SSE DeployProcessed event.
      const op = body.operation;
      const addr = body.address;

      const emitConfirmation = async (confirmed: boolean, failError?: string) => {
        try {
          if (confirmed) {
            if (op === 'deposit') {
              const lp = body.estimatedLpTokens ?? body.amountMotes ?? '0';
              const cspr = body.amountMotes ?? '0';
              const position = await vaultRepo.upsertPosition(addr, lp, cspr);
              sseEmitter.emit('VAULT_EVENT', {
                type: 'VAULT_EVENT',
                data: { event: 'vault_deposit_confirmed', address: addr, deployHash, amountMotes: cspr, lpTokens: lp, position },
                timestamp: new Date().toISOString(),
              });
              logger.info('[vault/submit] Vault deposit confirmed on-chain', { deployHash, address: addr });
            } else {
              const lp = body.lpTokenAmountMotes ?? '0';
              const cspr = body.estimatedCspr ?? lp;
              const position = await vaultRepo.subtractPosition(addr, lp, cspr);
              sseEmitter.emit('VAULT_EVENT', {
                type: 'VAULT_EVENT',
                data: { event: 'vault_withdraw_confirmed', address: addr, deployHash, lpTokenAmountMotes: lp, estimatedCspr: cspr, position },
                timestamp: new Date().toISOString(),
              });
              logger.info('[vault/submit] Vault withdraw confirmed on-chain', { deployHash, address: addr });
            }
          } else if (failError) {
            sseEmitter.emit('VAULT_EVENT', {
              type: 'VAULT_EVENT',
              data: { event: `vault_${op}_failed`, address: addr, deployHash, error: failError },
              timestamp: new Date().toISOString(),
            });
            logger.error('[vault/submit] Vault operation failed on-chain', { deployHash, operation: op, error: failError });
          } else {
            // Polling timed out — deploy is on the network but unconfirmed.
            sseEmitter.emit('VAULT_EVENT', {
              type: 'VAULT_EVENT',
              data: {
                event: `vault_${op}_pending`,
                address: addr,
                deployHash,
                message: 'Transaction is on the network but confirmation is taking longer than expected.',
                trackUrl: `https://testnet.cspr.live/deploy/${deployHash}`,
              },
              timestamp: new Date().toISOString(),
            });
            logger.warn('[vault/submit] Vault operation unconfirmed after polling timeout', { deployHash, operation: op });
          }
        } catch (dbErr) {
          logger.error('[vault/submit] Failed to update vault position', { deployHash, error: (dbErr as Error).message });
        }
      };

      // Kick off background polling — does NOT block the HTTP response above.
      // Poll every POLL_INTERVAL_MS up to MAX_ATTEMPTS times.
      // Each poll streams info_get_deploy (~377KB, ~80s on testnet) and checks
      // Casper 2.x (Version2/error_message) and 1.x (execution_results/Success) formats.
      const INITIAL_DELAY_MS = 15_000;   // wait 15s before first check (give node time to process)
      const POLL_INTERVAL_MS = 10_000;   // 10s between retries
      const MAX_ATTEMPTS = 10;            // up to 10 polls ≈ ~15 min max

      void (async () => {
        logger.info('[vault/submit] Starting background polling for deploy finality', {
          deployHash,
          initialDelayMs: INITIAL_DELAY_MS,
          maxAttempts: MAX_ATTEMPTS,
        });

        await new Promise((r) => setTimeout(r, INITIAL_DELAY_MS));

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          logger.info('[vault/submit] Polling deploy status', { deployHash, attempt, maxAttempts: MAX_ATTEMPTS });
          const status = await getDeployStatus(deployHash);
          logger.info('[vault/submit] Poll result', { deployHash, attempt, status });

          if (status === 'success') {
            await emitConfirmation(true);
            return;
          }
          if (status === 'failure') {
            await emitConfirmation(false, 'On-chain execution failed');
            return;
          }

          // Still pending — wait before next attempt
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
        }

        // All attempts exhausted — treat as unconfirmed
        logger.warn('[vault/submit] Deploy still pending after all polling attempts', { deployHash });
        await emitConfirmation(false, undefined);
      })();
    } catch (err) {
      logger.error('[vault/submit] Unhandled error during deploy submission', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      next(err);
    }
  },
);
