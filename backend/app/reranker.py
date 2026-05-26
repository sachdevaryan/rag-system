def rerank(query, docs, top_k=5):
    """
    Sort documents by their RRF fusion score.
    CrossEncoder reranking removed — RRF already provides high-quality ranking
    without requiring PyTorch/SentenceTransformers in memory.
    """
    if not docs:
        return []

    # Sort by rrf_score if present, otherwise by original score
    docs = sorted(docs, key=lambda x: x.get("rrf_score", x.get("score", 0)), reverse=True)

    return docs[:top_k]