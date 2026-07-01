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

  throw new Error(`Gemini did not return valid JSON. Response: ${text.substring(0, 240)}`);
}
