const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function SourcesPanel({
  sources = [],
  onClose,
  setSelectedPdf,
  setSelectedPage,
}) {
  const handleOpenSource = (docName, pageNum) => {
    setSelectedPdf(`${API_URL}/documents_static/${docName}`);
    setSelectedPage(pageNum);
  };

  return (
    <aside className="dust-references-panel" role="complementary" aria-label="References panel">
      {/* References Header */}
      <div className="dust-references-header">
        <div className="dust-references-title">
          <span>References</span>
          <span className="dust-ref-badge">{sources.length}</span>
        </div>
        <button
          className="dust-icon-btn dust-ref-close-btn"
          onClick={onClose}
          aria-label="Close references panel"
          title="Close panel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Sources List */}
      <div className="dust-references-list">
        {sources.length === 0 ? (
          <div className="dust-ref-empty">
            <p>No active references. Sources retrieved during chat will appear here.</p>
          </div>
        ) : (
          sources.map((source, i) => (
            <div
              key={i}
              className="dust-source-row"
              onClick={() => handleOpenSource(source.document, source.page)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && handleOpenSource(source.document, source.page)
              }
              title={`Open ${source.document} (Page ${source.page})`}
            >
              <div className="dust-source-top">
                <span className="dust-source-num">[{source.id}]</span>
                <span className="dust-source-file">{source.document}</span>
                <span className="dust-source-page">p. {source.page}</span>
              </div>
              <p className="dust-source-excerpt">{source.text}</p>
              <div className="dust-source-action">
                <span>View page {source.page}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
