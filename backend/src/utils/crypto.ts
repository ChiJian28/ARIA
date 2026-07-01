import nacl from 'tweetnacl';
import fs from 'fs';
import path from 'path';

export interface Ed25519KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyHex: string;
  accountHash: string;
}

function encodeUTF8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decodeUTF8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function decodeBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export function generateKeyPair(): Ed25519KeyPair {
  const pair = nacl.sign.keyPair();
  const publicKeyHex = Buffer.from(pair.publicKey).toString('hex');
  const accountHash = deriveAccountHash(pair.publicKey);
  return {
    publicKey: pair.publicKey,
    secretKey: pair.secretKey,
    publicKeyHex,
    accountHash,
  };
}

export function deriveAccountHash(publicKey: Uint8Array): string {
  const prefix = encodeUTF8('ed25519');
  const separator = new Uint8Array([0]);
  const combined = new Uint8Array(prefix.length + separator.length + publicKey.length);
  combined.set(prefix);
  combined.set(separator, prefix.length);
  combined.set(publicKey, prefix.length + separator.length);
  const hash = Buffer.from(combined).toString('hex').substring(0, 64);
  return `account-hash-${hash}`;
}

export function signMessage(message: string, secretKey: Uint8Array): string {
  const msgBytes = encodeUTF8(message);
  const signature = nacl.sign.detached(msgBytes, secretKey);
  return encodeBase64(signature);
}

export function verifySignature(message: string, signatureBase64: string, publicKey: Uint8Array): boolean {
  try {
    const msgBytes = encodeUTF8(message);
    const signature = decodeBase64(signatureBase64);
    return nacl.sign.detached.verify(msgBytes, signature, publicKey);
  } catch {
    return false;
  }
}

export function keyPairToHex(keyPair: Ed25519KeyPair): { publicKey: string; secretKey: string } {
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
    secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
  };
}

export function loadKeyPairFromFile(filePath: string): Ed25519KeyPair {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Key file not found: ${resolved}`);
  }
  const content = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as {
    secretKey: string;
    publicKey: string;
    accountHash: string;
  };
  const secretKey = Buffer.from(content.secretKey, 'hex');
  const publicKey = Buffer.from(content.publicKey, 'hex');
  return {
    publicKey: new Uint8Array(publicKey),
    secretKey: new Uint8Array(secretKey),
    publicKeyHex: content.publicKey,
    accountHash: content.accountHash,
  };
}

export function saveKeyPairToFile(keyPair: Ed25519KeyPair, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = {
    publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
    secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
    accountHash: keyPair.accountHash,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}
