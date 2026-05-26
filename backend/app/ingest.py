from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import faiss
import numpy as np
from app.retrieval import build_bm25, get_embedding_model
import os
import json
import pickle

# Persistence directory
INDEX_DIR = "data/indices"
os.makedirs(INDEX_DIR, exist_ok=True)


def ingest_pdf(file_path):
    """Load, split, embed, and index a PDF document."""

    # Load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # Split into chunks with larger size for better context
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=200
    )

    split_docs = splitter.split_documents(documents)

    chunks = []

    # Store text + metadata
    for doc in split_docs:
        chunks.append({
            "text": doc.page_content,
            "page": doc.metadata["page"] + 1,
            "document": os.path.basename(file_path)
        })

    texts = [c["text"] for c in chunks]

    # Create embeddings
    embeddings = get_embedding_model().encode(texts)
    embeddings = np.array(embeddings).astype("float32")

    # Create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    # Build BM25 index
    bm25 = build_bm25(texts)

    # Persist to disk
    doc_name = os.path.basename(file_path)
    save_index(doc_name, index, chunks, bm25)

    return index, chunks, bm25


def save_index(doc_name, index, chunks, bm25):
    """Save FAISS index, chunks, and BM25 to disk for persistence."""
    doc_dir = os.path.join(INDEX_DIR, doc_name)
    os.makedirs(doc_dir, exist_ok=True)

    # Save FAISS index
    faiss.write_index(index, os.path.join(doc_dir, "faiss.index"))

    # Save chunks as JSON
    with open(os.path.join(doc_dir, "chunks.json"), "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

    # Save BM25 with pickle
    with open(os.path.join(doc_dir, "bm25.pkl"), "wb") as f:
        pickle.dump(bm25, f)


def load_index(doc_name):
    """Load a previously saved index from disk."""
    doc_dir = os.path.join(INDEX_DIR, doc_name)

    if not os.path.exists(doc_dir):
        return None, None, None

    # Load FAISS index
    index = faiss.read_index(os.path.join(doc_dir, "faiss.index"))

    # Load chunks
    with open(os.path.join(doc_dir, "chunks.json"), "r", encoding="utf-8") as f:
        chunks = json.load(f)

    # Load BM25
    with open(os.path.join(doc_dir, "bm25.pkl"), "rb") as f:
        bm25 = pickle.load(f)

    return index, chunks, bm25


def load_all_indices():
    """Load all saved indices on startup. Returns a dict of doc_name -> (index, chunks, bm25)."""
    registry = {}

    if not os.path.exists(INDEX_DIR):
        return registry

    for doc_name in os.listdir(INDEX_DIR):
        doc_dir = os.path.join(INDEX_DIR, doc_name)
        if os.path.isdir(doc_dir):
            index, chunks, bm25 = load_index(doc_name)
            if index is not None:
                registry[doc_name] = {
                    "index": index,
                    "chunks": chunks,
                    "bm25": bm25,
                    "page_count": max(c["page"] for c in chunks) if chunks else 0
                }

    return registry


def delete_index(doc_name):
    """Delete a document's index from disk."""
    import shutil
    doc_dir = os.path.join(INDEX_DIR, doc_name)
    if os.path.exists(doc_dir):
        shutil.rmtree(doc_dir)

    # Also remove the PDF file
    pdf_path = os.path.join("data", doc_name)
    if os.path.exists(pdf_path):
        os.remove(pdf_path)