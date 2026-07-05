import { DeployUtil, CLPublicKey } from 'casper-js-sdk';
import { getCasperConfig } from '../../config/casper';
import { signDeploy } from '../../blockchain/transactions/signer';
import { normalizePublicKeyHex, publicKeyFromKeyFile } from '../../blockchain/transactions/casper-keys';
import { submitAndWait, assertDeploySuccess } from '../../blockchain/transactions/submitter';
import { resolveWalletKeyPath } from './wallet-keys';
import logger from '../../utils/logger';

const TRANSFER_GAS_MOTES = '100000000';
/** Casper testnet rejects native transfers below 2.5 CSPR. */
export const MIN_NATIVE_TRANSFER_MOTES = 2_500_000_000n;

export function buildSignedNativeTransfer(
  recipientPublicKeyHex: string,
  amountMotes: string,
  signerKeyPath?: string,
): { signedDeployJson: string; deployHashHex: string } {
  const keyPath = signerKeyPath ?? resolveWalletKeyPath();
  const payerPk = publicKeyFromKeyFile(keyPath);
  const recipientPk = CLPublicKey.fromHex(normalizePublicKeyHex(recipientPublicKeyHex));

  const session = DeployUtil.ExecutableDeployItem.newTransferWithOptionalTransferId(
    amountMotes,
    recipientPk,
    null,
  );
  const payment = DeployUtil.standardPayment(TRANSFER_GAS_MOTES);
  const deployParams = new DeployUtil.DeployParams(
    payerPk,
    getCasperConfig().networkName,
    1,
    1_800_000,
  );
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
  const signed = signDeploy(deploy, keyPath);
  const deployJson = DeployUtil.deployToJson(signed);
  const deployHashHex = Buffer.from(signed.hash).toString('hex');

  return {
    signedDeployJson: JSON.stringify(deployJson),
    deployHashHex,
  };
}

export async function submitSignedTransfer(
  signedDeployJson: string,
  label = 'x402_payment_transfer',
): Promise<string> {
  const wrapper = JSON.parse(signedDeployJson);
  const parsed = DeployUtil.deployFromJson(wrapper);
  const deploy = (parsed as { val: DeployUtil.Deploy }).val;
  if (!deploy?.hash) {
    throw new Error('Invalid signed deploy JSON');
  }

  const result = assertDeploySuccess(await submitAndWait(deploy), label);
  logger.info('x402 payment transfer finalized', { deployHash: result.deployHash });
  return result.deployHash;
}

export async function submitNativeTransfer(
  recipientPublicKeyHex: string,
  amountMotes: string,
  signerKeyPath?: string,
): Promise<string> {
  const { signedDeployJson } = buildSignedNativeTransfer(
    recipientPublicKeyHex,
    amountMotes,
    signerKeyPath,
  );
  return submitSignedTransfer(signedDeployJson);
}

export function shouldSubmitOnChain(amountMotes: string): boolean {
  return BigInt(amountMotes) >= MIN_NATIVE_TRANSFER_MOTES;
}
