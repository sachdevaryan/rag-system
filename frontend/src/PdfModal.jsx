import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfModal({ file, initialPage, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [page, setPage] = useState(initialPage || 1);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    if (initialPage) setPage(initialPage);
  }, [initialPage]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleZoomIn  = useCallback(() => setScale((p) => Math.min(Number((p + 0.15).toFixed(2)), 2.2)), []);
  const handleZoomOut = useCallback(() => setScale((p) => Math.max(Number((p - 0.15).toFixed(2)), 0.6)), []);
  const handleResetZoom = useCallback(() => setScale(1.0), []);

  const docName = file ? decodeURIComponent(file.split("/").pop()) : "Document";

  return (
    <div
      className="dust-pdf-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer: ${docName}`}
    >
      <div
        className="dust-pdf-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Toolbar */}
        <header className="dust-pdf-toolbar">
          <div className="dust-pdf-file-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="dust-pdf-filename" title={docName}>{docName}</span>
          </div>

          <div className="dust-pdf-controls">
            {/* Page Navigation */}
            <div className="dust-pdf-btn-group">
              <button
                className="dust-pdf-btn"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                title="Previous page"
              >
                ‹
              </button>
              <span className="dust-pdf-page-counter">
                {page} / {numPages || 1}
              </span>
              <button
                className="dust-pdf-btn"
                onClick={() => setPage((p) => Math.min(p + 1, numPages || p))}
                disabled={page >= (numPages || 1)}
                title="Next page"
              >
                ›
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="dust-pdf-btn-group">
              <button
                className="dust-pdf-btn"
                onClick={handleZoomOut}
                disabled={scale <= 0.6}
                title="Zoom out"
              >
                −
              </button>
              <button
                className="dust-pdf-btn dust-zoom-text"
                onClick={handleResetZoom}
                title="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                className="dust-pdf-btn"
                onClick={handleZoomIn}
                disabled={scale >= 2.2}
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          <div className="dust-pdf-actions">
            <button
              className="dust-pdf-close"
              onClick={onClose}
              title="Close viewer (Esc)"
              aria-label="Close viewer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Document Canvas */}
        <div className="dust-pdf-canvas">
          <div className="dust-pdf-sheet">
            <Document
              file={file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="dust-pdf-status">
                  <span>Loading PDF…</span>
                </div>
              }
              error={
                <div className="dust-pdf-status error">
                  <span>Unable to render PDF.</span>
                </div>
              }
            >
              <Page
                pageNumber={page}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
