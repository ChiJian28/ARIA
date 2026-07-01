import { z } from 'zod';

// ISO 4217 currency codes commonly used in trade finance
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY', 'AUD', 'HKD', 'CHF', 'CAD'] as const;

// Supported jurisdictions for trade finance
const SUPPORTED_JURISDICTIONS = [
  'SG', 'US', 'GB', 'DE', 'FR', 'JP', 'AU', 'HK', 'CH', 'NL',
  'CN', 'KR', 'IN', 'CA', 'AE',
] as const;

export const RwaSubmissionSchema = z.object({
  assetType: z.enum(['INVOICE', 'PURCHASE_ORDER', 'TRADE_RECEIVABLE']),
  ownerPublicKey: z.string().min(64, 'Invalid Casper public key'),
  faceValue: z.number().positive('Face value must be positive').max(10_000_000, 'Max face value is $10M'),
  currency: z.enum(SUPPORTED_CURRENCIES),
  invoiceNumber: z.string().min(1).max(100).optional(),
  issuerName: z.string().min(2).max(200),
  issuerCountry: z.enum(SUPPORTED_JURISDICTIONS),
  issuerRegistrationNumber: z.string().min(1).max(100),
  buyerName: z.string().min(2).max(200),
  buyerCountry: z.enum(SUPPORTED_JURISDICTIONS),
  buyerRegistrationNumber: z.string().min(1).max(100).optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  description: z.string().max(2000).optional(),
  documentHash: z.string().optional(),
}).refine(
  (data) => new Date(data.dueDate) > new Date(data.issueDate),
  { message: 'Due date must be after issue date', path: ['dueDate'] },
).refine(
  (data) => {
    const days = (new Date(data.dueDate).getTime() - new Date(data.issueDate).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 7 && days <= 365;
  },
  { message: 'Payment term must be between 7 and 365 days', path: ['dueDate'] },
);

export const VaultPrepareDepositSchema = z.object({
  address: z.string().min(64, 'Invalid Casper public key'),
  amountMotes: z.string().regex(/^\d+$/, 'Amount must be a positive integer string'),
});

export const VaultPrepareWithdrawSchema = z.object({
  address: z.string().min(64, 'Invalid Casper public key'),
  lpTokenAmountMotes: z.string().regex(/^\d+$/, 'LP amount must be a positive integer string'),
});

export const VaultSubmitSchema = z.object({
  signedDeploy: z.unknown(),
  address: z.string().min(64, 'Invalid Casper public key'),
  operation: z.enum(['deposit', 'withdraw']),
  amountMotes: z.string().regex(/^\d+$/).optional(),
  lpTokenAmountMotes: z.string().regex(/^\d+$/).optional(),
  estimatedLpTokens: z.string().regex(/^\d+$/).optional(),
  estimatedCspr: z.string().regex(/^\d+$/).optional(),
});

export const VaultDepositSchema = z.object({
  depositorPublicKey: z.string().min(64),
  amountMotes: z.string().regex(/^\d+$/, 'Amount must be a positive integer string'),
  signature: z.string().min(1),
});

export const AgentQuerySchema = z.object({
  agentId: z.enum(['risk', 'valuation', 'compliance', 'sentinel', 'orchestrator']).optional(),
  limit: z.string().default('20').transform(Number).refine((n) => n > 0 && n <= 100),
  offset: z.string().default('0').transform(Number),
});

export function validateCasperPublicKey(key: string): boolean {
  // Casper ED25519 public keys are 66-char hex (01 prefix + 64 char key)
  // or 68-char hex (02 prefix for SECP256K1 + 66 char key)
  return /^0[12][0-9a-fA-F]{64,66}$/.test(key);
}

export function validateDeployHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash);
}

export function validateContractHash(hash: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hash) || hash.startsWith('contract-');
}

export type RwaSubmissionInput = z.infer<typeof RwaSubmissionSchema>;
export type VaultDepositInput = z.infer<typeof VaultDepositSchema>;
