import fs from 'fs';
import path from 'path';
import {
  CLPublicKey,
  CLValueBuilder,
  CLAccountHash,
  Keys,
} from 'casper-js-sdk';
import { loadKeyPairFromFile } from '../../utils/crypto';

/** Raw 32-byte hex → Casper tagged ed25519 public key (66 hex chars). */
export function normalizePublicKeyHex(hex: string): string {
  const cleaned = hex.replace(/^0x/i, '').toLowerCase();
  if (cleaned.length === 64 && !cleaned.startsWith('01')) {
    return `01${cleaned}`;
  }
  return cleaned;
}

export function publicKeyFromHex(hex: string): CLPublicKey {
  return CLPublicKey.fromHex(normalizePublicKeyHex(hex));
}

export function accountHashKeyFromPublicKeyHex(publicKeyHex: string) {
  return CLValueBuilder.key(publicKeyFromHex(publicKeyHex));
}

export function accountHashKeyFromAccountHashStr(accountHashStr: string) {
  const hex = accountHashStr.replace(/^account-hash-/, '');
  return CLValueBuilder.key(new CLAccountHash(Buffer.from(hex, 'hex')));
}

function isJsonKeyFile(filePath: string): boolean {
  const head = fs.readFileSync(filePath, 'utf-8').trimStart();
  return head.startsWith('{');
}

/** Load signing keys from Casper PEM or ARIA JSON key file. */
export function loadSigningKeyPair(keyFilePath: string): Keys.AsymmetricKey {
  const resolved = path.resolve(keyFilePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }

  if (isJsonKeyFile(resolved)) {
    const keyPair = loadKeyPairFromFile(resolved);
    const privateKeyBytes = keyPair.secretKey.slice(0, 32);
    return Keys.Ed25519.parseKeyPair(
      Buffer.from(keyPair.publicKey),
      Buffer.from(privateKeyBytes),
    );
  }

  return Keys.Ed25519.loadKeyPairFromPrivateFile(resolved);
}

export function publicKeyFromKeyFile(keyFilePath: string): CLPublicKey {
  const keys = loadSigningKeyPair(keyFilePath);
  return keys.publicKey;
}
