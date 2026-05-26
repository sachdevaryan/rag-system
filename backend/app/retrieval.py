import os
import time
import requests
import numpy as np
from rank_bm25 import BM25Okapi

# HuggingFace Inference API endpoint for all-MiniLM-L6-v2
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
HF_TOKEN = os.getenv("HF_TOKEN", "")  # Optional - set in Render env vars for higher rate limits


def get_embeddings(texts: list[str]) -> np.ndarray:
    """
    Get embeddings from HuggingFace Inference API.
    Falls back to retry if model is loading (503).
    No local PyTorch or SentenceTransformer needed.
    """
    headers = {}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    payload = {
        "inputs": texts,
        "options": {"wait_for_model": True}
    }

    for attempt in range(3):
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
        if response.status_code == 200:
            return np.array(response.json(), dtype="float32")
        elif response.status_code == 503:
            # Model is loading — wait and retry
            time.sleep(10)
        else:
            raise RuntimeError(f"HF API error {response.status_code}: {response.text}")

    raise RuntimeError("HuggingFace Inference API failed after 3 retries.")


# -----------------------------
# Build BM25 index
# -----------------------------
def build_bm25(texts):
    tokenized = [doc.lower().split() for doc in texts]
    bm25 = BM25Okapi(tokenized)
    return bm25


# -----------------------------
# BM25 keyword search
# -----------------------------
def bm25_search(query, bm25, chunks, top_k=10):
    tokenized_query = query.lower().split()
    scores = bm25.get_scores(tokenized_query)
    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for rank, idx in enumerate(top_indices):
        results.append({
            "text": chunks[idx]["text"],
            "page": chunks[idx]["page"],
            "document": chunks[idx]["document"],
            "score": float(scores[idx]),
            "source": idx,
            "method": "bm25",
            "rank": rank + 1
        })

    return results


# -----------------------------
# Vector search (via HF API)
# -----------------------------
def vector_search(query, index, chunks, top_k=10):
    query_embedding = get_embeddings([query])

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    results = []
    for rank, (i, idx) in enumerate(zip(range(len(indices[0])), indices[0])):
        if idx == -1:
            continue
        results.append({
            "text": chunks[int(idx)]["text"],
            "page": chunks[int(idx)]["page"],
            "document": chunks[int(idx)]["document"],
            "score": float(distances[0][i]),
            "source": int(idx),
            "method": "vector",
            "rank": rank + 1
        })

    return results


# -----------------------------
# Reciprocal Rank Fusion (RRF)
# -----------------------------
def reciprocal_rank_fusion(result_lists, k=60):
    """
    Combine multiple ranked result lists using RRF.
    Each result gets score = sum(1 / (k + rank)) across all lists it appears in.
    """
    rrf_scores = {}
    result_map = {}

    for results in result_lists:
        for r in results:
            key = r["source"]
            if key not in rrf_scores:
                rrf_scores[key] = 0.0
                result_map[key] = r
            rrf_scores[key] += 1.0 / (k + r["rank"])

    sorted_keys = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    fused = []
    for key in sorted_keys:
        entry = result_map[key].copy()
        entry["rrf_score"] = rrf_scores[key]
        fused.append(entry)

    return fused


# -----------------------------
# Hybrid retrieval with RRF
# -----------------------------
def hybrid_search(query, index, bm25, chunks, top_k=10):
    vec_results = vector_search(query, index, chunks, top_k)
    bm25_results = bm25_search(query, bm25, chunks, top_k)

    fused = reciprocal_rank_fusion([vec_results, bm25_results])

    return fused[:top_k]