import fs from 'fs';
import path from 'path';
import {
  CLValueBuilder,
  DeployUtil,
  RuntimeArgs,
  decodeBase16,
} from 'casper-js-sdk';

const PROXY_WASM_PATH = path.resolve(process.cwd(), 'wasm/proxy_caller_with_return.wasm');

let cachedProxyWasm: Uint8Array | null = null;

function loadProxyCallerWasm(): Uint8Array {
  if (cachedProxyWasm) return cachedProxyWasm;
  cachedProxyWasm = new Uint8Array(fs.readFileSync(PROXY_WASM_PATH));
  return cachedProxyWasm;
}

export function stripHashPrefix(hash: string): string {
  return hash.replace(/^(hash-|contract-)/, '');
}

function serializeRuntimeArgs(args: RuntimeArgs) {
  const bytesResult = args.toBytes();
  if (bytesResult.err) {
    throw new Error(`Failed to serialize runtime args: ${bytesResult.val}`);
  }
  return CLValueBuilder.list(Array.from(bytesResult.val).map((value) => CLValueBuilder.u8(value)));
}

export function buildProxyCallerSession(
  packageHash: string,
  entryPoint: string,
  contractArgs: RuntimeArgs,
  attachedValueMotes: string,
): DeployUtil.ExecutableDeployItem {
  const packageHashBytes = decodeBase16(stripHashPrefix(packageHash));
  const proxyArgs = RuntimeArgs.fromMap({
    package_hash: CLValueBuilder.byteArray(packageHashBytes),
    entry_point: CLValueBuilder.string(entryPoint),
    args: serializeRuntimeArgs(contractArgs),
    attached_value: CLValueBuilder.u512(attachedValueMotes),
    amount: CLValueBuilder.u512(attachedValueMotes),
  });

  return DeployUtil.ExecutableDeployItem.newModuleBytes(loadProxyCallerWasm(), proxyArgs);
}
