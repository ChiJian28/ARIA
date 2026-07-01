import { dispatchSpecialistAgents } from './dispatcher';
import { synthesizeDecision } from './synthesizer';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { agentRepo } from '../../db/repositories/agent.repo';
import { mintRwaNft } from '../../blockchain/contracts/rwa-registry';
import { finalizeVote } from '../../blockchain/contracts/agent-council';
import { sseEmitter } from '../../api/sse/emitter';
import { getTotalSpend } from '../../services/x402/wallet';
import logger from '../../utils/logger';
import { RwaSubmission } from '../../utils/types/rwa.types';

export interface PipelineResult {
  rwaId: string;
  approved: boolean;
  weightedScore: number;
  memo: string;
  nftTokenId?: string;
  mintTxHash?: string;
  totalCostMotes: string;
  processingTimeMs: number;
}

export async function runRwaPipeline(submission: RwaSubmission): Promise<PipelineResult> {
  const startMs = Date.now();
  const rwaId = submission.id;

  logger.info('Starting RWA pipeline', { rwa_id: rwaId });

  // Update status to ANALYZING
  await rwaRepo.updateStatus(rwaId, 'ANALYZING');
  sseEmitter.emit('PIPELINE_STATUS', {
    type: 'PIPELINE_STATUS',
    rwaId,
    data: { status: 'ANALYZING', stage: 'dispatching_agents' },
    timestamp: new Date().toISOString(),
  });
  sseEmitter.emit('AGENT_STATUS_UPDATE', {
    type: 'AGENT_STATUS_UPDATE',
    agentId: 'orchestrator',
    rwaId,
    data: { rwaId, message: 'Dispatching Risk · Valuation · Compliance agents in parallel…' },
    timestamp: new Date().toISOString(),
  });

  // Step 1: Dispatch specialist agents in parallel
  const { riskDecision, valuationDecision, complianceDecision, errors } =
    await dispatchSpecialistAgents(submission);

  const decisions = [riskDecision, valuationDecision, complianceDecision];

  if (errors.length > 0) {
    logger.warn('Some agents encountered errors', { rwa_id: rwaId, errors });
  }

  // Step 2: Update status to VOTING
  await rwaRepo.updateStatus(rwaId, 'VOTING');
  sseEmitter.emit('PIPELINE_STATUS', {
    type: 'PIPELINE_STATUS',
    rwaId,
    data: { status: 'VOTING', agentResults: decisions.map((d) => ({ agentId: d.agentId, decision: d.decision })) },
    timestamp: new Date().toISOString(),
  });

  // Step 3: Synthesize final decision with Gemini
  sseEmitter.emit('AGENT_STATUS_UPDATE', {
    type: 'AGENT_STATUS_UPDATE',
    agentId: 'orchestrator',
    rwaId,
    data: { rwaId, message: 'All votes received · synthesizing council decision with Gemini…' },
    timestamp: new Date().toISOString(),
  });
  const synthesis = await synthesizeDecision(submission, decisions);

  logger.info('Council decision synthesized', {
    rwa_id: rwaId,
    approved: synthesis.approved,
    weightedScore: synthesis.weightedScore.toFixed(3),
  });

  // Step 4: Get vote data from DB for extra context
  const votes = await agentRepo.getVotesByRwa(rwaId);
  const riskVote = votes.find((v) => v.agentId === 'risk');
  const valuationVote = votes.find((v) => v.agentId === 'valuation');
  const complianceVote = votes.find((v) => v.agentId === 'compliance');

  let nftTokenId: string | undefined;
  let mintTxHash: string | undefined;

  if (synthesis.approved) {
    // Finalize on-chain council tally (best-effort — DB consensus already recorded)
    try {
      await finalizeVote(rwaId);
      logger.info('Council vote finalized on-chain', { rwa_id: rwaId });
    } catch (finalizeErr) {
      logger.warn('On-chain finalize skipped', {
        rwa_id: rwaId,
        error: (finalizeErr as Error).message,
      });
    }

    // Step 5a: Mint RWA NFT (deployer/minter key)
    const riskData = riskVote?.rawData as { probabilityOfDefault?: number; creditScore?: number } | undefined;
    const valuationData = valuationVote?.rawData as { collateralRatio?: number } | undefined;

    const approvalExtras = {
      riskScore: riskData?.probabilityOfDefault,
      valuationNpv: (valuationVote?.rawData as { netPresentValue?: number } | undefined)?.netPresentValue,
      collateralRatio: valuationData?.collateralRatio,
      complianceClearance: 'CLEAR' as const,
      finalDecisionMemo: synthesis.memo,
    };

    try {
      const mintResult = await mintRwaNft(
        rwaId,
        submission.ownerPublicKey,
        {
          rwaId,
          assetType: submission.assetType,
          faceValue: submission.faceValue.toString(),
          currency: submission.currency,
          issuerName: submission.issuerName,
          issuerCountry: submission.issuerCountry,
          buyerName: submission.buyerName,
          buyerCountry: submission.buyerCountry,
          issueDate: submission.issueDate.toISOString(),
          dueDate: submission.dueDate.toISOString(),
          riskScore: riskData?.probabilityOfDefault?.toFixed(4) ?? '0',
          collateralRatio: valuationData?.collateralRatio?.toFixed(4) ?? '0.75',
          approvedAt: new Date().toISOString(),
        },
      );

      mintTxHash = mintResult.deployHash;

      await rwaRepo.updateStatus(rwaId, 'APPROVED', {
        ...approvalExtras,
        mintTxHash,
      });

      sseEmitter.emit('NFT_MINTED', {
        type: 'NFT_MINTED',
        rwaId,
        data: { mintTxHash, memo: synthesis.headline },
        timestamp: new Date().toISOString(),
      });
    } catch (mintErr) {
      const mintError = (mintErr as Error).message;
      logger.error('Failed to mint RWA NFT', { rwa_id: rwaId, error: mintError });

      // Council approved — do NOT mark as REJECTED when only mint fails
      await rwaRepo.updateStatus(rwaId, 'APPROVED', {
        ...approvalExtras,
        finalDecisionMemo: `${synthesis.memo}\n\n⚠️ NFT mint pending: ${mintError}`,
      });

      sseEmitter.emit('AGENT_STATUS_UPDATE', {
        type: 'AGENT_STATUS_UPDATE',
        agentId: 'orchestrator',
        rwaId,
        data: { rwaId, message: `Council approved · NFT mint failed (${mintError}) — retry pending` },
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    await rwaRepo.updateStatus(rwaId, 'REJECTED', {
      finalDecisionMemo: synthesis.memo,
      complianceClearance: complianceVote?.rawData?.clearanceStatus === 'REJECTED' ? 'REJECTED' : undefined,
    });
  }

  sseEmitter.emit('CONSENSUS_REACHED', {
    type: 'CONSENSUS_REACHED',
    rwaId,
    data: {
      approved: synthesis.approved,
      weightedScore: synthesis.weightedScore,
      memo: synthesis.memo,
    },
    timestamp: new Date().toISOString(),
  });

  const totalCostMotes = getTotalSpend(rwaId);
  const processingTimeMs = Date.now() - startMs;

  logger.info('RWA pipeline complete', {
    rwa_id: rwaId,
    approved: synthesis.approved,
    processingTimeMs,
    totalCostMotes,
  });

  return {
    rwaId,
    approved: synthesis.approved,
    weightedScore: synthesis.weightedScore,
    memo: synthesis.memo,
    nftTokenId,
    mintTxHash,
    totalCostMotes,
    processingTimeMs,
  };
}
