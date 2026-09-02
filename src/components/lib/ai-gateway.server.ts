import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: true,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function createGapGptProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gapgpt",
    baseURL: "https://api.gapgpt.app/v1",
    supportsStructuredOutputs: true,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/**
 * انتخاب خودکار سرویس هوش مصنوعی.
 *
 * اگر `LOVABLE_API_KEY` موجود باشد از Lovable AI Gateway استفاده می‌شود
 * (سرویس GapGPT از سرورهای اجرای برنامه قابل دسترسی نیست) و در غیر این صورت
 * به GapGPT با همان کلید قبلی بازمی‌گردیم.
 */
export type AiRuntimeConfig = {
  kind: "lovable" | "gapgpt";
  baseURL: string;
  headers: Record<string, string>;
  chatModel: string;
  embeddingModel: string;
};

export function resolveAiConfig(): AiRuntimeConfig {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return {
      kind: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      chatModel: "google/gemini-3.5-flash",
      embeddingModel: "openai/text-embedding-3-small",
    };
  }

  const gapKey = process.env["GAPGPT_API_KEY"];
  if (gapKey) {
    return {
      kind: "gapgpt",
      baseURL: "https://api.gapgpt.app/v1",
      headers: { Authorization: `Bearer ${gapKey}` },
      chatModel: "gpt-4o-mini",
      embeddingModel: "text-embedding-3-small",
    };
  }

  throw new Error("سرویس هوش مصنوعی در دسترس نیست.");
}

/** سازندهٔ provider سازگار با AI SDK بر اساس سرویس فعال. */
export function createAiProvider(config: AiRuntimeConfig = resolveAiConfig()) {
  return createOpenAICompatible({
    name: config.kind,
    baseURL: config.baseURL,
    supportsStructuredOutputs: true,
    headers: config.headers,
  });
}
