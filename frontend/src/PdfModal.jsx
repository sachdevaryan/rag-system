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

  const handleZoomIn  = useCallback(() => setScale((p) => Math.min(p + 0.2, 2.5)), []);
  const handleZoomOut = useCallback(() => setScale((p) => Math.max(p - 0.2, 0.5)), []);
  const handleResetZoom = useCallback(() => setScale(1.0), []);

  const docName = file ? decodeURIComponent(file.split("/").pop()) : "Document";

  return (
    <div
      className="pdf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`PDF viewer: ${docName}`}
    >
      <div
        className="pdf-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3 title={docName}>{docName}</h3>
            <span className="page-info" style={{ paddingLeft: "6px", borderLeft: "1px solid var(--border)" }}>
              p. {page} / {numPages ?? "…"}
            </span>
          </div>

          <div className="pdf-controls">
            {/* Zoom controls */}
            <div className="pdf-control-group" role="group" aria-label="Zoom controls">
              <button
                className="pdf-ctrl-btn"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>
              <div className="pdf-ctrl-divider" />
              <button
                className="pdf-ctrl-btn"
                onClick={handleResetZoom}
                aria-label="Reset zoom"
                title="Reset zoom"
                style={{ minWidth: "42px", justifyContent: "center" }}
              >
                {Math.round(scale * 100)}%
              </button>
              <div className="pdf-ctrl-divider" />
              <button
                className="pdf-ctrl-btn"
                onClick={handleZoomIn}
                disabled={scale >= 2.5}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
            </div>

            {/* Page controls */}
            <div className="pdf-control-group" role="group" aria-label="Page navigation">
              <button
                className="pdf-ctrl-btn"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                title="Previous page"
              >
                ‹ Prev
              </button>
              <div className="pdf-ctrl-divider" />
              <span className="pdf-ctrl-label">{page} / {numPages || 1}</span>
              <div className="pdf-ctrl-divider" />
              <button
                className="pdf-ctrl-btn"
                onClick={() => setPage((p) => Math.min(p + 1, numPages || p))}
                disabled={page >= (numPages || 1)}
                aria-label="Next page"
                title="Next page"
              >
                Next ›
              </button>
            </div>

            {/* Close */}
            <button
              className="pdf-close-btn"
              onClick={onClose}
              aria-label="Close document viewer"
              title="Close (Esc)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF viewport */}
        <div className="pdf-viewport">
          <div className="pdf-page-wrapper">
            <Document
              file={file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="pdf-loading">
                  <div className="spinner" />
                  <span>Loading document…</span>
                </div>
              }
              error={
                <div className="pdf-error">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Failed to load this document.<br />Check the file URL and try again.</span>
                </div>
              }
            >
              <Page
                pageNumber={page}
                scale={scale * 1.3}
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
