/** OpenAI Whisper (`whisper-1`) — good English; Hebrew is usable but often weaker; not medical-specialized. */

export type TranscriptionLanguageCode = "en" | "he";
export type WhisperProvider = "openrouter" | "openai";

function getWhisperConfig(): {
  provider: WhisperProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      provider: "openrouter",
      apiKey: openRouterKey,
      baseUrl: "https://openrouter.ai/api/v1/audio/transcriptions",
      model: process.env.OPENROUTER_AUDIO_MODEL?.trim() || "openai/whisper-1",
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) {
    throw new Error("OPENROUTER_API_KEY or OPENAI_API_KEY is not configured");
  }

  return {
    provider: "openai",
    apiKey: openAiKey,
    baseUrl: "https://api.openai.com/v1/audio/transcriptions",
    model: process.env.OPENAI_AUDIO_MODEL?.trim() || "whisper-1",
  };
}

export async function transcribeWithOpenAIWhisper(
  audio: Buffer,
  fileName: string,
  mimeType: string,
  language: TranscriptionLanguageCode,
): Promise<{ text: string; provider: WhisperProvider }> {
  const cfg = getWhisperConfig();

  const form = new FormData();
  const blob = new Blob([new Uint8Array(audio)], { type: mimeType || "application/octet-stream" });
  form.append("file", blob, fileName || "audio");
  form.append("model", cfg.model);
  form.append("language", language);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER?.trim() || "https://vercel.com";
    headers["X-Title"] = process.env.OPENROUTER_X_TITLE?.trim() || "HomeFinancesApp";
  }

  const res = await fetch(cfg.baseUrl, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { text?: string };
  if (typeof data.text !== "string") {
    throw new Error("Unexpected transcription response");
  }
  return { text: data.text, provider: cfg.provider };
}
