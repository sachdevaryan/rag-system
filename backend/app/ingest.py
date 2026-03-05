from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from app.retrieval import build_bm25


# embedding model
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


def ingest_pdf(file_path):

    # load pdf
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    split_docs = splitter.split_documents(documents)

    texts = [doc.page_content for doc in split_docs]

    # create embeddings
    embeddings = embedding_model.encode(texts)

    embeddings = np.array(embeddings).astype("float32")

    # create FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings)

    bm25 = build_bm25(texts)

    return index, texts, bm25