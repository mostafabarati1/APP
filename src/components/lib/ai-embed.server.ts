/**
 * فراخوانی سرویس embeddings (فقط سمت سرور) برای تشخیص تکرار معنایی سوالات.
 * از همان زیرساخت GapGPT پروژه استفاده می‌شود؛ هیچ کلید یا وابستگی جدیدی اضافه نشده است.
 */

import { resolveAiConfig } from "./ai-gateway.server";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

type EmbeddingItem = { embedding: number[]; index: number };
type EmbeddingsResponse = { data?: EmbeddingItem[] };

/** یک درخواست embeddings برای چند متن هم‌زمان؛ ترتیب خروجی با ترتیب ورودی یکسان است. */
export async function createEmbeddings(
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = resolveAiConfig();
  const effectiveModel = model === DEFAULT_EMBEDDING_MODEL ? config.embeddingModel : model;

  const response = await fetch(`${config.baseURL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({ model: effectiveModel, input: texts }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`خطای سرویس embeddings (${response.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as EmbeddingsResponse;
  const items = payload.data;
  if (!Array.isArray(items) || items.length !== texts.length) {
    throw new Error("پاسخ نامعتبر از سرویس embeddings دریافت شد.");
  }

  return items
    .slice()
    .sort((a, b) => a["index"] - b["index"])
    .map((item) => item["embedding"]);
}

/** شباهت کسینوسی دو بردار هم‌طول. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** متن یکپارچه‌ی سوال+گزینه‌ها برای ورودی مدل embedding. */
export function buildQuestionEmbeddingText(questionText: string, options: string[]): string {
  return `${questionText.trim()} :: ${options.map((o) => o.trim()).join(" | ")}`;
}
