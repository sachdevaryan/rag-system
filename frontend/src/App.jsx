import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import SourcesPanel from "./SourcesPanel";
import PdfModal from "./PdfModal";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SUGGESTED_PROMPTS = [
  "Summarize the key findings and conclusions",
  "Extract quantitative metrics and data tables",
  "Compare methodologies against baseline techniques",
];

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);

  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  // Load documents on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/documents`)
      .then((res) => setDocuments(res.data.documents || []))
      .catch(() => {});
  }, []);

  // Track user scroll position to avoid breaking view during streaming
  const handleScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    userScrolledUpRef.current = !isNearBottom;
  };

  // Auto-scroll to bottom during streaming/new messages, after DOM paint
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    requestAnimationFrame(() => {
      const el = chatScrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, streaming]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleOpenPdf = (pdfUrl, page = 1) => {
    setSelectedPdf(pdfUrl);
    setSelectedPage(page);
  };

  // Auto-resize the textarea as content changes
  const autoResizeTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  };

  const askQuestion = async (overrideQuery = null) => {
    const q = (overrideQuery || question).trim();
    if (!q || streaming) return;

    const userMessage = { role: "user", content: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setStreaming(true);
    setSources([]);

    // Reset user scroll state so new question auto-scrolls
    userScrolledUpRef.current = false;
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });

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

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

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
              setSources(data.sources || []);
              if (data.sources && data.sources.length > 0) {
                setSourcesOpen(true);
              }
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
            // Ignore partial JSON
          }
        }
      }

      setHistory([
        ...updatedHistory,
        { role: "assistant", content: assistantContent },
      ]);
    } catch (error) {
      console.warn("Streaming fallback to search:", error);

      try {
        const res = await axios.post(`${API_URL}/search`, {
          question: q,
          history: updatedHistory.slice(-6),
        });

        setMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: res.data.answer,
            };
          } else {
            updated.push({
              role: "assistant",
              content: res.data.answer,
            });
          }
          return updated;
        });

        setSources(res.data.sources || []);
        if (res.data.sources && res.data.sources.length > 0) {
          setSourcesOpen(true);
        }

        setHistory([
          ...updatedHistory,
          { role: "assistant", content: res.data.answer },
        ]);
      } catch (err) {
        console.error("Search failed completely:", err);
        setMessages((prev) => {
          const updated = [...prev];
          const errText = "Unable to retrieve response. Please check that the server is running and documents are indexed.";
          if (updated[updated.length - 1]?.role === "assistant") {
            updated[updated.length - 1] = { role: "assistant", content: errText };
          } else {
            updated.push({ role: "assistant", content: errText });
          }
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
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="dust-app">
      {/* Left Sidebar */}
      <Sidebar
        documents={documents}
        setDocuments={setDocuments}
        uploading={uploading}
        setUploading={setUploading}
        selectedPdf={selectedPdf}
        onOpenPdf={handleOpenPdf}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={clearChat}
      />

      {/* Main Chat Workspace */}
      <div className="dust-main-area">
        {/* Minimal Header */}
        <header className="dust-header">
          <div className="dust-header-left">
            <button
              className={`dust-icon-btn dust-sidebar-toggle ${sidebarOpen ? "active" : ""}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            {!sidebarOpen && (
              <div
                className="dust-collapsed-brand"
                onClick={() => setSidebarOpen(true)}
                title="Expand sidebar"
              >
                <div className="dust-brand-logo mini">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  </svg>
                </div>
                <span className="dust-brand-name">Corpus</span>
              </div>
            )}

            <div className="dust-header-status">
              <span className="dust-status-indicator" />
              <span className="dust-status-text">
                {documents.length > 0
                  ? `${documents.length} document${documents.length === 1 ? "" : "s"} indexed`
                  : "No documents indexed"}
              </span>
            </div>
          </div>

          <div className="dust-header-right">
            <button
              className={`dust-header-btn ${sourcesOpen ? "active" : ""}`}
              onClick={() => setSourcesOpen(!sourcesOpen)}
              title="Toggle references panel"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>References</span>
              <span className="dust-header-count">{sources.length}</span>
            </button>

            {messages.length > 0 && (
              <button
                className="dust-header-btn"
                onClick={clearChat}
                title="New conversation"
              >
                <span>New chat</span>
              </button>
            )}

            <button
              className="dust-header-btn"
              onClick={() => setAboutOpen(true)}
              title="System details"
            >
              <span>Architecture</span>
            </button>
          </div>
        </header>

        {/* Central Chat Container */}
        <div className="dust-chat-container">
          {/* Scrollable Messages Stream */}
          <div
            className="dust-chat-scroll"
            ref={chatScrollRef}
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              /* Centered Welcome State */
              <div className="dust-empty-view">
                <div className="dust-empty-content">
                  <h1 className="dust-empty-title">What would you like to understand?</h1>
                  <p className="dust-empty-subtitle">
                    Ask a question about your indexed documents.
                  </p>

                  <div className="dust-suggested-list">
                    {SUGGESTED_PROMPTS.map((promptText, idx) => (
                      <button
                        key={idx}
                        className="dust-suggested-chip"
                        onClick={() => {
                          setQuestion(promptText);
                          inputRef.current?.focus();
                        }}
                      >
                        <span>{promptText}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages Stream */
              <div className="dust-messages-stream">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    message={msg}
                    onCitationClick={(refId) => {
                      setSourcesOpen(true);
                      const target = sources.find((s) => s.id === refId);
                      if (target) {
                        handleOpenPdf(`${API_URL}/documents_static/${target.document}`, target.page);
                      }
                    }}
                  />
                ))}

                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="dust-thinking-indicator">
                    <span className="dust-thinking-dot" />
                    <span>Searching indexed documents…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Docked Composer */}
          <div className="dust-composer-area">
            <div className="dust-composer-box">
              <textarea
                ref={inputRef}
                className="dust-composer-input"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your documents..."
                rows={1}
                disabled={streaming}
                aria-label="Message input"
              />

              <button
                className="dust-send-btn"
                onClick={() => askQuestion()}
                disabled={streaming || !question.trim()}
                aria-label="Send message"
                title="Send message"
              >
                {streaming ? (
                  <span className="dust-send-spinner" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contextual References Panel (Right Sidebar) */}
      {sourcesOpen && (
        <SourcesPanel
          sources={sources}
          onClose={() => setSourcesOpen(false)}
          setSelectedPdf={setSelectedPdf}
          setSelectedPage={setSelectedPage}
        />
      )}

      {/* PDF Viewer Modal */}
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

      {/* Architecture Modal */}
      {aboutOpen && (
        <div
          className="dust-modal-overlay"
          onClick={() => setAboutOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="dust-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dust-modal-header">
              <h3>System Architecture</h3>
              <button
                className="dust-icon-btn"
                onClick={() => setAboutOpen(false)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="dust-modal-body">
              <p className="dust-modal-desc">
                Corpus implements a hybrid document retrieval pipeline designed for high precision and grounded synthesis.
              </p>

              <div className="dust-modal-specs">
                <div className="dust-spec-item">
                  <span className="dust-spec-title">Dense Embeddings</span>
                  <span className="dust-spec-val">FastEmbed (ONNX)</span>
                </div>
                <div className="dust-spec-item">
                  <span className="dust-spec-title">Lexical Matching</span>
                  <span className="dust-spec-val">BM25 Okapi</span>
                </div>
                <div className="dust-spec-item">
                  <span className="dust-spec-title">Score Fusion</span>
                  <span className="dust-spec-val">Reciprocal Rank Fusion</span>
                </div>
                <div className="dust-spec-item">
                  <span className="dust-spec-title">Generator Model</span>
                  <span className="dust-spec-val">openai/gpt-oss-120b</span>
                </div>
              </div>
            </div>

            <div className="dust-modal-footer">
              <button
                className="dust-modal-close-btn"
                onClick={() => setAboutOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
