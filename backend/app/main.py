from fastapi import FastAPI, UploadFile
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.ingest import ingest_pdf
from app.retrieval import hybrid_search
from app.generator import generate_answer
from app.reranker import rerank

class QueryRequest(BaseModel):
    question: str

app = FastAPI(title="Production RAG API")

app.mount("/documents", StaticFiles(directory="data"), name="documents")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

index = None
chunks = None
bm25 = None


@app.get("/")
def root():
    return {"message": "Production RAG API running"}


@app.post("/upload")
async def upload_file(file: UploadFile):

    file_path = f"data/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    global index, chunks, bm25

    index, chunks, bm25 = ingest_pdf(file_path)

    return {"message": "Document indexed successfully"}

from pydantic import BaseModel


class Query(BaseModel):
    question: str


@app.post("/search")
def search(query: QueryRequest):

    results = hybrid_search(query.question, index, bm25, chunks)

    results = rerank(query.question, results)

    unique = {}
    for r in results:
        unique[r["text"]] = r

    results = list(unique.values())

    contexts = []

    for i, r in enumerate(results[:3]):
        contexts.append(f"[{i+1}] {r['text']}")

    answer = generate_answer(query.question, contexts)

    sources = []

    for i, r in enumerate(results[:3]):
        if f"[{i+1}]" in answer:
            sources.append({
                "id": i + 1,
                "page": r["page"],
                "document": r["document"],
                "text": r["text"][:300]
            })

    return {
        "answer": answer,
        "sources": sources
    }

