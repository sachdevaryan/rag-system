# Use official Python 3.11 slim image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies (required for FAISS and fastembed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set Hugging Face Spaces required environment variables
# Run on port 7860
ENV PORT=7860
# Force 1 thread for onnxruntime/openmp to save memory (though HF Spaces gives 16GB, it's good practice)
ENV OMP_NUM_THREADS=1
ENV ONNXRUNTIME_NUM_THREADS=1

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create the models directory
RUN mkdir -p models

# Pre-cache the fastembed model during the Docker build phase
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/all-MiniLM-L6-v2', cache_dir='models')"

# Copy the rest of the application code (from the backend folder)
COPY backend/ ./

# Hugging Face Spaces requires running as a non-root user (uid 1000)
RUN useradd -m -u 1000 user
# Change ownership of the /app directory so the user can write indices to data/indices
RUN chown -R user:user /app

# Switch to the non-root user
USER user

# Create data directory for indices at runtime
RUN mkdir -p data/indices

# Expose the mandatory port for Hugging Face Spaces
EXPOSE 7860

# Run the FastAPI app on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
