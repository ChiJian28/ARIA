import type { AssetType, RwaDetail, RwaSubmitInput, RwaSummary } from '@/types/api.types';

const SUPPORTED_JURISDICTIONS = new Set([
  'SG', 'US', 'GB', 'DE', 'FR', 'JP', 'AU', 'HK', 'CH', 'NL', 'CN', 'KR', 'IN', 'CA', 'AE',
]);

const JURISDICTION_ALIASES: Record<string, string> = {
  SINGAPORE: 'SG',
  'UNITED STATES': 'US',
  USA: 'US',
  'UNITED KINGDOM': 'GB',
  UK: 'GB',
  GERMANY: 'DE',
  FRANCE: 'FR',
  JAPAN: 'JP',
  AUSTRALIA: 'AU',
  'HONG KONG': 'HK',
  SWITZERLAND: 'CH',
  NETHERLANDS: 'NL',
  CHINA: 'CN',
  'SOUTH KOREA': 'KR',
  KOREA: 'KR',
  INDIA: 'IN',
  CANADA: 'CA',
  'UNITED ARAB EMIRATES': 'AE',
  UAE: 'AE',
};

export interface BackendRwaSubmitPayload {
  assetType: AssetType;
  ownerPublicKey: string;
  faceValue: number;
  currency: string;
  invoiceNumber?: string;
  issuerName: string;
  issuerCountry: string;
  issuerRegistrationNumber: string;
  buyerName: string;
  buyerCountry: string;
  buyerRegistrationNumber?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  documentHash?: string;
}

type BackendRwaRecord = {
  id: string;
  ownerPublicKey: string;
  assetType: AssetType;
  faceValue: number | string;
  currency: string;
  status: RwaSummary['status'];
  riskScore?: number | null;
  collateralRatio?: number | null;
  nftTokenId?: string | null;
  mintTxHash?: string | null;
  createdAt: string;
  dueDate?: string;
  buyerName?: string;
  buyerCountry?: string;
  counterpartyName?: string;
  counterpartyJurisdiction?: string;
  maturityDate?: string;
  description?: string;
  finalDecisionMemo?: string;
  votes?: RwaDetail['votes'];
};

export function parseJurisdictionCode(input: string): string {
  const parenMatch = input.match(/\(([A-Z]{2})\)/i);
  if (parenMatch) {
    const code = parenMatch[1].toUpperCase();
    if (SUPPORTED_JURISDICTIONS.has(code)) return code;
  }

  const trimmed = input.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const code = trimmed.toUpperCase();
    if (SUPPORTED_JURISDICTIONS.has(code)) return code;
  }

  const alias = JURISDICTION_ALIASES[trimmed.toUpperCase()];
  if (alias) return alias;

  return 'SG';
}

function toIsoDatetime(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

function startOfTodayUtc(): string {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today.toISOString();
}

export function toBackendSubmitPayload(input: RwaSubmitInput): BackendRwaSubmitPayload {
  const buyerCountry = parseJurisdictionCode(input.counterpartyJurisdiction);
  const issueDate = startOfTodayUtc();
  const dueDate = toIsoDatetime(input.maturityDate);
  const suffix = input.ownerPublicKey.slice(-8);

  return {
    assetType: input.assetType,
    ownerPublicKey: input.ownerPublicKey,
    faceValue: Number.parseFloat(input.faceValue),
    currency: input.currency,
    invoiceNumber: `ARIA-${Date.now().toString(36).toUpperCase()}`,
    issuerName: `Asset Originator (${suffix})`,
    issuerCountry: buyerCountry === 'DE' ? 'SG' : buyerCountry,
    issuerRegistrationNumber: 'ARIA-DEMO',
    buyerName: input.counterpartyName,
    buyerCountry,
    issueDate,
    dueDate,
    description: input.description,
    documentHash: input.documentHash,
  };
}

function normalizeRiskScore(score: number | null | undefined): number | null {
  if (score == null || Number.isNaN(score)) return null;
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

export function mapRwaSummary(raw: BackendRwaRecord): RwaSummary {
  return {
    id: raw.id,
    ownerPublicKey: raw.ownerPublicKey,
    assetType: raw.assetType,
    faceValue: String(raw.faceValue),
    currency: raw.currency,
    status: raw.status,
    riskScore: normalizeRiskScore(raw.riskScore),
    createdAt: raw.createdAt,
    maturityDate: raw.maturityDate ?? raw.dueDate ?? raw.createdAt,
  };
}

function normalizeMintFields(raw: { nftTokenId?: string | null; mintTxHash?: string | null }) {
  let mintTxHash = raw.mintTxHash ?? null;
  let nftTokenId = raw.nftTokenId ?? null;
  // Legacy rows: deploy hash was incorrectly stored as nft_token_id
  if (!mintTxHash && nftTokenId && /^[a-f0-9]{64}$/i.test(nftTokenId)) {
    mintTxHash = nftTokenId;
    nftTokenId = null;
  }
  return { mintTxHash, nftTokenId };
}

export function mapRwaDetail(raw: BackendRwaRecord): RwaDetail {
  const summary = mapRwaSummary(raw);
  const { mintTxHash, nftTokenId } = normalizeMintFields(raw);
  return {
    ...summary,
    counterpartyName: raw.counterpartyName ?? raw.buyerName ?? 'Unknown',
    counterpartyJurisdiction: raw.counterpartyJurisdiction ?? raw.buyerCountry ?? '—',
    description: raw.description ?? '',
    collateralRatio: raw.collateralRatio ?? null,
    nftTokenId,
    mintTxHash,
    finalDecisionMemo: raw.finalDecisionMemo,
    votes: raw.votes ?? [],
  };
}
