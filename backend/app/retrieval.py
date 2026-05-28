import numpy as np
from rank_bm25 import BM25Okapi

_embedding_model = None


def get_embedding_model():
    """
    Lazy-load fastembed's TextEmbedding model.
    Uses ONNX runtime instead of PyTorch — ~150MB RAM vs ~450MB for SentenceTransformers.
    """
    global _embedding_model
    if _embedding_model is None:
        from fastembed import TextEmbedding
        _embedding_model = TextEmbedding(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            cache_dir="data/models",
            threads=1
        )
    return _embedding_model


def get_embeddings(texts: list) -> np.ndarray:
    """Get embeddings for a list of texts using fastembed (ONNX, no PyTorch)."""
    model = get_embedding_model()
    embeddings = list(model.embed(texts))
    return np.array(embeddings, dtype="float32")


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
# Vector search (via fastembed)
# -----------------------------
def vector_search(query, index, chunks, top_k=10):
    import faiss
    faiss.omp_set_num_threads(1)
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