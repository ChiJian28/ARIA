export type DeployHash = string;
export type ContractHash = string;
export type AccountHash = string;
export type BlockHash = string;

export interface CasperEvent {
  eventType: string;
  blockHash: BlockHash;
  deployHash?: DeployHash;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface DeployResult {
  deployHash: DeployHash;
  blockHash?: BlockHash;
  status: 'pending' | 'success' | 'failure';
  errorMessage?: string;
  cost?: string;
  /** CEP-78 token id when resolved from a mint_rwa deploy */
  nftTokenId?: string;
}

export interface ContractCallParams {
  contractHash: ContractHash;
  entryPoint: string;
  args: Record<string, unknown>;
  payment: string; // in motes
  caller: AccountHash;
}

export interface NamedKeyQuery {
  contractHash: ContractHash;
  key: string;
}

export interface DictionaryQuery {
  contractHash: ContractHash;
  dictionaryName: string;
  dictionaryItemKey: string;
}

export type CLType =
  | 'bool'
  | 'i32' | 'i64'
  | 'u8' | 'u32' | 'u64' | 'u128' | 'u256' | 'u512'
  | 'unit'
  | 'string'
  | 'key'
  | 'uref'
  | 'public_key'
  | 'byte_array'
  | { list: CLType }
  | { map: { key: CLType; value: CLType } }
  | { option: CLType }
  | { tuple1: CLType }
  | { tuple2: [CLType, CLType] }
  | { tuple3: [CLType, CLType, CLType] };

export interface CLValue {
  clType: CLType;
  value: unknown;
}

export interface VaultPosition {
  address: AccountHash;
  lpTokens: string;
  csprDeposited: string;
  yieldEarned: string;
  lastUpdated: Date;
}

export interface ChainState {
  connected: boolean;
  latestBlockHash?: string;
  latestBlockHeight?: number;
  networkName: string;
  nodeUrl: string;
}
