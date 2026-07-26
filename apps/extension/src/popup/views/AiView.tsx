import { useEffect, useState, type FormEvent } from "react";

import { aiService } from "@/shared/api/services";
import { ApiClientError } from "@/shared/api/api-error";
import { tokenStorage } from "@/shared/auth/storage";
import { webUrl, WEB_ROUTES } from "@/shared/config";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AiView() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const pending = await tokenStorage.consumePendingAiPrompt();
      if (pending) {
        setInput(pending);
      }
    })();
  }, []);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const result = await aiService.chat({
        message,
        conversationId,
        mode: "ASK",
      });
      setConversationId(result.conversation.id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.assistantMessage.content },
      ]);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "AI request failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="section-title">
        <span>AI Assistant</span>
        <button
          type="button"
          className="link-btn"
          onClick={() =>
            chrome.tabs.create({ url: webUrl(WEB_ROUTES.aiAssistant) })
          }
        >
          Full app
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="chat-log">
        {messages.length === 0 ? (
          <div className="empty-state">
            Ask EliteFlow AI anything about tasks, projects, or clients.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))
        )}
        {loading ? (
          <div className="chat-bubble assistant">Thinking…</div>
        ) : null}
      </div>

      <form onSubmit={sendMessage}>
        <div className="field">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask EliteFlow AI…"
            rows={3}
          />
        </div>
        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading || !input.trim()}
        >
          {loading ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
