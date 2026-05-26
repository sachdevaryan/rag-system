import PdfViewer from "./PdfViewer";

const API_URL = "http://127.0.0.1:8000";

export default function SourcesPanel({ sources, onClose, selectedPdf, setSelectedPdf, selectedPage, setSelectedPage }) {

  return (
    <div className="sources-panel">
      {/* Header */}
      <div className="sources-header">
        <h3>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "text-bottom", marginRight: "6px" }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          References ({sources.length})
        </h3>
        <button className="sources-close" onClick={onClose}>✕</button>
      </div>

      {/* Source Cards */}
      <div className="sources-list">
        {sources.map((source, i) => (
          <div
            key={i}
            className="source-card"
            onClick={() => {
              setSelectedPdf(`${API_URL}/documents_static/${source.document}`);
              setSelectedPage(source.page);
            }}
          >
            <div className="source-badge">
              <span className="source-badge-num">[{source.id}]</span>
              <span>Page {source.page}</span>
              <span className="source-doc">— {source.document}</span>
            </div>
            <div className="source-text">{source.text}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
