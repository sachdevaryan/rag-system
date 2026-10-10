import { useState, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Sidebar({
  documents,
  setDocuments,
  uploading,
  setUploading,
  selectedPdf,
  onOpenPdf,
  isOpen,
  onToggle,
  onNewChat,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingName, setDeletingName] = useState(null);
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
          if (p.total) {
            const percent = Math.round((p.loaded * 100) / p.total);
            setProgress(percent);
          }
        },
      });

      const docsRes = await axios.get(`${API_URL}/documents`);
      setDocuments(docsRes.data.documents || []);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteDoc = async (e, name) => {
    e.stopPropagation();
    setDeletingName(name);
    try {
      await axios.delete(`${API_URL}/documents/${encodeURIComponent(name)}`);
      setDocuments((prev) => prev.filter((d) => d.name !== name));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingName(null);
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
    <aside className={`dust-sidebar ${isOpen ? "open" : "collapsed"}`}>
      {/* Sidebar Header */}
      <div className="dust-sidebar-header">
        <div className="dust-brand">
          <div className="dust-brand-logo">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </div>
          <span className="dust-brand-name">Corpus</span>
        </div>

        {onToggle && (
          <button
            className="dust-icon-btn dust-collapse-btn"
            onClick={onToggle}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
      </div>

      {/* New Conversation Action (Dust style) */}
      <div className="dust-new-chat-wrap">
        <button
          className="dust-new-chat-btn"
          onClick={onNewChat}
          title="Start new conversation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New conversation</span>
        </button>
      </div>

      {/* Library Section */}
      <div className="dust-library-section">
        <div className="dust-section-title-row">
          <span className="dust-section-title">Documents</span>
          <span className="dust-doc-count">{documents.length}</span>
        </div>

        {/* Compact Upload Action */}
        <div
          className={`dust-upload-row ${dragOver ? "drag-over" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Upload PDF"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Upload PDF</span>
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
          <div className="dust-uploading-indicator">
            <div className="dust-progress-bar">
              <div
                className="dust-progress-fill"
                style={{ width: `${Math.max(progress, 20)}%` }}
              />
            </div>
            <span className="dust-uploading-text">Indexing document… {progress}%</span>
          </div>
        )}

        {/* Document List */}
        <div className="dust-doc-list">
          {documents.length === 0 ? (
            <div className="dust-empty-docs">
              <span>No documents indexed yet.</span>
            </div>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedPdf && selectedPdf.includes(encodeURIComponent(doc.name));
              return (
                <div
                  key={doc.name}
                  className={`dust-doc-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onOpenPdf && onOpenPdf(`${API_URL}/documents_static/${doc.name}`, 1)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    onOpenPdf &&
                    onOpenPdf(`${API_URL}/documents_static/${doc.name}`, 1)
                  }
                  title={`View ${doc.name}`}
                >
                  <svg className="dust-doc-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>

                  <div className="dust-doc-info">
                    <span className="dust-doc-name">{doc.name}</span>
                    <span className="dust-doc-pages">{doc.page_count} p.</span>
                  </div>

                  <button
                    className="dust-doc-delete"
                    onClick={(e) => deleteDoc(e, doc.name)}
                    disabled={deletingName === doc.name}
                    title="Remove document"
                    aria-label={`Remove ${doc.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="dust-sidebar-footer">
        <span className="dust-footer-tag">Hybrid RAG Search</span>
      </div>
    </aside>
  );
}
