import {
  callGeminiJson,
  extractJsonFromLlmText,
  geminiErrorMessage,
} from "@/lib/gemini-client";
import type { z } from "zod";

export type InvokeGeminiJsonResult<T> =
  | { ok: true; data: T; model: string; raw: string }
  | { ok: false; error: string };

export async function invokeGeminiJson<T>(
  prompt: string,
  systemInstruction: string,
  schema: z.ZodType<T>,
  temperature = 0.45,
): Promise<InvokeGeminiJsonResult<T>> {
  try {
    const { text, model } = await callGeminiJson(prompt, {
      systemInstruction,
      temperature,
    });
    const parsed = extractJsonFromLlmText(text);
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      const msg = validated.error.issues
        .slice(0, 4)
        .map((i) => i.message)
        .join("; ");
      return { ok: false, error: msg || "Schema validation failed" };
    }
    return { ok: true, data: validated.data, model, raw: text };
  } catch (err) {
    return { ok: false, error: geminiErrorMessage(err) };
  }
}
