"use client";

import { useState } from "react";

type TxSummary = { id: string; date: string; amount: number; direction: string; description: string };

export function AssistChat({
  documentId,
  initialTransactions,
}: {
  documentId: string;
  initialTransactions: TxSummary[];
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/import/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          transactions: initialTransactions,
          messages: [...messages, { role: "user", text: userText }],
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.reply) {
        const text = data.appliedUpdates
          ? `${data.reply}\n\n(Updated ${data.appliedUpdates} transaction(s).)`
          : data.reply;
        setMessages((m) => [...m, { role: "assistant", text }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text:
              data.error ||
              "Assisted mode needs an API key (e.g. OPENAI_API_KEY) to run. Use **Review** to edit transactions manually.",
          },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "Request failed.",
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="max-h-[320px] space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Say e.g. &quot;What category should I use for supermarket payments?&quot; or &quot;Set all
            transfers to category Transfers.&quot; The assistant will ask questions and update
            transactions. (Requires OPENAI_API_KEY to be set for full AI behavior.)
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-sky-900/50 text-slate-100"
                : "mr-8 bg-slate-800 text-slate-200"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or answer..."
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
