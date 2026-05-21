import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODEL_FALLBACK_CHAIN = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

const MAX_RETRIES_PER_MODEL = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

export function extractJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonStr);
}

export function geminiErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function isRetryableGeminiError(err: unknown): boolean {
  const msg = geminiErrorMessage(err);
  return (
    /\b(429|503|502|500|504)\b/.test(msg) ||
    /rate.?limit|quota|resource.?exhausted|service unavailable|high demand|overloaded|temporarily unavailable/i.test(
      msg,
    )
  );
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = geminiErrorMessage(err);
  return /404|not found|not supported|is not found for API version/i.test(msg);
}

function shouldTryNextModel(err: unknown): boolean {
  return isRetryableGeminiError(err) || isModelUnavailableError(err);
}

async function callGeminiOnce(
  modelName: string,
  prompt: string,
  options: { temperature?: number; systemInstruction?: string },
  attempt: number,
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options.systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: options.temperature ?? 0.5,
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  } catch (err) {
    if (isRetryableGeminiError(err) && attempt < MAX_RETRIES_PER_MODEL) {
      await sleep(1200 * Math.pow(2, attempt));
      return callGeminiOnce(modelName, prompt, options, attempt + 1);
    }
    throw err;
  }
}

export async function callGeminiJson(
  prompt: string,
  options: { temperature?: number; systemInstruction?: string } = {},
): Promise<{ text: string; model: string }> {
  let lastError: unknown;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      const text = await callGeminiOnce(modelName, prompt, options, 0);
      return { text, model: modelName };
    } catch (err) {
      lastError = err;
      if (shouldTryNextModel(err)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("No Gemini models available");
}
