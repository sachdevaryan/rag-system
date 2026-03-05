from fastapi import FastAPI, UploadFile
import os

from app.ingest import ingest_pdf
from app.retrieval import hybrid_search

app = FastAPI(title="Production RAG API")

index = None
texts = None
bm25 = None


@app.get("/")
def root():
    return {"message": "Production RAG API running"}


@app.post("/upload")
async def upload_file(file: UploadFile):

    file_path = f"data/{file.filename}"

    with open(file_path, "wb") as f:
        f.write(await file.read())

    global index, texts, bm25

    index, texts, bm25 = ingest_pdf(file_path)

    return {"message": "Document indexed successfully"}

from pydantic import BaseModel


class Query(BaseModel):
    question: str


@app.post("/search")
def search(query: Query):

    results = hybrid_search(
        query.question,
        index,
        bm25,
        texts
    )

    return {
        "results": results[:5]
    }