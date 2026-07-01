import axios from 'axios';
import { config } from '../../config';
import logger from '../../utils/logger';

function createCsprCloudClient() {
  return axios.create({
    baseURL: config.CSPR_CLOUD_REST_URL,
    timeout: 10000,
    headers: {
      'Authorization': `Bearer ${config.CSPR_CLOUD_API_KEY ?? 'no-key'}`,
      'Content-Type': 'application/json',
    },
  });
}

export interface CsprBlock {
  blockHash: string;
  blockHeight: number;
  timestamp: string;
  deployCount: number;
  eraId: number;
}

export interface CsprDeploy {
  deployHash: string;
  blockHash?: string;
  status: 'success' | 'failure' | 'pending';
  cost?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface CsprAccount {
  accountHash: string;
  publicKey?: string;
  mainPurse: string;
  balanceMotes: string;
}

export async function getLatestBlock(): Promise<CsprBlock | null> {
  // TODO: Replace with real CSPR.cloud API call when API key is available
  try {
    const client = createCsprCloudClient();
    const response = await client.get<{ data: CsprBlock }>('/blocks/latest');
    return response.data.data;
  } catch (err) {
    logger.warn('CSPR.cloud getLatestBlock failed', { error: (err as Error).message });
    return null;
  }
}

export async function getDeploy(deployHash: string): Promise<CsprDeploy | null> {
  try {
    const client = createCsprCloudClient();
    const response = await client.get<{ data: CsprDeploy }>(`/deploys/${deployHash}`);
    return response.data.data;
  } catch (err) {
    logger.warn('CSPR.cloud getDeploy failed', { deployHash, error: (err as Error).message });
    return null;
  }
}

export async function getAccountBalance(accountHash: string): Promise<string> {
  try {
    const client = createCsprCloudClient();
    const response = await client.get<{ data: CsprAccount }>(`/accounts/${accountHash}`);
    return response.data.data.balanceMotes;
  } catch {
    return '0';
  }
}

export async function getTokenBalances(accountHash: string): Promise<{ contractHash: string; balance: string }[]> {
  try {
    const client = createCsprCloudClient();
    const response = await client.get<{ data: { contractHash: string; balance: string }[] }>(
      `/accounts/${accountHash}/token-balances`,
    );
    return response.data.data;
  } catch {
    return [];
  }
}
