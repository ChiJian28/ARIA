import { config } from './index';

export interface X402ProviderConfig {
  name: string;
  baseUrl: string;
  costPerCallMotes: string;
  description: string;
}

function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return true;
  return url.includes('example.com') || url.includes('mock.');
}

function localGatewayUrl(path: string): string {
  const port = config.PORT;
  return `http://localhost:${port}/api/x402-gateway${path}`;
}

function resolveProviderUrl(envUrl: string | undefined, gatewayPath: string): string {
  if (config.X402_LOCAL_GATEWAY && isPlaceholderUrl(envUrl)) {
    return localGatewayUrl(gatewayPath);
  }
  return envUrl ?? localGatewayUrl(gatewayPath);
}

export function getX402Config() {
  return {
    useMock: config.X402_USE_MOCK,
    walletKeyPath: config.X402_WALLET_KEY_PATH,
    walletPrivateKey: config.X402_WALLET_PRIVATE_KEY,
    walletAddress: config.X402_WALLET_ADDRESS,
    minBalanceMotes: (config.X402_WALLET_MIN_BALANCE * 1_000_000_000).toString(),
    localGateway: config.X402_LOCAL_GATEWAY,

    providers: {
      creditBureau: {
        name: 'Credit Bureau',
        baseUrl: resolveProviderUrl(config.X402_CREDIT_BUREAU_URL, '/credit'),
        costPerCallMotes: '50000000',
        description: 'Credit score, trade history, delinquency data',
      } as X402ProviderConfig,

      fxRates: {
        name: 'FX Rate Provider',
        baseUrl: resolveProviderUrl(config.X402_FX_RATES_URL, '/fx'),
        costPerCallMotes: '10000000',
        description: 'Spot and forward FX rates for invoice currencies',
      } as X402ProviderConfig,

      kyc: {
        name: 'KYC/AML Provider',
        baseUrl: resolveProviderUrl(config.X402_KYC_PROVIDER_URL, '/kyc'),
        costPerCallMotes: '100000000',
        description: 'KYC/AML clearance, PEP/sanctions checks',
      } as X402ProviderConfig,

      marketData: {
        name: 'Market Data Provider',
        baseUrl: resolveProviderUrl(config.X402_MARKET_DATA_URL, '/market'),
        costPerCallMotes: '20000000',
        description: 'Comparable instrument yields and discount rates',
      } as X402ProviderConfig,
    },
  };
}
