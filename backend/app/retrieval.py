from rank_bm25 import BM25Okapi
import numpy as np
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# Build BM25 index
def build_bm25(texts):

    tokenized = [doc.split(" ") for doc in texts]

    bm25 = BM25Okapi(tokenized)

    return bm25


# BM25 keyword search
def bm25_search(query, bm25, texts, top_k=5):

    tokenized_query = query.split(" ")

    scores = bm25.get_scores(tokenized_query)

    top_indices = np.argsort(scores)[::-1][:top_k]

    return [texts[i] for i in top_indices]


# Vector search
def vector_search(query, index, texts, top_k=5):

    query_embedding = embedding_model.encode([query])

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    results = [texts[i] for i in indices[0]]

    return results


# Hybrid retrieval
def hybrid_search(query, index, bm25, texts):

    vec_results = vector_search(query, index, texts)

    bm25_results = bm25_search(query, bm25, texts)

    combined = list(set(vec_results + bm25_results))

    return combined