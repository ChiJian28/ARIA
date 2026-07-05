import { Router, Request, Response, NextFunction } from 'express';
import { getX402Config } from '../../config/x402';
import {
  decodePaymentHeader,
  verifyPaymentProof,
} from '../../services/x402/wallet';
import { getPaymentRecipientHex } from '../../services/x402/wallet-keys';
import logger from '../../utils/logger';

// Re-use provider mock generators for gateway responses (data still mock; payment is real)
import { generateMockCreditData } from '../../services/x402/providers/credit';
import { generateMockFxData } from '../../services/x402/providers/fx-rates';
import { generateMockKycData } from '../../services/x402/providers/kyc';
import { generateMockMarketData } from '../../services/x402/providers/market-data';

export const x402GatewayRouter = Router();

function paymentRequiredBody(costMotes: string) {
  return {
    error: 'Payment Required',
    amount: costMotes,
    currency: 'CSPR',
    payTo: getPaymentRecipientHex(),
  };
}

function requireX402Payment(costMotes: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers['x-payment'];
    if (!header || typeof header !== 'string') {
      return res.status(402).json(paymentRequiredBody(costMotes));
    }

    try {
      const proof = decodePaymentHeader(header);
      const { valid, reason } = await verifyPaymentProof(
        proof,
        costMotes,
        getPaymentRecipientHex(),
      );
      if (!valid) {
        logger.warn('x402 gateway: invalid payment', { reason, path: req.path });
        return res.status(402).json({
          ...paymentRequiredBody(costMotes),
          paymentError: reason,
        });
      }
      return next();
    } catch (err) {
      logger.warn('x402 gateway: payment header parse error', { error: (err as Error).message });
      return res.status(402).json(paymentRequiredBody(costMotes));
    }
  };
}

const cfg = () => getX402Config();

x402GatewayRouter.get(
  '/credit/v1/credit-check',
  requireX402Payment(cfg().providers.creditBureau.costPerCallMotes),
  (req: Request, res: Response) => {
    const entity = String(req.query.entity ?? 'Unknown');
    const country = String(req.query.country ?? 'US');
    res.json(generateMockCreditData(entity, country));
  },
);

x402GatewayRouter.get(
  '/fx/v1/rates',
  requireX402Payment(cfg().providers.fxRates.costPerCallMotes),
  (req: Request, res: Response) => {
    const currency = String(req.query.base ?? req.query.currency ?? 'USD');
    res.json(generateMockFxData(currency));
  },
);

x402GatewayRouter.post(
  '/kyc/v1/kyc-check',
  requireX402Payment(cfg().providers.kyc.costPerCallMotes),
  (req: Request, res: Response) => {
    const { entityName = 'Unknown', registrationNumber = 'N/A', country = 'US' } = req.body ?? {};
    res.json(generateMockKycData(String(entityName), String(country), String(registrationNumber)));
  },
);

x402GatewayRouter.get(
  '/market/v1/benchmarks',
  requireX402Payment(cfg().providers.marketData.costPerCallMotes),
  (req: Request, res: Response) => {
    const assetClass = String(req.query.assetClass ?? 'invoice');
    const currency = String(req.query.currency ?? 'USD');
    res.json(generateMockMarketData(assetClass.toUpperCase(), currency));
  },
);
