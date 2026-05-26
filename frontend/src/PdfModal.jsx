import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfModal({ file, initialPage, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [page, setPage] = useState(initialPage || 1);
  const [scale, setScale] = useState(1.0);

  // Sync internal page with initialPage when it changes
  useEffect(() => {
    if (initialPage) {
      setPage(initialPage);
    }
  }, [initialPage]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setScale(1.0);

  const docName = file ? decodeURIComponent(file.split("/").pop()) : "Document";

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: "95vw",
          width: "900px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          background: "var(--bg-secondary)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with interactive controls */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "#ffffff",
          }}
        >
          <div className="flex flex-col min-w-0" style={{ maxWidth: "50%" }}>
            <h3
              className="text-sm font-semibold truncate text-slate-800"
              title={docName}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "text-bottom", marginRight: "6px" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              {docName}
            </h3>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Page {page} of {numPages || "..."}
            </span>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.6}
                className="hover:bg-slate-200 text-xs px-2.5 py-1.5 rounded-md text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition font-semibold"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={handleResetZoom}
                className="hover:bg-slate-200 text-xs px-3 py-1.5 rounded-md text-slate-700 transition"
                title="Reset Zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 2.5}
                className="hover:bg-slate-200 text-xs px-2.5 py-1.5 rounded-md text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition font-semibold"
                title="Zoom In"
              >
                +
              </button>
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="hover:bg-slate-200 text-xs px-2.5 py-1.5 rounded-md text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                &lt; Prev
              </button>
              <span className="text-xs px-2 text-slate-500">
                {page} / {numPages || 1}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, numPages || prev))}
                disabled={page >= (numPages || 1)}
                className="hover:bg-slate-200 text-xs px-2.5 py-1.5 rounded-md text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                Next &gt;
              </button>
            </div>

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-350 text-xs px-3.5 py-1.5 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Scrollable PDF Viewing Area */}
        <div
          className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center items-start"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="shadow-lg rounded-lg overflow-hidden border border-slate-200 bg-white">
            <Document
              file={file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex flex-col items-center justify-center p-20 text-slate-500 text-sm">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px", color: "#64748b" }}>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                  Loading Document...
                </div>
              }
              error={
                <div className="p-12 text-red-500 text-sm text-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px", color: "#ef4444" }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Failed to load PDF file.
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
