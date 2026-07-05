import { getCasperConfig } from '../../config/casper';
import { getAccountBalance } from '../../blockchain/client';
import { config } from '../../config';
import {
  buildSignedNativeTransfer,
  shouldSubmitOnChain,
  submitSignedTransfer,
} from './transfer';
import {
  getPaymentRecipientHex,
  getWalletPublicKeyHex,
  isWalletKeyAvailable,
} from './wallet-keys';
import {
  verifyOnChainDeployHash,
  verifySignedTransferDeploy,
} from './payment-verify';
import logger from '../../utils/logger';

export interface PaymentProof {
  scheme: 'casper-native-transfer-v1';
  network: string;
  payerPublicKey: string;
  recipientPublicKey: string;
  amountMotes: string;
  /** Present when transfer was submitted on-chain (amount >= 2.5 CSPR). */
  deployHash: string;
  /** Signed transfer deploy JSON — used for micropayments below network minimum. */
  signedDeploy?: string;
  settlement: 'on-chain' | 'signed';
  nonce: string;
  timestamp: number;
  /** @deprecated use payerPublicKey */
  walletAddress: string;
  /** @deprecated use amountMotes */
  amount: string;
  /** @deprecated use deployHash or signedDeploy */
  signature: string;
}

export interface WalletBalance {
  address: string;
  balanceMotes: string;
  balanceCspr: number;
  live: boolean;
}

let mockBalanceMotes = BigInt(50_000_000_000);
const totalSpentMotes = new Map<string, bigint>();

export function isWalletLive(): boolean {
  return isWalletKeyAvailable();
}

export async function getWalletBalance(): Promise<WalletBalance> {
  if (isWalletLive()) {
    const address = getWalletPublicKeyHex();
    const balanceMotes = await getAccountBalance(address);
    return {
      address,
      balanceMotes,
      balanceCspr: Number(balanceMotes) / 1_000_000_000,
      live: true,
    };
  }

  const address = config.X402_WALLET_ADDRESS ?? 'mock-x402-wallet';
  return {
    address,
    balanceMotes: mockBalanceMotes.toString(),
    balanceCspr: Number(mockBalanceMotes) / 1_000_000_000,
    live: false,
  };
}

export async function constructPaymentProof(
  amount: string,
  providerUrl: string,
  payToPublicKeyHex?: string,
): Promise<PaymentProof> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const timestamp = Date.now();
  const recipient = payToPublicKeyHex ?? getPaymentRecipientHex();

  if (isWalletLive()) {
    const payer = getWalletPublicKeyHex();
    const { signedDeployJson, deployHashHex } = buildSignedNativeTransfer(recipient, amount);

    let deployHash = deployHashHex;
    let settlement: PaymentProof['settlement'] = 'signed';

    if (shouldSubmitOnChain(amount)) {
      deployHash = await submitSignedTransfer(signedDeployJson);
      settlement = 'on-chain';
    }

    const proof: PaymentProof = {
      scheme: 'casper-native-transfer-v1',
      network: getCasperConfig().networkName,
      payerPublicKey: payer,
      recipientPublicKey: recipient,
      amountMotes: amount,
      deployHash,
      signedDeploy: signedDeployJson,
      settlement,
      nonce,
      timestamp,
      walletAddress: payer,
      amount,
      signature: deployHash,
    };

    logger.info('x402 payment proof constructed', {
      providerUrl,
      amount,
      settlement,
      deployHash,
      payer: payer.substring(0, 16) + '...',
    });

    return proof;
  }

  mockBalanceMotes -= BigInt(amount);
  const mockAddress = config.X402_WALLET_ADDRESS ?? 'mock-x402-wallet';

  const proof: PaymentProof = {
    scheme: 'casper-native-transfer-v1',
    network: 'mock',
    payerPublicKey: mockAddress,
    recipientPublicKey: recipient,
    amountMotes: amount,
    deployHash: `mock-sig-${nonce}`,
    settlement: 'signed',
    nonce,
    timestamp,
    walletAddress: mockAddress,
    amount,
    signature: `mock-sig-${nonce}`,
  };

  logger.debug('x402 mock payment proof constructed', {
    providerUrl,
    amount,
    newBalance: mockBalanceMotes.toString(),
  });

  return proof;
}

export function encodePaymentHeader(proof: PaymentProof): string {
  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

export function decodePaymentHeader(header: string): PaymentProof {
  const json = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(json) as PaymentProof;
}

/** Verify an x402 payment proof against minimum amount (gateway / server-side). */
export async function verifyPaymentProof(
  proof: PaymentProof,
  minAmountMotes: string,
  expectedRecipient?: string,
): Promise<{ valid: boolean; reason?: string }> {
  const recipient = expectedRecipient ?? getPaymentRecipientHex();
  const payer = proof.payerPublicKey ?? proof.walletAddress;

  if (proof.settlement === 'on-chain' || shouldSubmitOnChain(proof.amountMotes ?? proof.amount)) {
    const chain = await verifyOnChainDeployHash(proof.deployHash ?? proof.signature);
    if (chain.valid) return chain;
  }

  if (proof.signedDeploy) {
    return verifySignedTransferDeploy(
      proof.signedDeploy,
      minAmountMotes,
      payer,
      recipient,
    );
  }

  if (proof.deployHash?.startsWith('mock-')) {
    return { valid: false, reason: 'mock payment in live gateway mode' };
  }

  return { valid: false, reason: 'no verifiable payment material' };
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
    logger.warn('x402 wallet balance low', {
      available: balance.balanceMotes,
      required: requiredMotes,
      live: balance.live,
    });
    throw new Error(
      `Insufficient x402 wallet balance: ${balance.balanceCspr} CSPR available, need ${Number(required) / 1e9} CSPR`,
    );
  }
}
