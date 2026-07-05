import { RwaStatus, AssetClass } from '../../utils/types/rwa.types';

export interface RwaSubmissionRow {
  id: string;
  owner_public_key: string;
  asset_type: AssetClass;
  face_value: string;
  currency: string;
  invoice_number: string | null;
  issuer_name: string;
  issuer_country: string;
  issuer_registration_number: string;
  buyer_name: string;
  buyer_country: string;
  buyer_registration_number: string | null;
  issue_date: Date;
  due_date: Date;
  description: string | null;
  document_hash: string | null;
  status: RwaStatus;
  nft_token_id: string | null;
  mint_tx_hash: string | null;
  collateral_locked_motes: string | null;
  lock_tx_hash: string | null;
  risk_score: string | null;
  valuation_npv: string | null;
  collateral_ratio: string | null;
  compliance_clearance: 'CLEAR' | 'FLAGGED' | 'REJECTED' | null;
  final_decision_memo: string | null;
  created_at: Date;
  updated_at: Date;
}

export function rowToSubmission(row: RwaSubmissionRow) {
  let nftTokenId = row.nft_token_id ?? undefined;
  let mintTxHash = row.mint_tx_hash ?? undefined;
  // Legacy: deploy hash was stored in nft_token_id
  if (!mintTxHash && nftTokenId && /^[a-f0-9]{64}$/i.test(nftTokenId)) {
    mintTxHash = nftTokenId;
    nftTokenId = undefined;
  }

  return {
    id: row.id,
    ownerPublicKey: row.owner_public_key,
    assetType: row.asset_type,
    faceValue: parseFloat(row.face_value),
    currency: row.currency,
    invoiceNumber: row.invoice_number ?? undefined,
    issuerName: row.issuer_name,
    issuerCountry: row.issuer_country,
    issuerRegistrationNumber: row.issuer_registration_number,
    buyerName: row.buyer_name,
    buyerCountry: row.buyer_country,
    buyerRegistrationNumber: row.buyer_registration_number ?? undefined,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    description: row.description ?? undefined,
    documentHash: row.document_hash ?? undefined,
    status: row.status,
    nftTokenId,
    mintTxHash,
    collateralLockedMotes: row.collateral_locked_motes ?? undefined,
    lockTxHash: row.lock_tx_hash ?? undefined,
    riskScore: row.risk_score ? parseFloat(row.risk_score) : undefined,
    valuationNpv: row.valuation_npv ? parseFloat(row.valuation_npv) : undefined,
    collateralRatio: row.collateral_ratio ? parseFloat(row.collateral_ratio) : undefined,
    complianceClearance: row.compliance_clearance ?? undefined,
    finalDecisionMemo: row.final_decision_memo ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
