import { DeployUtil } from 'casper-js-sdk';
import { loadSigningKeyPair } from './casper-keys';
import logger from '../../utils/logger';

export function signDeploy(
  deploy: DeployUtil.Deploy,
  keyFilePath: string,
): DeployUtil.Deploy {
  try {
    const keys = loadSigningKeyPair(keyFilePath);

    const signedDeploy = DeployUtil.signDeploy(deploy, keys);
    logger.debug('Deploy signed', {
      publicKey: keys.publicKey.toHex().substring(0, 16) + '...',
    });
    return signedDeploy;
  } catch (err) {
    logger.error('Failed to sign deploy', { error: (err as Error).message, keyFilePath });
    throw err;
  }
}

export function signDeployMulti(
  deploy: DeployUtil.Deploy,
  keyFilePaths: string[],
): DeployUtil.Deploy {
  let signedDeploy = deploy;
  for (const keyFilePath of keyFilePaths) {
    signedDeploy = signDeploy(signedDeploy, keyFilePath);
  }
  return signedDeploy;
}

export function deployToJson(deploy: DeployUtil.Deploy): string {
  return JSON.stringify(DeployUtil.deployToJson(deploy));
}
