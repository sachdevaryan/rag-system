from rank_bm25 import BM25Okapi
import numpy as np
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# -----------------------------
# Build BM25 index
# -----------------------------
def build_bm25(texts):

    tokenized = [doc.split() for doc in texts]

    bm25 = BM25Okapi(tokenized)

    return bm25


# -----------------------------
# BM25 keyword search
# -----------------------------
def bm25_search(query, bm25, chunks, top_k=5):

    tokenized_query = query.split()

    scores = bm25.get_scores(tokenized_query)

    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []

    for idx in top_indices:
        results.append({
            "text": chunks[idx]["text"],
            "page": chunks[idx]["page"],
            "document": chunks[idx]["document"],
            "score": float(scores[idx]),
            "source": idx,
            "method": "bm25"
        })

    return results


# -----------------------------
# Vector search
# -----------------------------
def vector_search(query, index, chunks, top_k=5):

    query_embedding = embedding_model.encode([query])

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    results = []

    for i, idx in enumerate(indices[0]):

        results.append({
        "text": chunks[int(idx)]["text"],
        "page": chunks[int(idx)]["page"],
        "document": chunks[int(idx)]["document"],
        "score": float(distances[0][i]),
        "source": int(idx),
        "method": "vector"
    })

    return results


# -----------------------------
# Hybrid retrieval
# -----------------------------
def hybrid_search(query, index, bm25, chunks, top_k=5):

    vec_results = vector_search(query, index, chunks, top_k)

    bm25_results = bm25_search(query, bm25, chunks, top_k)

    combined = vec_results + bm25_results

    # remove duplicates
    seen = set()
    unique_results = []

    for r in combined:
        if r["source"] not in seen:
            unique_results.append(r)
            seen.add(r["source"])

    return unique_results[:top_k]