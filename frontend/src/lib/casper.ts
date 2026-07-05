'use client';

/** Casper Wallet SignatureResponse — NOT a full signed deploy JSON. */
export type SignatureResponse =
  | { cancelled: true }
  | {
      cancelled: false;
      signatureHex: string;
      signature?: Uint8Array;
    };

/** CSPR.click SignResult — may include deploy or signatureHex. */
export type ClickSignResult = {
  cancelled: boolean;
  signatureHex?: string | null;
  signature?: Uint8Array | null;
  deploy?: Record<string, unknown> | null;
  transaction?: Record<string, unknown> | null;
  error?: string | null;
};

export interface CasperWalletInstance {
  requestConnection: () => Promise<boolean>;
  getActivePublicKey: () => Promise<string>;
  disconnectFromSite: () => Promise<boolean>;
  isConnected: () => Promise<boolean>;
  sign(
    deploy: string | Record<string, unknown>,
    signingPublicKey: string,
  ): Promise<string | SignatureResponse | ClickSignResult | Record<string, unknown>>;
}

declare global {
  interface Window {
    CasperWalletProvider?: () => CasperWalletInstance;
  }
}

export function walletCanSign(): boolean {
  return typeof window !== 'undefined' && !!window.CasperWalletProvider;
}

/** Normalize deploy JSON to `{ deploy: ... }` shape expected by Casper Wallet + SDK. */
export function normalizeDeployJson(input: Record<string, unknown>): Record<string, unknown> {
  if (input.deploy && typeof input.deploy === 'object') {
    return input;
  }
  return { deploy: input };
}

function normalizePublicKeyHex(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Determine the algo tag prefix from the signer's public key hex.
 * Ed25519 keys start with "01", secp256k1 keys start with "02".
 */
function algoTagFromPublicKey(signerPublicKey: string): string {
  return signerPublicKey.trim().toLowerCase().startsWith('02') ? '02' : '01';
}

/**
 * Ensure signature hex has the correct "01"/"02" algo-tag prefix.
 * Casper Wallet returns raw signature bytes (no prefix) — SDK's deployFromJson
 * expects the tagged format: tagByte + rawSigHex.
 *
 * Both Ed25519 and secp256k1 raw signatures are 64 bytes = 128 hex chars.
 * Tagged = tag byte (2 hex) + 64-byte sig (128 hex) = 130 hex chars for BOTH.
 * Old bug used 132 for secp256k1, causing double-prefix of already-tagged sigs.
 */
function ensureTaggedSignatureHex(sigHex: string, signerPublicKey: string): string {
  const lower = sigHex.toLowerCase();
  const tag = algoTagFromPublicKey(signerPublicKey);
  // 130 chars = 1 tag byte + 64 raw bytes — same for both Ed25519 and secp256k1
  if (lower.startsWith(tag) && lower.length === 130) {
    return lower; // already correctly tagged
  }
  return tag + lower;
}

function signatureBytesToHex(signature: Uint8Array, signerPublicKey: string): string {
  const hex = Array.from(signature)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return ensureTaggedSignatureHex(hex, signerPublicKey);
}

/** Parse wallet sign() return — object, JSON string, or SignatureResponse. */
export function parseWalletSignResult(signed: unknown): Record<string, unknown> {
  if (typeof signed === 'string') {
    try {
      return JSON.parse(signed) as Record<string, unknown>;
    } catch {
      throw new Error('Casper Wallet returned invalid JSON');
    }
  }
  if (signed && typeof signed === 'object') {
    return signed as Record<string, unknown>;
  }
  throw new Error('Casper Wallet returned an empty signature response');
}

type DeployApproval = { signer: string; signature: string };

/**
 * Casper Wallet sign() returns SignatureResponse { signatureHex }, NOT approvals[].
 * CSPR.click may return deploy.approvals or signatureHex.
 * Legacy wallets may return a full signed deploy JSON.
 */
export function extractApprovalsFromWalletResponse(
  walletResponse: Record<string, unknown>,
  signerPublicKey: string,
): DeployApproval[] {
  if (walletResponse.cancelled === true) {
    throw new Error('Transaction signing was cancelled in Casper Wallet');
  }

  if (walletResponse.error && typeof walletResponse.error === 'string') {
    throw new Error(walletResponse.error);
  }

  const signer = signerPublicKey.trim();

  if (typeof walletResponse.signatureHex === 'string' && walletResponse.signatureHex.length > 0) {
    return [{ signer, signature: ensureTaggedSignatureHex(walletResponse.signatureHex, signer) }];
  }

  if (walletResponse.signature instanceof Uint8Array && walletResponse.signature.length > 0) {
    return [{ signer, signature: signatureBytesToHex(walletResponse.signature, signer) }];
  }

  if (walletResponse.deploy && typeof walletResponse.deploy === 'object') {
    const deploy = walletResponse.deploy as Record<string, unknown>;
    if (Array.isArray(deploy.approvals) && deploy.approvals.length > 0) {
      return deploy.approvals as DeployApproval[];
    }
  }

  const normalized = normalizeDeployJson(walletResponse);
  const walletDeploy = normalized.deploy as Record<string, unknown>;
  if (Array.isArray(walletDeploy?.approvals) && walletDeploy.approvals.length > 0) {
    return walletDeploy.approvals as DeployApproval[];
  }

  if (Array.isArray(walletResponse.approvals) && walletResponse.approvals.length > 0) {
    return walletResponse.approvals as DeployApproval[];
  }

  throw new Error('Casper Wallet did not return any signatures');
}

/**
 * Attach wallet signature to the backend-built deploy (preserves valid CLValue bytes).
 */
export function mergeSignedDeploy(
  unsigned: Record<string, unknown>,
  walletResponse: Record<string, unknown>,
  signerPublicKey: string,
): Record<string, unknown> {
  const unsignedNorm = normalizeDeployJson(unsigned);
  const unsignedDeploy = unsignedNorm.deploy as Record<string, unknown>;
  const approvals = extractApprovalsFromWalletResponse(walletResponse, signerPublicKey);

  return {
    deploy: {
      ...unsignedDeploy,
      approvals,
    },
  };
}

export async function signDeployWithWallet(
  unsignedDeploy: Record<string, unknown>,
  publicKey: string,
): Promise<Record<string, unknown>> {
  if (!window.CasperWalletProvider) {
    throw new Error('Casper Wallet extension is required to sign on-chain transactions');
  }

  const provider = window.CasperWalletProvider();
  const connected = await provider.isConnected();
  if (!connected) {
    throw new Error('Casper Wallet is not connected');
  }

  const activeKey = await provider.getActivePublicKey();
  if (normalizePublicKeyHex(activeKey) !== normalizePublicKeyHex(publicKey)) {
    throw new Error(
      'Wallet active key does not match connected address. Disconnect and reconnect via Casper Wallet.',
    );
  }

  const deployJson = normalizeDeployJson(unsignedDeploy);
  const deployString = JSON.stringify(deployJson);

  let signed: unknown;
  try {
    signed = await provider.sign(deployString, publicKey);
  } catch (err) {
    const message = (err as Error).message ?? '';
    if (message.includes('not a valid JSON') || message.includes('JSON')) {
      signed = await provider.sign(deployJson, publicKey);
    } else {
      throw err;
    }
  }

  return mergeSignedDeploy(deployJson, parseWalletSignResult(signed), publicKey);
}

export function getDeployHash(deployJson: Record<string, unknown>): string | null {
  const normalized = normalizeDeployJson(deployJson);
  const deploy = normalized.deploy as Record<string, unknown>;
  return typeof deploy.hash === 'string' ? deploy.hash : null;
}
