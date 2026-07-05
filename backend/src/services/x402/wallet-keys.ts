import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { publicKeyFromKeyFile } from '../../blockchain/transactions/casper-keys';

export function resolveWalletKeyPath(): string {
  return config.X402_WALLET_KEY_PATH;
}

export function isWalletKeyAvailable(): boolean {
  return fs.existsSync(path.resolve(resolveWalletKeyPath()));
}

export function getWalletPublicKeyHex(): string {
  return publicKeyFromKeyFile(resolveWalletKeyPath()).toHex();
}

/** Treasury / provider pay-to address for x402 micropayments. */
export function getPaymentRecipientHex(): string {
  if (config.X402_PAYMENT_RECIPIENT_PK) {
    return config.X402_PAYMENT_RECIPIENT_PK.replace(/^0x/i, '');
  }
  return publicKeyFromKeyFile(config.DEPLOYER_SECRET_KEY_PATH).toHex();
}
