import { DeployUtil } from 'casper-js-sdk';
import { normalizePublicKeyHex } from '../../blockchain/transactions/casper-keys';
import { getDeployStatus } from '../../services/cspr-cloud/node-api';

function decodeU512FromBytesHex(bytesHex: string): bigint {
  const buf = Buffer.from(bytesHex, 'hex');
  if (buf.length < 2) return 0n;
  const len = buf[0];
  let value = 0n;
  for (let i = 1; i <= len && i < buf.length; i++) {
    value += BigInt(buf[i]) << BigInt(8 * (i - 1));
  }
  return value;
}

function normPk(hex: string): string {
  return normalizePublicKeyHex(hex).toLowerCase();
}

export interface SignedTransferDetails {
  payerPublicKey: string;
  recipientPublicKey: string;
  amountMotes: string;
  deployHashHex: string;
  hasApproval: boolean;
}

export function parseSignedTransferDeploy(signedDeployJson: string): SignedTransferDetails | null {
  try {
    const wrapper = JSON.parse(signedDeployJson);
    const deploy = wrapper.deploy ?? wrapper;
    const transfer = deploy.session?.Transfer;
    if (!transfer?.args) return null;

    const args: Record<string, { bytes: string }> = {};
    for (const [name, val] of transfer.args as [string, { bytes: string }][]) {
      args[name] = val;
    }

    const amountMotes = decodeU512FromBytesHex(args.amount?.bytes ?? '').toString();
    const recipientPublicKey = args.target?.bytes ?? '';
    const payerPublicKey = deploy.header?.account ?? '';
    const deployHashHex = deploy.hash ?? '';

    const approvals = deploy.approvals ?? [];
    const hasApproval = Array.isArray(approvals) && approvals.length > 0;

    if (!amountMotes || !recipientPublicKey || !payerPublicKey) return null;

    return {
      payerPublicKey,
      recipientPublicKey,
      amountMotes,
      deployHashHex,
      hasApproval,
    };
  } catch {
    return null;
  }
}

export function verifySignedTransferDeploy(
  signedDeployJson: string,
  minAmountMotes: string,
  expectedPayer: string,
  expectedRecipient?: string,
): { valid: boolean; reason?: string } {
  const details = parseSignedTransferDeploy(signedDeployJson);
  if (!details) {
    return { valid: false, reason: 'invalid signed transfer deploy' };
  }

  if (!details.hasApproval) {
    return { valid: false, reason: 'deploy is not signed' };
  }

  if (normPk(details.payerPublicKey) !== normPk(expectedPayer)) {
    return { valid: false, reason: 'payer mismatch' };
  }

  if (expectedRecipient && normPk(details.recipientPublicKey) !== normPk(expectedRecipient)) {
    return { valid: false, reason: 'recipient mismatch' };
  }

  if (BigInt(details.amountMotes) < BigInt(minAmountMotes)) {
    return { valid: false, reason: 'transfer amount below required minimum' };
  }

  // Round-trip parse via SDK when possible
  try {
    const wrapper = JSON.parse(signedDeployJson);
    const parsed = DeployUtil.deployFromJson(wrapper);
    const deploy = (parsed as { val: DeployUtil.Deploy }).val;
    if (!deploy?.session?.isTransfer?.()) {
      return { valid: false, reason: 'not a transfer deploy' };
    }
  } catch {
    return { valid: false, reason: 'deploy SDK validation failed' };
  }

  return { valid: true };
}

export async function verifyOnChainDeployHash(
  deployHash: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!deployHash || deployHash.startsWith('mock-')) {
    return { valid: false, reason: 'mock or missing deploy hash' };
  }
  const status = await getDeployStatus(deployHash);
  if (status !== 'success') {
    return { valid: false, reason: `deploy not successful: ${status ?? 'unknown'}` };
  }
  return { valid: true };
}
