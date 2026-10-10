import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import SourcesPanel from "./SourcesPanel";
import PdfModal from "./PdfModal";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [sources, setSources] = useState([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load documents on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/documents`)
      .then((res) => setDocuments(res.data.documents))
      .catch(() => {});
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const askQuestion = async () => {
    const q = question.trim();
    if (!q || streaming) return;

    const userMessage = { role: "user", content: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setStreaming(true);
    setSources([]);
    setSourcesOpen(false);

    const updatedHistory = [...history, userMessage];

    try {
      const response = await fetch(`${API_URL}/search/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: updatedHistory.slice(-6),
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "sources") {
              setSources(data.sources);
              if (data.sources.length > 0) setSourcesOpen(true);
            } else if (data.type === "token") {
              assistantContent += data.token;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      setHistory([
        ...updatedHistory,
        { role: "assistant", content: assistantContent },
      ]);
    } catch (error) {
      console.error("Stream error:", error);

      // Fallback to non-streaming endpoint
      try {
        const res = await axios.post(`${API_URL}/search`, {
          question: q,
          history: updatedHistory.slice(-6),
        });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: res.data.answer,
          };
          return updated;
        });

        setSources(res.data.sources);
        if (res.data.sources.length > 0) setSourcesOpen(true);

        setHistory([
          ...updatedHistory,
          { role: "assistant", content: res.data.answer },
        ]);
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Something went wrong. Please try again.",
          };
          return updated;
        });
      }
    }

    setStreaming(false);
  };

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    setSources([]);
    setSourcesOpen(false);
    setSelectedPdf(null);
    setSelectedPage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <>
      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar
          documents={documents}
          setDocuments={setDocuments}
          uploading={uploading}
          setUploading={setUploading}
        />

        {/* Main workspace */}
        <main className="main-panel">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="workspace-indicator" aria-hidden="true" />
              <h2>Query Workspace</h2>
            </div>

            <div className="chat-header-actions">
              {sources.length > 0 && (
                <button
                  className={`btn btn-ghost${sourcesOpen ? " active" : ""}`}
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  aria-pressed={sourcesOpen}
                  aria-label={`${sourcesOpen ? "Hide" : "Show"} references`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  References ({sources.length})
                </button>
              )}

              {messages.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={clearChat}
                  aria-label="Reset conversation"
                >
                  Reset
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={() => setAboutOpen(true)}
                aria-label="View documentation"
              >
                Documentation
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-chat-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                  </svg>
                </div>
                <h3>Knowledge Retrieval Console</h3>
                <p>
                  Upload documents using the left panel, then ask a question.
                  The engine runs hybrid vector + keyword search to extract
                  citation-backed answers from your documents.
                </p>
                <div className="empty-tips" aria-label="Example queries">
                  <span className="empty-tip-tag">Summarize key findings</span>
                  <span className="empty-tip-tag">Compare methodologies</span>
                  <span className="empty-tip-tag">Extract data tables</span>
                  <span className="empty-tip-tag">Find definitions</span>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}

                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="thinking" role="status" aria-label="Generating response">
                    <div className="thinking-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    Searching indexed passages…
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Query composer */}
          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                className="input-field"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents…"
                rows={1}
                disabled={streaming}
                aria-label="Query input"
                aria-disabled={streaming}
              />
              <button
                className="send-btn"
                onClick={askQuestion}
                disabled={streaming || !question.trim()}
                aria-label="Submit query"
              >
                {streaming ? (
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
            <div className="input-hint">
              <kbd>Enter</kbd> to search &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
            </div>
          </div>
        </main>

        {/* References panel */}
        {sourcesOpen && sources.length > 0 && (
          <SourcesPanel
            sources={sources}
            onClose={() => setSourcesOpen(false)}
            selectedPdf={selectedPdf}
            setSelectedPdf={setSelectedPdf}
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
          />
        )}
      </div>

      {/* PDF viewer */}
      {selectedPdf && (
        <PdfModal
          file={selectedPdf}
          initialPage={selectedPage}
          onClose={() => {
            setSelectedPdf(null);
            setSelectedPage(null);
          }}
        />
      )}

      {/* About / Documentation modal */}
      {aboutOpen && (
        <div
          className="modal-overlay"
          onClick={() => setAboutOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Documentation"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Document Retrieval Architecture</h2>
            <p>
              A high-precision document search engine that merges dense semantic
              vectors with sparse keyword search to retrieve grounded,
              citation-backed answers with page-level source references.
            </p>
            <ul className="modal-features">
              <li>Dual-engine indexing — BM25 + FAISS vector search</li>
              <li>Reciprocal Rank Fusion (RRF) for smart result merging</li>
              <li>ONNX-optimised embeddings via fastembed (no PyTorch)</li>
              <li>Generation via <code>openai/gpt-oss-120b</code> on Groq</li>
              <li>Asynchronous SSE token streaming</li>
              <li>Multi-document persistence across server restarts</li>
              <li>Interactive page-level citation references</li>
              <li>Session-based conversation context</li>
            </ul>
            <button
              className="modal-close"
              onClick={() => setAboutOpen(false)}
              aria-label="Close documentation"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
