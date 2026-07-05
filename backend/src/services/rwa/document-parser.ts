import crypto from 'crypto';
import { getGeminiModel, buildJsonGenerationConfig } from '../gemini/client';
import { parseJsonFromLlm } from '../gemini/json-parser';
import logger from '../../utils/logger';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY', 'AUD', 'HKD', 'CHF', 'CAD'] as const;

export interface ParsedInvoiceFields {
  counterpartyName: string;
  counterpartyJurisdiction: string;
  faceValue: number;
  currency: string;
  maturityDate: string;
  description?: string;
  invoiceNumber?: string;
}

export interface ParsedInvoiceDocument extends ParsedInvoiceFields {
  documentHash: string;
  filename: string;
  confidence: number;
}

interface LlmParseResult {
  counterpartyName?: string;
  counterpartyJurisdiction?: string;
  faceValue?: number;
  currency?: string;
  maturityDate?: string;
  description?: string;
  invoiceNumber?: string;
  confidence?: number;
}

const SYSTEM_PROMPT = `You are a trade finance document extraction engine for invoice factoring.
Extract structured fields from commercial invoices (PDF), e-invoicing XML, or JSON invoice schemas.

Return JSON with these keys:
- counterpartyName: buyer / debtor company name (string, required)
- counterpartyJurisdiction: jurisdiction label like "Singapore (SG)" (string, required)
- faceValue: invoice face value as a positive number (required)
- currency: ISO 4217 code e.g. USD, EUR, SGD (required)
- maturityDate: payment due date as YYYY-MM-DD (required)
- description: short summary of goods/services (string, optional)
- invoiceNumber: invoice reference if present (string, optional)
- confidence: 0-1 how confident you are in the extraction (number)

Use only information present in the document. If a field is missing, infer conservatively from context or use reasonable defaults only when unavoidable.`;

function resolveMimeType(filename: string, mimetype: string): string {
  const lower = filename.toLowerCase();
  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) return 'application/pdf';
  if (mimetype.includes('xml') || lower.endsWith('.xml')) return 'application/xml';
  if (mimetype.includes('json') || lower.endsWith('.json')) return 'application/json';
  return mimetype || 'application/octet-stream';
}

function normalizeCurrency(raw?: string): string {
  const code = (raw ?? 'USD').toUpperCase().trim();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? code : 'USD';
}

function normalizeMaturityDate(raw?: string): string {
  if (!raw) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 60);
    return d.toISOString().slice(0, 10);
  }
  const parsed = new Date(`${raw.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 60);
    return d.toISOString().slice(0, 10);
  }
  return raw.slice(0, 10);
}

function normalizeParsed(
  llm: LlmParseResult,
  documentHash: string,
  filename: string,
): ParsedInvoiceDocument {
  const faceValue = typeof llm.faceValue === 'number' && llm.faceValue > 0 ? llm.faceValue : 0;
  return {
    documentHash,
    filename,
    counterpartyName: (llm.counterpartyName ?? '').trim() || 'Unknown Counterparty',
    counterpartyJurisdiction: (llm.counterpartyJurisdiction ?? 'Singapore (SG)').trim(),
    faceValue,
    currency: normalizeCurrency(llm.currency),
    maturityDate: normalizeMaturityDate(llm.maturityDate),
    description: llm.description?.trim(),
    invoiceNumber: llm.invoiceNumber?.trim(),
    confidence: Math.max(0, Math.min(1, llm.confidence ?? 0.7)),
  };
}

export async function parseInvoiceDocument(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<ParsedInvoiceDocument> {
  const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const mime = resolveMimeType(filename, mimetype);

  const model = getGeminiModel(
    buildJsonGenerationConfig({
      temperature: 0.1,
    }),
  );

  const userInstruction =
    'Extract invoice fields from this document for RWA underwriting submission. Respond with JSON only.';

  let parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;

  if (mime === 'application/pdf') {
    parts = [
      { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
      { text: userInstruction },
    ];
  } else {
    const textContent = buffer.toString('utf-8');
    parts = [
      {
        text: `${userInstruction}\n\nFilename: ${filename}\n\n--- DOCUMENT ---\n${textContent.slice(0, 120_000)}`,
      },
    ];
  }

  logger.info('Parsing invoice document with Gemini', { filename, mime, bytes: buffer.length });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        ...parts,
      ]);
      const text = result.response.text();
      const llm = parseJsonFromLlm<LlmParseResult>(text);
      return normalizeParsed(llm, documentHash, filename);
    } catch (err) {
      lastError = err as Error;
      logger.warn('Invoice document parse attempt failed', {
        filename,
        attempt,
        error: lastError.message.slice(0, 120),
      });
      if (attempt < 2) await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw lastError ?? new Error('Failed to parse invoice document');
}
