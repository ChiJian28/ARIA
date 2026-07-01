import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { constructPaymentProof, encodePaymentHeader, ensureSufficientBalance } from './wallet';
import { getX402Config } from '../../config/x402';
import logger from '../../utils/logger';

export interface X402Response<T = unknown> {
  data: T;
  paidAmount?: string;
  providerName: string;
}

const HTTP_PAYMENT_REQUIRED = 402;

function createAxiosInstance(baseUrl: string): AxiosInstance {
  return axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function x402Get<T = unknown>(
  providerBaseUrl: string,
  path: string,
  params?: Record<string, string>,
  costMotes?: string,
): Promise<X402Response<T>> {
  const x402Config = getX402Config();

  if (x402Config.useMock) {
    // Mock is handled by the individual provider modules
    throw new Error('x402 client called in mock mode; use provider module directly');
  }

  const client = createAxiosInstance(providerBaseUrl);
  const config: AxiosRequestConfig = { params };

  // First attempt — no payment header
  try {
    const response = await client.get<T>(path, config);
    return { data: response.data, providerName: providerBaseUrl };
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response?.status !== HTTP_PAYMENT_REQUIRED) {
      throw err;
    }

    // Parse 402 Payment Required response
    const paymentRequired = err.response.data as { amount?: string; currency?: string };
    const paymentAmount = costMotes ?? paymentRequired.amount ?? '50000000';

    logger.debug('x402: received 402, constructing payment proof', {
      url: providerBaseUrl + path,
      amount: paymentAmount,
    });

    await ensureSufficientBalance(paymentAmount);
    const proof = await constructPaymentProof(paymentAmount, providerBaseUrl);
    const paymentHeader = encodePaymentHeader(proof);

    // Retry with payment header
    const retryResponse = await client.get<T>(path, {
      ...config,
      headers: { 'X-Payment': paymentHeader },
    });

    return { data: retryResponse.data, paidAmount: paymentAmount, providerName: providerBaseUrl };
  }
}

export async function x402Post<T = unknown>(
  providerBaseUrl: string,
  path: string,
  body: Record<string, unknown>,
  costMotes?: string,
): Promise<X402Response<T>> {
  const x402Config = getX402Config();

  if (x402Config.useMock) {
    throw new Error('x402 client called in mock mode; use provider module directly');
  }

  const client = createAxiosInstance(providerBaseUrl);

  try {
    const response = await client.post<T>(path, body);
    return { data: response.data, providerName: providerBaseUrl };
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response?.status !== HTTP_PAYMENT_REQUIRED) {
      throw err;
    }

    const paymentRequired = err.response.data as { amount?: string };
    const paymentAmount = costMotes ?? paymentRequired.amount ?? '50000000';

    await ensureSufficientBalance(paymentAmount);
    const proof = await constructPaymentProof(paymentAmount, providerBaseUrl);
    const paymentHeader = encodePaymentHeader(proof);

    const retryResponse = await client.post<T>(path, body, {
      headers: { 'X-Payment': paymentHeader },
    });

    return { data: retryResponse.data, paidAmount: paymentAmount, providerName: providerBaseUrl };
  }
}
