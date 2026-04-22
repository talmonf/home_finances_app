/** OpenAI Whisper (`whisper-1`) — good English; Hebrew is usable but often weaker; not medical-specialized. */

export type TranscriptionLanguageCode = "en" | "he";
export type WhisperProvider = "openrouter" | "openai";

const OPENROUTER_TRANSCRIBE_MAX_BYTES = 4 * 1024 * 1024;

function getOpenRouterConfig(): {
  provider: WhisperProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) return null;
  return {
    provider: "openrouter",
    apiKey: openRouterKey,
    baseUrl: "https://openrouter.ai/api/v1/audio/transcriptions",
    model: process.env.OPENROUTER_AUDIO_MODEL?.trim() || "openai/whisper-1",
  };
}

function getOpenAIConfig(): {
  provider: WhisperProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) return null;
  return {
    provider: "openai",
    apiKey: openAiKey,
    baseUrl: "https://api.openai.com/v1/audio/transcriptions",
    model: process.env.OPENAI_AUDIO_MODEL?.trim() || "whisper-1",
  };
}

function normalizeErrorText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Transcription request failed";
  if (trimmed.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
    return "Audio payload too large for transcription provider.";
  }
  return trimmed;
}

async function transcribeOnce(
  cfg: { provider: WhisperProvider; apiKey: string; baseUrl: string; model: string },
  audio: Buffer,
  fileName: string,
  mimeType: string,
  language: TranscriptionLanguageCode,
): Promise<{ text: string; provider: WhisperProvider }> {
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
    throw new Error(normalizeErrorText(text) || `${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { text?: string };
  if (typeof data.text !== "string") {
    throw new Error("Unexpected transcription response");
  }
  return { text: data.text, provider: cfg.provider };
}

export async function transcribeWithOpenAIWhisper(
  audio: Buffer,
  fileName: string,
  mimeType: string,
  language: TranscriptionLanguageCode,
): Promise<{ text: string; provider: WhisperProvider }> {
  const openRouterCfg = getOpenRouterConfig();
  const openAiCfg = getOpenAIConfig();
  if (!openRouterCfg && !openAiCfg) {
    throw new Error("OPENROUTER_API_KEY or OPENAI_API_KEY is not configured");
  }

  // OpenRouter audio endpoint can reject larger payloads in some deployments.
  // For larger files, prefer direct OpenAI when available.
  if (openRouterCfg && audio.length <= OPENROUTER_TRANSCRIBE_MAX_BYTES) {
    try {
      return await transcribeOnce(openRouterCfg, audio, fileName, mimeType, language);
    } catch (error) {
      if (!openAiCfg) throw error;
      console.warn("OpenRouter transcription failed; retrying with OpenAI:", error);
    }
  }

  if (openAiCfg) {
    return transcribeOnce(openAiCfg, audio, fileName, mimeType, language);
  }

  throw new Error(
    "Audio file too large for configured transcription provider. Configure OPENAI_API_KEY or use AWS Hebrew transcription.",
  );
}
