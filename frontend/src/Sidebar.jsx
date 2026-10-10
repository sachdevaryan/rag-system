import { useState, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Sidebar({ documents, setDocuments, uploading, setUploading }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setProgress(0);

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (p) => {
          const percent = Math.round((p.loaded * 100) / p.total);
          setProgress(percent);
        },
      });

      const docsRes = await axios.get(`${API_URL}/documents`);
      setDocuments(docsRes.data.documents);
    } catch (err) {
      console.error("Upload failed:", err);
    }

    setUploading(false);
    setProgress(0);
  };

  const deleteDoc = async (name) => {
    try {
      await axios.delete(`${API_URL}/documents/${name}`);
      setDocuments((prev) => prev.filter((d) => d.name !== name));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
          </svg>
        </div>
        <div className="sidebar-brand-info">
          <h1>Knowledge Base</h1>
          <p>Enterprise Search</p>
        </div>
      </div>

      {/* Upload */}
      <div className="upload-section">
        <div
          className={`upload-zone${dragOver ? " drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Upload PDF document"
        >
          <div className="upload-icon-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="upload-text-group">
            <strong>Upload PDF</strong>
            <span>or drag &amp; drop</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files[0]) uploadFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="progress-header">
              <span className="progress-text">Indexing document…</span>
              <span className="progress-pct">{progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="doc-list-section">
        <div className="doc-list-header">
          <span className="doc-list-label">Indexed Files</span>
          <span className="doc-list-count">{documents.length}</span>
        </div>

        <div className="doc-list">
          {documents.length === 0 ? (
            <div className="no-docs">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", color: "var(--text-muted)", display: "block" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>No indexed documents.<br />Upload a PDF to start.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.name} className="doc-item" title={doc.name}>
                <div className="doc-icon-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="doc-info">
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">
                    {doc.page_count} pg · {doc.chunk_count} passages
                  </div>
                </div>
                <button
                  className="doc-delete"
                  onClick={() => deleteDoc(doc.name)}
                  title="Remove document"
                  aria-label={`Remove ${doc.name}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
