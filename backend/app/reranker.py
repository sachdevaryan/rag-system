_reranker = None

def get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


def rerank(query, docs, top_k=5):
    """
    Rerank documents using a cross-encoder model.
    Accepts up to 10 candidates and returns top_k (default 5).
    """
    if not docs:
        return []

    pairs = [[query, doc["text"]] for doc in docs]

    scores = get_reranker().predict(pairs)

    for i, score in enumerate(scores):
        docs[i]["rerank_score"] = float(score)

    docs = sorted(docs, key=lambda x: x["rerank_score"], reverse=True)

    return docs[:top_k]