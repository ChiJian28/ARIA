import { createAgentLogger } from '../../utils/logger';
import { AgentId, VoteDecision, AgentDecision, AgentState } from '../../utils/types/agent.types';
import { agentRepo } from '../../db/repositories/agent.repo';
import { castVoteOnChain } from '../../blockchain/contracts/agent-council';
import { signVotePayload } from './signer';
import { sseEmitter } from '../../api/sse/emitter';

export abstract class BaseAgent {
  protected readonly agentId: AgentId;
  protected readonly logger: ReturnType<typeof createAgentLogger>;
  private state: AgentState;

  constructor(agentId: AgentId) {
    this.agentId = agentId;
    this.logger = createAgentLogger(agentId);
    this.state = {
      agentId,
      status: 'IDLE',
      lastActivity: new Date(),
    };
  }

  abstract run(rwaId: string, data: unknown): Promise<AgentDecision>;

  protected setState(status: AgentState['status'], rwaId?: string, error?: string): void {
    this.state = {
      agentId: this.agentId,
      status,
      currentRwaId: rwaId,
      lastActivity: new Date(),
      errorMessage: error,
    };
  }

  getState(): AgentState {
    return this.state;
  }

  protected emitEvent(type: string, data: Record<string, unknown>): void {
    const rwaId = typeof data.rwaId === 'string' ? data.rwaId : undefined;
    sseEmitter.emit(type, {
      type,
      agentId: this.agentId,
      rwaId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /** Stream human-readable CoT lines to the frontend MiniTerminal */
  protected emitStatusUpdate(rwaId: string, message: string): void {
    this.emitEvent('AGENT_STATUS_UPDATE', { rwaId, message });
  }

  async vote(
    rwaId: string,
    decision: VoteDecision,
    confidence: number,
    reasoning: string,
    rawData?: Record<string, unknown>,
    processingCostMotes?: string,
  ): Promise<{ txHash?: string; dbId: string }> {
    this.logger.info('Casting vote', {
      rwa_id: rwaId,
      vote: decision,
      confidence: confidence.toFixed(3),
    });

    // Sign the vote payload
    const sig = signVotePayload(this.agentId, rwaId, decision, confidence);

    // Submit on-chain vote
    let txHash: string | undefined;
    try {
      const deployResult = await castVoteOnChain(
        rwaId,
        decision === 'APPROVE' ? 'approve' : 'reject',
        confidence,
        sig.publicKeyHex,
        sig.keyPath,
      );
      txHash = deployResult.deployHash;
    } catch (err) {
      this.logger.warn('On-chain vote failed, proceeding with DB-only record', {
        rwa_id: rwaId,
        error: (err as Error).message,
      });
    }

    // Persist to DB
    const savedVote = await agentRepo.saveVote({
      rwaId,
      agentId: this.agentId,
      vote: decision,
      confidence,
      reasoning,
      rawData,
      processingCostMotes,
      txHash,
    });

    // Emit SSE event
    this.emitEvent('VOTE_CAST', {
      rwaId,
      agentId: this.agentId,
      vote: decision,
      confidence,
      txHash,
    });

    // Update reputation (increment total votes)
    await agentRepo.updateReputation(this.agentId, { totalVotes: 1 });

    this.logger.info('Vote recorded', { rwa_id: rwaId, txHash, dbId: savedVote.id });
    return { txHash, dbId: savedVote.id };
  }

  async getReputation() {
    return agentRepo.getReputation(this.agentId);
  }
}
