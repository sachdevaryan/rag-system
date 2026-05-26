import os
# Configure CPU thread limits to save memory in multi-core hosting systems (e.g. Render)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import torch
# Restrict torch computation to a single thread and disable gradients
torch.set_num_threads(1)
torch.set_num_interop_threads(1)
torch.set_grad_enabled(False)

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.ingest import ingest_pdf, load_all_indices, delete_index
from app.retrieval import hybrid_search
from app.generator import generate_answer, generate_answer_stream
from app.reranker import rerank


class QueryRequest(BaseModel):
    question: str
    history: Optional[List[dict]] = None


app = FastAPI(title="Production RAG API")

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

app.mount("/documents_static", StaticFiles(directory="data"), name="documents")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Multi-document registry: { doc_name: { index, chunks, bm25, page_count } }
doc_registry = {}


@app.on_event("startup")
def startup_load():
    """Load all persisted indices on server startup."""
    global doc_registry
    doc_registry = load_all_indices()
    if doc_registry:
        print(f"[STARTUP] Loaded {len(doc_registry)} document(s): {list(doc_registry.keys())}")
    else:
        print("[STARTUP] No persisted documents found.")


@app.get("/")
def root():
    return {"message": "Production RAG API running", "documents": len(doc_registry)}


@app.get("/documents")
def list_documents():
    """Return list of all indexed documents with metadata."""
    docs = []
    for name, data in doc_registry.items():
        docs.append({
            "name": name,
            "page_count": data.get("page_count", 0),
            "chunk_count": len(data.get("chunks", []))
        })
    return {"documents": docs}


@app.post("/upload")
async def upload_file(file: UploadFile):
    """Upload and index a PDF document."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_path = f"data/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    index, chunks, bm25 = ingest_pdf(file_path)

    doc_registry[file.filename] = {
        "index": index,
        "chunks": chunks,
        "bm25": bm25,
        "page_count": max(c["page"] for c in chunks) if chunks else 0
    }

    return {
        "message": "Document indexed successfully",
        "document": file.filename,
        "chunks": len(chunks),
        "pages": max(c["page"] for c in chunks) if chunks else 0
    }


@app.delete("/documents/{doc_name}")
def remove_document(doc_name: str):
    """Remove a document from the registry and disk."""
    if doc_name not in doc_registry:
        raise HTTPException(status_code=404, detail="Document not found.")

    del doc_registry[doc_name]
    delete_index(doc_name)

    return {"message": f"Document '{doc_name}' deleted successfully."}


def _get_search_results(question: str):
    """Run hybrid search + rerank across all indexed documents."""
    if not doc_registry:
        raise HTTPException(status_code=400, detail="No documents uploaded. Please upload a PDF first.")

    all_results = []

    for doc_name, data in doc_registry.items():
        results = hybrid_search(question, data["index"], data["bm25"], data["chunks"])
        all_results.extend(results)

    # Rerank across all documents
    reranked = rerank(question, all_results)

    # Deduplicate by text content
    unique = {}
    for r in reranked:
        unique[r["text"]] = r
    reranked = list(unique.values())

    return reranked


@app.post("/search")
def search(query: QueryRequest):
    """Search across all documents and return a generated answer with sources."""

    reranked = _get_search_results(query.question)

    # Build contexts for LLM (top 5)
    contexts = []
    for i, r in enumerate(reranked[:5]):
        contexts.append(f"[{i+1}] {r['text']}")

    answer = generate_answer(query.question, contexts, history=query.history)

    # Build source references
    sources = []
    for i, r in enumerate(reranked[:5]):
        if f"[{i+1}]" in answer:
            sources.append({
                "id": i + 1,
                "page": r["page"],
                "document": r["document"],
                "text": r["text"][:400]
            })

    return {
        "answer": answer,
        "sources": sources
    }


@app.post("/search/stream")
async def search_stream(query: QueryRequest):
    """Stream search results as Server-Sent Events."""

    reranked = _get_search_results(query.question)

    contexts = []
    for i, r in enumerate(reranked[:5]):
        contexts.append(f"[{i+1}] {r['text']}")

    # Build sources to send first
    sources = []
    for i, r in enumerate(reranked[:5]):
        sources.append({
            "id": i + 1,
            "page": r["page"],
            "document": r["document"],
            "text": r["text"][:400]
        })

    def event_stream():
        # First send sources as a JSON event
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # Then stream answer tokens
        for token in generate_answer_stream(query.question, contexts, history=query.history):
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        # Signal completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
