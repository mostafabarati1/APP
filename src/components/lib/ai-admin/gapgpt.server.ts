/**
 * فراخوانی مشترک هوش مصنوعی برای ابزارهای مدیریتی (فقط سمت سرور).
 *
 * از همان سرویس و کلید موجود پروژه (`GAPGPT_API_KEY`) استفاده می‌کند؛
 * هیچ وابستگی جدیدی اضافه نشده و کلید هرگز به مرورگر نمی‌رسد.
 */

import { resolveAiConfig } from "../ai-gateway.server";

export const ADMIN_AI_MODEL = "gpt-4o-mini";

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("خروجی هوش مصنوعی قابل خواندن نبود.");
  }
}

/** یک درخواست chat با خروجی JSON؛ خطاها به پیام فارسی تبدیل می‌شوند. */
export async function generateAdminJson(system: string, user: string): Promise<unknown> {
  const config = resolveAiConfig();

  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.chatModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new Error("محدودیت درخواست هوش مصنوعی. کمی بعد دوباره تلاش کنید.");
    }
    if (response.status === 402) {
      throw new Error("اعتبار سرویس هوش مصنوعی کافی نیست.");
    }
    throw new Error(`خطای سرویس هوش مصنوعی (${response.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("پاسخی از هوش مصنوعی دریافت نشد.");
  return extractJson(text);
}
