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
      const res = await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (p) => {
          const percent = Math.round((p.loaded * 100) / p.total);
          setProgress(percent);
        },
      });

      // Refresh document list
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
      {/* Header */}
      <div className="sidebar-header" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 16px" }}>
        <div className="sidebar-logo-badge" style={{
          width: "38px",
          height: "38px",
          backgroundColor: "var(--accent)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          flexShrink: 0
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path>
          </svg>
        </div>
        <div className="sidebar-brand-info" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h1 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            Knowledge Base
          </h1>
          <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: "2px 0 0 0", fontWeight: "500" }}>
            Enterprise Search & Indexing
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg className="upload-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <div className="upload-text">
          <strong style={{ color: "var(--accent)" }}>Upload PDF</strong>
          <span style={{ display: "block", color: "var(--text-secondary)", marginTop: "4px", fontSize: "0.72rem" }}>or drag & drop here</span>
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

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-text">Indexing document... {progress}%</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="doc-list">
        <div className="doc-list-header">
          Indexed Files ({documents.length})
        </div>

        {documents.length === 0 ? (
          <div className="no-docs">
            No indexed documents.<br />
            Upload a PDF to build the index.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.name} className="doc-item">
              <svg className="doc-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <div className="doc-info">
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">
                  {doc.page_count} pages · {doc.chunk_count} passages
                </div>
              </div>
              <button
                className="doc-delete"
                onClick={() => deleteDoc(doc.name)}
                title="Remove document"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
