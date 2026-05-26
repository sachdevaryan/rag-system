import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div style={{ width: "100%" }}>
        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Actions (only for answers) */}
        {!isUser && (
          <div className="message-actions">
            <button
              className={`msg-action-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
            >
              {copied ? "✓ Copied" : "Copy to Clipboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
