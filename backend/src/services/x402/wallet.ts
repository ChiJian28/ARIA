import { config } from '../../config';
import logger from '../../utils/logger';

export interface PaymentProof {
  walletAddress: string;
  amount: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export interface WalletBalance {
  address: string;
  balanceMotes: string;
  balanceCspr: number;
}

let currentBalanceMotes = BigInt(50_000_000_000); // 50 CSPR initial mock balance
const totalSpentMotes = new Map<string, bigint>(); // rwaId -> total spent

export async function getWalletBalance(): Promise<WalletBalance> {
  // TODO: Replace with real x402 wallet balance query
  // Real implementation: query Casper node for account balance
  return {
    address: config.X402_WALLET_ADDRESS ?? 'mock-x402-wallet',
    balanceMotes: currentBalanceMotes.toString(),
    balanceCspr: Number(currentBalanceMotes) / 1_000_000_000,
  };
}

export async function constructPaymentProof(
  amount: string,
  providerUrl: string,
): Promise<PaymentProof> {
  // TODO: Replace with real x402 payment proof construction
  // Real implementation:
  // 1. Build a Casper transfer deploy to the provider's payment address
  // 2. Sign with x402 wallet key
  // 3. Encode proof in X-Payment header format
  const nonce = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();

  const proof: PaymentProof = {
    walletAddress: config.X402_WALLET_ADDRESS ?? 'mock-x402-wallet',
    amount,
    nonce,
    timestamp,
    signature: `mock-sig-${nonce}`,
  };

  // Deduct from mock balance
  currentBalanceMotes -= BigInt(amount);

  logger.debug('x402 payment proof constructed', {
    providerUrl,
    amount,
    newBalance: currentBalanceMotes.toString(),
  });

  return proof;
}

export function encodePaymentHeader(proof: PaymentProof): string {
  // TODO: Implement real x402 X-Payment header encoding
  // Format: base64(JSON.stringify(proof))
  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

export function trackSpend(rwaId: string, amountMotes: string): void {
  const current = totalSpentMotes.get(rwaId) ?? BigInt(0);
  totalSpentMotes.set(rwaId, current + BigInt(amountMotes));
}

export function getTotalSpend(rwaId: string): string {
  return (totalSpentMotes.get(rwaId) ?? BigInt(0)).toString();
}

export async function ensureSufficientBalance(requiredMotes: string): Promise<void> {
  const balance = await getWalletBalance();
  const required = BigInt(requiredMotes);
  const available = BigInt(balance.balanceMotes);

  if (available < required) {
    // TODO: Implement auto top-up from vault reserve
    // Real implementation: trigger on-chain transfer from protocol reserve to x402 wallet
    logger.warn('x402 wallet balance low', {
      available: balance.balanceMotes,
      required: requiredMotes,
    });
    throw new Error(`Insufficient x402 wallet balance: ${balance.balanceCspr} CSPR available, need ${Number(required) / 1e9} CSPR`);
  }
}
