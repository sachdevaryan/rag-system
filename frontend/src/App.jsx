import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ChatMessage from "./ChatMessage";
import SourcesPanel from "./SourcesPanel";
import PdfModal from "./PdfModal";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

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

    // Add to history
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

      // Add empty assistant message that we'll fill via streaming
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "sources") {
              setSources(data.sources);
              if (data.sources.length > 0) {
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
            } else if (data.type === "done") {
              // Streaming complete
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Update history with final assistant message
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
      } catch (fallbackError) {
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
      {/* Background gradient orbs */}
      <div className="app-bg" />

      <div className="app-layout">
        {/* Sidebar */}
        <Sidebar
          documents={documents}
          setDocuments={setDocuments}
          uploading={uploading}
          setUploading={setUploading}
        />

        {/* Main Chat Panel */}
        <main className="main-panel">
          {/* Header */}
          <div className="chat-header">
            <h2>
              <span className="workspace-header-bar"></span>
              QUERY WORKSPACE
            </h2>
            <div className="chat-header-actions">
              {sources.length > 0 && (
                <button
                  className={`header-btn ${sourcesOpen ? "active" : ""}`}
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  style={sourcesOpen ? { borderColor: "var(--accent)", color: "var(--text-primary)", background: "var(--accent-glow)" } : {}}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  References ({sources.length})
                </button>
              )}
              <button className="header-btn" onClick={clearChat}>
                Reset
              </button>
              <button
                className="header-btn primary-btn"
                onClick={() => setAboutOpen(true)}
              >
                Documentation
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <svg className="empty-chat-icon-svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
                </svg>
                <h3>Knowledge Retrieval Console</h3>
                <p>
                  Upload documents using the left indexing panel, then enter a search query below. 
                  The engine will run unified hybrid vectors and keyword searches to extract verified reference passages.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}

                {streaming &&
                  messages[messages.length - 1]?.content === "" && (
                    <div className="thinking">
                      <div className="thinking-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      Querying indexed workspace passages...
                    </div>
                  )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                className="input-field"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter research query or search document context..."
                rows={1}
                disabled={streaming}
              />
              <button
                className="send-btn"
                onClick={askQuestion}
                disabled={streaming || !question.trim()}
              >
                Search
              </button>
            </div>
            <div className="input-hint">
              <kbd>Enter</kbd> to execute query · <kbd>Shift+Enter</kbd> for new line
            </div>
          </div>
        </main>

        {/* Sources Panel */}
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

      {/* PDF Modal Viewer Overlay */}
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

      {/* About Modal */}
      {aboutOpen && (
        <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Document Retrieval Architecture</h2>
            <p>
              A high-precision document search and indexing engine that merges dense semantic search 
              with sparse keyword search to retrieve grounded reference answers with page-level citations.
            </p>
            <ul className="modal-features">
              <li>Dual-Engine Indexing (BM25 + FAISS Vector Search)</li>
              <li>Reciprocal Rank Fusion (RRF) for smart result merging</li>
              <li>Cross-Encoder Reranking (MS-MARCO Deep Relevance Scoring)</li>
              <li>Precision generation via Llama 3.3 70B Engine</li>
              <li>Asynchronous Server-Sent Events (SSE) token streaming</li>
              <li>Multi-document persistence across server restarts</li>
              <li>Interactive verified reference page focus</li>
              <li>Session-based conversation context mapping</li>
            </ul>
            <button
              className="modal-close"
              onClick={() => setAboutOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
