import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Trash2, X } from "lucide-react";
import { apiFetch } from "../api";

const SUGGESTIONS = [
  "מה המטלות הקרובות שלי?",
  "מה הממוצע שלי?",
  "בנה לי תוכנית למידה לשבוע",
];

export default function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text) {
    const content = text.trim();
    if (!content || sending) {
      return;
    }

    const conversation = [...messages, { role: "user", content }];
    setMessages(conversation);
    setDraft("");
    setError("");
    setSending(true);

    try {
      const reply = await apiFetch("/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: conversation }),
      });
      setMessages([
        ...conversation,
        { role: "assistant", content: reply.content },
      ]);
    } catch (err) {
      setMessages(messages);
      setDraft(content);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    send(draft);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
  }

  return (
    <div className="assistant">
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="עוזר אישי">
          <div className="assistant-head">
            <div className="assistant-title">
              <strong>עוזר אישי</strong>
              <span>רואה רק את המידע שלך</span>
            </div>
            <button
              type="button"
              className="assistant-icon-button"
              onClick={clearChat}
              title="ניקוי השיחה"
              aria-label="ניקוי השיחה"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              className="assistant-icon-button"
              onClick={() => setOpen(false)}
              title="סגירה"
              aria-label="סגירה"
            >
              <X size={18} />
            </button>
          </div>

          <div className="assistant-chat" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "tutor-message tutor-message-user"
                    : "tutor-message tutor-message-assistant"
                }
              >
                {message.content}
              </div>
            ))}
            {sending && (
              <div className="tutor-message tutor-message-assistant tutor-message-pending">
                העוזר כותב...
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <div ref={chatEndRef} />
          </div>

          {messages.length === 0 && (
            <div className="assistant-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="assistant-suggestion"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className="assistant-form" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={5000}
              placeholder="שאל את העוזר..."
              aria-label="הודעה לעוזר"
            />
            <button
              type="submit"
              className="assistant-send"
              disabled={sending || !draft.trim()}
              aria-label="שליחה"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistant-bubble"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "סגירת העוזר האישי" : "פתיחת העוזר האישי"}
        aria-expanded={open}
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
