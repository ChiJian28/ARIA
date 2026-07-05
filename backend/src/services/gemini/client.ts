import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { config } from '../../config';
import logger from '../../utils/logger';
import { parseJsonFromLlm } from './json-parser';

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return geminiClient;
}

export function getGeminiModel(generationConfig?: GenerationConfig): GenerativeModel {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: config.GEMINI_MODEL,
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
      ...generationConfig,
    },
  });
}

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  context?: { agent_id?: string; rwa_id?: string },
  generationConfig?: GenerationConfig,
): Promise<string> {
  const model = getGeminiModel(generationConfig);

  const prompt = `${systemPrompt}\n\n${userPrompt}`;

  logger.debug('Calling Gemini API', {
    agent_id: context?.agent_id,
    rwa_id: context?.rwa_id,
    model: config.GEMINI_MODEL,
    promptLength: prompt.length,
  });

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.debug('Gemini response received', {
      agent_id: context?.agent_id,
      rwa_id: context?.rwa_id,
      responseLength: text.length,
    });

    return text;
  } catch (err) {
    const error = err as Error;
    logger.error('Gemini API error', {
      agent_id: context?.agent_id,
      rwa_id: context?.rwa_id,
      error: error.message,
    });
    throw error;
  }
}

export interface GenerateJsonOptions<T> {
  /** Return false when parsed JSON is structurally valid but missing required fields. */
  validate?: (parsed: T) => boolean;
  maxAttempts?: number;
}

export async function generateJson<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  context?: { agent_id?: string; rwa_id?: string },
  options?: GenerateJsonOptions<T>,
): Promise<T> {
  const jsonConfig: GenerationConfig = {
    responseMimeType: 'application/json',
    temperature: 0.1,
    maxOutputTokens: 2048,
  };

  const jsonSystemPrompt = `${systemPrompt}\n\nIMPORTANT: Respond ONLY with a single valid JSON object. No markdown fences, no commentary.`;

  const maxAttempts = options?.maxAttempts ?? 3;
  let lastError: Error | null = null;
  let lastParsed: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const retryHint =
      attempt > 1
        ? '\n\nRETRY: Your previous response was incomplete or invalid. Include ALL required fields, especially "vote" ("APPROVE" or "REJECT") and "reasoning" (at least one full sentence).'
        : '';

    try {
      const text = await generateContent(
        jsonSystemPrompt,
        userPrompt + retryHint,
        context,
        jsonConfig,
      );
      const parsed = parseJsonFromLlm<T>(text);

      if (options?.validate && !options.validate(parsed)) {
        lastParsed = parsed;
        throw new Error('Gemini JSON missing required agent fields');
      }

      return parsed;
    } catch (err) {
      lastError = err as Error;
      logger.warn('Gemini JSON parse/validate failed', {
        agent_id: context?.agent_id,
        rwa_id: context?.rwa_id,
        attempt,
        error: lastError.message.slice(0, 120),
      });
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  if (lastParsed !== undefined) {
    logger.warn('Gemini JSON using last partial parse after validation failures', {
      agent_id: context?.agent_id,
      rwa_id: context?.rwa_id,
    });
    return lastParsed;
  }

  throw lastError ?? new Error('Gemini JSON generation failed');
}

export async function checkGeminiHealth(): Promise<boolean> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent('Reply with just the word "ok"');
    return result.response.text().toLowerCase().includes('ok');
  } catch {
    return false;
  }
}
