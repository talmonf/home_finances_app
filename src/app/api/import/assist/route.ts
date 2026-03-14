import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/auth";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Preferred: OPENROUTER_API_KEY (works with many models via https://openrouter.ai/).
 * Fallback: OPENAI_API_KEY for direct OpenAI.
 * Model: OPENROUTER_MODEL (default openai/gpt-4o-mini – good balance of cost and quality).
 */
function getApiConfig(): { apiKey: string; baseUrl: string; model: string } | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: OPENROUTER_URL,
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    };
  }
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const householdId = token.householdId as string | undefined;
    if (!householdId) {
      return NextResponse.json({ error: "Household required" }, { status: 403 });
    }

    const body = await req.json();
    const { documentId, transactions: txSummary, messages } = body as {
      documentId?: string;
      transactions?: { id: string; date: string; amount: number; direction: string; description: string }[];
      messages?: { role: string; text: string }[];
    };

    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }

    const doc = await prisma.documents.findFirst({
      where: { id: documentId, household_id: householdId },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const config = getApiConfig();
    if (!config) {
      return NextResponse.json({
        reply:
          "Assisted mode needs an API key. Set **OPENROUTER_API_KEY** (from [openrouter.ai](https://openrouter.ai/)) or **OPENAI_API_KEY**. " +
          "Until then, use the **Review** page to edit transactions manually.",
      });
    }

    const systemPrompt = `You are helping the user categorize and annotate bank transactions from an imported statement.
You have access to this list of transactions (id, date, amount, direction, description). The user may ask you to suggest categories, payees, or to assign them.
Reply in a short, helpful way. If they ask to set a category or payee for specific transactions, suggest exactly which transaction IDs and values to use. Do not make up transaction IDs – only use IDs from the list below.
Transaction list (JSON):
${JSON.stringify(txSummary?.slice(0, 150) ?? [])}`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(messages ?? []).map((m: { role: string; text: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.text,
      })),
    ];

    const res = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: chatMessages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data.error?.message ?? data.message ?? res.statusText;
      return NextResponse.json({
        reply: `API error: ${err}. Check your API key and model (${config.model}).`,
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({
        reply: "The model returned no reply. Try again or use the Review page.",
      });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Import assist error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
