import { config } from './index';

export interface X402ProviderConfig {
  name: string;
  baseUrl: string;
  costPerCallMotes: string; // in CSPR motes
  description: string;
}

export function getX402Config() {
  return {
    useMock: config.X402_USE_MOCK,
    walletPrivateKey: config.X402_WALLET_PRIVATE_KEY,
    walletAddress: config.X402_WALLET_ADDRESS,
    minBalanceMotes: (config.X402_WALLET_MIN_BALANCE * 1_000_000_000).toString(),

    providers: {
      creditBureau: {
        name: 'Credit Bureau',
        baseUrl: config.X402_CREDIT_BUREAU_URL ?? 'https://mock.credit.aria',
        costPerCallMotes: '50000000', // 0.05 CSPR per call
        description: 'Credit score, trade history, delinquency data',
      } as X402ProviderConfig,

      fxRates: {
        name: 'FX Rate Provider',
        baseUrl: config.X402_FX_RATES_URL ?? 'https://mock.fx.aria',
        costPerCallMotes: '10000000', // 0.01 CSPR per call
        description: 'Spot and forward FX rates for invoice currencies',
      } as X402ProviderConfig,

      kyc: {
        name: 'KYC/AML Provider',
        baseUrl: config.X402_KYC_PROVIDER_URL ?? 'https://mock.kyc.aria',
        costPerCallMotes: '100000000', // 0.1 CSPR per call
        description: 'KYC/AML clearance, PEP/sanctions checks',
      } as X402ProviderConfig,

      marketData: {
        name: 'Market Data Provider',
        baseUrl: config.X402_MARKET_DATA_URL ?? 'https://mock.market.aria',
        costPerCallMotes: '20000000', // 0.02 CSPR per call
        description: 'Comparable instrument yields and discount rates',
      } as X402ProviderConfig,
    },
  };
}
