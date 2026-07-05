import axios from 'axios';
import { config } from '../../config';
import logger from '../../utils/logger';
import type { IncomingMessage } from 'http';

const nodeClient = axios.create({
  baseURL: config.CASPER_NODE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export interface StateRootHash {
  stateRootHash: string;
  blockHash: string;
  blockHeight: number;
}

export async function getStateRootHash(): Promise<StateRootHash | null> {
  try {
    const response = await nodeClient.get<{
      last_added_block_info: {
        hash: string;
        height: number;
        state_root_hash: string;
      };
    }>('/status');

    const info = response.data.last_added_block_info;
    return {
      stateRootHash: info.state_root_hash,
      blockHash: info.hash,
      blockHeight: info.height,
    };
  } catch (err) {
    logger.warn('Failed to get state root hash', { error: (err as Error).message });
    return null;
  }
}

/**
 * Check deploy execution status by streaming info_get_deploy.
 *
 * Supports both:
 *   - Casper 1.x: execution_results[].result.{Success|Failure}
 *   - Casper 2.x (Condor): execution_result.Version2.error_message (null = success)
 *
 * We stream until we find the execution result section, then abort to avoid
 * downloading the entire ~377 KB WASM payload when not necessary.
 */
export async function getDeployStatus(deployHash: string): Promise<'success' | 'failure' | 'pending'> {
  try {
    const response = await nodeClient.post(
      '/rpc',
      { jsonrpc: '2.0', id: 1, method: 'info_get_deploy', params: { deploy_hash: deployHash } },
      { responseType: 'stream', timeout: 120_000 },
    );

    logger.debug('[getDeployStatus] Streaming info_get_deploy', { deployHash });
    const t0 = Date.now();

    return new Promise<'success' | 'failure' | 'pending'>((resolve) => {
      let buffer = '';
      let bytesRead = 0;
      let settled = false;

      const stream = response.data as IncomingMessage;

      const finish = (result: 'success' | 'failure' | 'pending', reason: string) => {
        if (settled) return;
        settled = true;
        logger.info('[getDeployStatus] Result', {
          deployHash,
          result,
          reason,
          bytesRead,
          elapsedMs: Date.now() - t0,
        });
        try { stream.destroy(); } catch { /* ignore */ }
        resolve(result);
      };

      const checkBuffer = () => {
        // ── Casper 2.x (Condor): "execution_result":{"Version2":{...,"error_message":null|"..."}}
        const v2Idx = buffer.indexOf('"execution_result"');
        if (v2Idx >= 0) {
          const excerpt = buffer.slice(v2Idx);
          // Check for Version2 wrapper (Condor format)
          if (excerpt.includes('"Version2"')) {
            // error_message null → success; error_message followed by a string → failure
            const errMsgMatch = excerpt.match(/"error_message"\s*:\s*(null|"[^"]*")/);
            if (errMsgMatch) {
              if (errMsgMatch[1] === 'null') return finish('success', 'v2_error_message_null');
              return finish('failure', `v2_error_message:${errMsgMatch[1]}`);
            }
            // Key found but value not yet streamed — keep reading
          }
        }

        // ── Casper 1.x: "execution_results":[{"result":{"Success"|"Failure":...}}]
        const v1Idx = buffer.indexOf('"execution_results"');
        if (v1Idx >= 0) {
          const excerpt = buffer.slice(v1Idx);
          if (excerpt.includes('"Success"')) return finish('success', 'v1_Success');
          if (excerpt.includes('"Failure"')) return finish('failure', 'v1_Failure');
          // Empty array = not yet executed
          const arrStart = excerpt.indexOf('[');
          if (arrStart >= 0) {
            const afterBracket = excerpt.slice(arrStart + 1).trimStart();
            if (afterBracket.startsWith(']')) return finish('pending', 'v1_empty_array');
          }
        }

        // Safety valve — if we've buffered more than 800 KB with no result, treat as pending
        if (buffer.length > 800_000) finish('pending', 'buffer_overflow');
      };

      stream.on('data', (chunk: Buffer) => {
        if (settled) return;
        bytesRead += chunk.length;
        buffer += chunk.toString();
        checkBuffer();
      });

      stream.on('end', () => {
        if (!settled) {
          // Final check on completed buffer before giving up
          checkBuffer();
          if (!settled) finish('pending', 'stream_ended_no_result');
        }
      });

      stream.on('error', (err) => {
        logger.warn('[getDeployStatus] Stream error', { deployHash, error: (err as Error).message });
        if (!settled) finish('pending', 'stream_error');
      });
    });
  } catch (err) {
    logger.warn('[getDeployStatus] Request error', { deployHash, error: (err as Error).message });
    return 'pending';
  }
}

/** Fetch on-chain revert reason after a failed deploy (Casper 1.x + 2.x). */
export async function getDeployFailureMessage(deployHash: string): Promise<string | undefined> {
  try {
    const response = await nodeClient.post<{
      result?: {
        execution_info?: {
          execution_result?: Record<string, unknown>;
        };
        execution_results?: { result?: Record<string, unknown> }[];
      };
    }>('/rpc', {
      jsonrpc: '2.0',
      id: 1,
      method: 'info_get_deploy',
      params: { deploy_hash: deployHash, finalized_approvals: false },
    });

    const info = response.data?.result;
    if (!info) return undefined;

    const executionInfo = info.execution_info as {
      execution_result?: Record<string, unknown>;
    } | undefined;

    if (executionInfo?.execution_result) {
      const er = executionInfo.execution_result;
      if ('Version2' in er) {
        const v2 = er.Version2 as { error_message?: string | null };
        return v2.error_message ?? undefined;
      }
      if ('Failure' in er) {
        const body = er.Failure as { error_message?: string };
        return body?.error_message;
      }
    }

    const results = info.execution_results;
    if (results?.length) {
      const res = results[0].result ?? {};
      if ('Failure' in res) {
        const body = res.Failure as { error_message?: string };
        return body?.error_message;
      }
    }

    return undefined;
  } catch (err) {
    logger.warn('[getDeployFailureMessage] Request error', {
      deployHash,
      error: (err as Error).message,
    });
    return undefined;
  }
}

export async function checkNodeConnectivity(): Promise<boolean> {
  try {
    const response = await nodeClient.get('/status');
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function getNamedKey(
  stateRootHash: string,
  key: string,
  path: string[],
): Promise<unknown> {
  try {
    const response = await nodeClient.post('/rpc', {
      jsonrpc: '2.0',
      id: 1,
      method: 'state_get_item',
      params: { state_root_hash: stateRootHash, key, path },
    });
    return response.data?.result?.stored_value;
  } catch (err) {
    logger.warn('Failed to get named key', { key, error: (err as Error).message });
    return null;
  }
}
