/** Strip markdown fences and surrounding prose from LLM output. */
export function stripJsonMarkdown(text: string): string {
  return text
    .replace(/^[\s\S]*?```json\s*/i, '')
    .replace(/```[\s\S]*$/i, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
}

/** Close truncated JSON objects (common when the model stops mid-response). */
export function repairTruncatedJson(raw: string): string {
  let s = raw.trim();

  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
  }
  if (inString) s += '"';

  s = s.replace(/,\s*$/, '');

  const opens = (s.match(/\{/g) ?? []).length;
  const closes = (s.match(/\}/g) ?? []).length;
  for (let i = 0; i < opens - closes; i++) s += '}';

  return s;
}

/** Pull scalar fields from truncated JSON when full parse fails (mid-key cutoffs). */
export function extractPartialJsonFields(text: string): Record<string, unknown> {
  const cleaned = stripJsonMarkdown(text);
  const result: Record<string, unknown> = {};
  const re =
    /"([a-zA-Z_][\w]*)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|true|false|null)/g;

  for (const match of cleaned.matchAll(re)) {
    const key = match[1];
    if (match[2] !== undefined) result[key] = match[2];
    else if (match[3] !== undefined) result[key] = Number(match[3]);
    else if (match[0].endsWith('true')) result[key] = true;
    else if (match[0].endsWith('false')) result[key] = false;
    else result[key] = null;
  }

  return result;
}

export function parseJsonFromLlm<T>(text: string): T {
  const cleaned = stripJsonMarkdown(text);

  const attempts = [
    cleaned,
    cleaned.match(/\{[\s\S]*\}/)?.[0],
    cleaned.includes('{') ? repairTruncatedJson(cleaned.slice(cleaned.indexOf('{'))) : null,
  ].filter(Boolean) as string[];

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      try {
        return JSON.parse(repairTruncatedJson(candidate)) as T;
      } catch {
        // try next candidate
      }
    }
  }

  const partial = extractPartialJsonFields(text);
  if (Object.keys(partial).length > 0) {
    return partial as T;
  }

  throw new Error(`Gemini did not return valid JSON. Response: ${text.substring(0, 240)}`);
}
