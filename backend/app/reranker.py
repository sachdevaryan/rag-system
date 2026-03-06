from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank(query, docs):

    pairs = [[query, doc["text"]] for doc in docs]

    scores = reranker.predict(pairs)

    for i, score in enumerate(scores):
        docs[i]["rerank_score"] = float(score)

    docs = sorted(docs, key=lambda x: x["rerank_score"], reverse=True)

    return docs[:3]