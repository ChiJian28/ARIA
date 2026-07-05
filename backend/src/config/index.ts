import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),
  DB_POOL_MIN: z.string().default('2').transform(Number),
  DB_POOL_MAX: z.string().default('10').transform(Number),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  CASPER_NODE_URL: z.string().url().default('https://node.testnet.casper.network'),
  CASPER_SSE_URL: z.string().url().default('https://node.testnet.casper.network/events'),
  CASPER_NETWORK_NAME: z.string().default('casper-test'),
  DEPLOYER_SECRET_KEY: z.string().optional(),
  DEPLOYER_SECRET_KEY_PATH: z.string().default('./keys/deployer/secret_key.pem'),

  RWA_REGISTRY_CONTRACT_HASH: z.string().optional(),
  RWA_REGISTRY_PACKAGE_HASH: z.string().optional(),
  LIQUIDITY_VAULT_CONTRACT_HASH: z.string().optional(),
  LIQUIDITY_VAULT_PACKAGE_HASH: z.string().optional(),
  AGENT_COUNCIL_CONTRACT_HASH: z.string().optional(),
  AGENT_COUNCIL_PACKAGE_HASH: z.string().optional(),
  SETTLEMENT_ENGINE_CONTRACT_HASH: z.string().optional(),
  SETTLEMENT_ENGINE_PACKAGE_HASH: z.string().optional(),

  ORCHESTRATOR_KEY_PATH: z.string().default('./keys/orchestrator.pem'),
  RISK_AGENT_KEY_PATH: z.string().default('./keys/risk-agent.pem'),
  VALUATION_AGENT_KEY_PATH: z.string().default('./keys/valuation-agent.pem'),
  COMPLIANCE_AGENT_KEY_PATH: z.string().default('./keys/compliance-agent.pem'),
  SENTINEL_AGENT_KEY_PATH: z.string().default('./keys/sentinel-agent.pem'),

  X402_WALLET_PRIVATE_KEY: z.string().optional(),
  X402_WALLET_ADDRESS: z.string().optional(),
  X402_WALLET_KEY_PATH: z.string().default('./keys/risk-agent.pem'),
  X402_PAYMENT_RECIPIENT_PK: z.string().optional(),
  X402_WALLET_MIN_BALANCE: z.string().default('10').transform(Number),
  X402_USE_MOCK: z.string().default('true').transform((v) => v === 'true'),
  X402_LOCAL_GATEWAY: z.string().default('true').transform((v) => v === 'true'),
  X402_CREDIT_BUREAU_URL: z.string().url().optional(),
  X402_FX_RATES_URL: z.string().url().optional(),
  X402_KYC_PROVIDER_URL: z.string().url().optional(),
  X402_MARKET_DATA_URL: z.string().url().optional(),

  CSPR_CLOUD_API_KEY: z.string().optional(),
  CSPR_CLOUD_REST_URL: z.string().url().default('https://api.cspr.cloud'),
  CSPR_CLOUD_SSE_URL: z.string().url().default('https://stream.cspr.cloud'),

  COUNCIL_MIN_VOTES: z.string().default('3').transform(Number),
  RISK_AGENT_WEIGHT: z.string().default('35').transform(Number),
  VALUATION_AGENT_WEIGHT: z.string().default('35').transform(Number),
  COMPLIANCE_AGENT_WEIGHT: z.string().default('30').transform(Number),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RWA_SUBMIT_RATE_LIMIT: z.string().default('5').transform(Number),

  SENTINEL_CRON: z.string().default('*/5 * * * *'),
  SETTLEMENT_CRON: z.string().default('0 0 * * *'),
  LIQUIDATION_THRESHOLD: z.string().default('0.75').transform(Number),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
});

type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;

  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  _config = result.data;
  return _config;
}

export const config = new Proxy({} as Config, {
  get(_, key: string) {
    return getConfig()[key as keyof Config];
  },
});
