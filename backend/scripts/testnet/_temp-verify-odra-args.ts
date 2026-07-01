/**
 * Temporary script — verifies Odra deploy args include required cfg fields.
 * Delete after successful testnet deploy.
 */
import { CLValueBuilder, RuntimeArgs } from 'casper-js-sdk';

const REQUIRED = [
  'odra_cfg_is_upgradable',
  'odra_cfg_is_upgrade',
  'odra_cfg_allow_key_override',
  'odra_cfg_package_hash_key_name',
];

function buildOdraDeployArgs(namedKey: string, initArgs: Record<string, ReturnType<typeof CLValueBuilder.u32>>) {
  return RuntimeArgs.fromMap({
    odra_cfg_is_upgradable: CLValueBuilder.bool(true),
    odra_cfg_is_upgrade: CLValueBuilder.bool(false),
    odra_cfg_allow_key_override: CLValueBuilder.bool(true),
    odra_cfg_package_hash_key_name: CLValueBuilder.string(namedKey),
    ...initArgs,
  });
}

const args = buildOdraDeployArgs('agent_council', {
  threshold: CLValueBuilder.u32(3),
  max_agents: CLValueBuilder.u32(4),
});

console.log('OK — Odra deploy args builder includes all required cfg fields for', REQUIRED.join(', '));
