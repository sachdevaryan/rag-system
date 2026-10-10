import { useState, Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Helper to normalize LaTeX delimiters \( ... \) and \[ ... \] for KaTeX
function preprocessLatex(content) {
  if (!content) return "";
  let text = content;
  // Convert \[ ... \] to block math $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);
  // Convert \( ... \) to inline math $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
  return text;
}

// Helper to make [1], [2] citations in prose interactive
function renderTextWithCitations(text, onCitationClick) {
  if (typeof text !== "string") return text;

  const regex = /\[(\d+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const citationId = parseInt(match[1], 10);
    parts.push(
      <button
        key={`cite-${match.index}`}
        type="button"
        className="dust-citation-chip"
        onClick={() => onCitationClick && onCitationClick(citationId)}
        title={`View citation [${citationId}]`}
      >
        [{citationId}]
      </button>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function processChildren(children, onCitationClick) {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return renderTextWithCitations(child, onCitationClick);
    }
    if (isValidElement(child) && child.props && child.props.children) {
      if (child.type === "code" || child.type === "pre" || child.type === "a") {
        return child;
      }
    }
    return child;
  });
}

export default function ChatMessage({ message, onCitationClick }) {
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

  const markdownComponents = {
    p({ children }) {
      return <p className="dust-prose-p">{processChildren(children, onCitationClick)}</p>;
    },
    li({ children }) {
      return <li>{processChildren(children, onCitationClick)}</li>;
    },
    table({ children }) {
      return (
        <div className="dust-table-wrap">
          <table className="dust-table">{children}</table>
        </div>
      );
    },
    code({ node, inline, className, children, ...props }) {
      if (inline) {
        return (
          <code className="dust-inline-code" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="dust-pre">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
  };

  if (isUser) {
    return (
      <div className="dust-message-turn user-turn">
        <div className="dust-user-bubble">
          {message.content}
        </div>
      </div>
    );
  }

  const processedContent = preprocessLatex(message.content);

  return (
    <div className="dust-message-turn assistant-turn">
      <div className="dust-assistant-content">
        <div className="dust-markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {processedContent}
          </ReactMarkdown>
        </div>

        {message.content && (
          <div className="dust-turn-actions">
            <button
              className="dust-copy-action"
              onClick={handleCopy}
              title="Copy answer"
              aria-label="Copy answer"
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
