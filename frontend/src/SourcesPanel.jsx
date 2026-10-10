const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function SourcesPanel({
  sources,
  onClose,
  setSelectedPdf,
  setSelectedPage,
}) {
  return (
    <div className="sources-panel" role="complementary" aria-label="References panel">
      {/* Header */}
      <div className="sources-header">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          References
          <span className="sources-count-badge">{sources.length}</span>
        </h3>
        <button className="sources-close" onClick={onClose} aria-label="Close references panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Reference list */}
      <div className="sources-list">
        {sources.map((source, i) => (
          <div
            key={i}
            className="source-card"
            onClick={() => {
              setSelectedPdf(`${API_URL}/documents_static/${source.document}`);
              setSelectedPage(source.page);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && (
                setSelectedPdf(`${API_URL}/documents_static/${source.document}`),
                setSelectedPage(source.page)
              )
            }
            aria-label={`Reference ${source.id}: ${source.document}, page ${source.page}`}
          >
            <div className="source-card-header">
              <span className="source-badge-num">[{source.id}]</span>
              <div className="source-meta">
                <span className="source-doc" title={source.document}>
                  {source.document}
                </span>
                <span className="source-page">Page {source.page}</span>
              </div>
              <svg className="source-open-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <p className="source-text">{source.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
