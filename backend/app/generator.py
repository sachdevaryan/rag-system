import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an expert document analysis assistant. You answer questions accurately using ONLY the provided context from uploaded documents.

Your response style:
- Write clear, well-structured answers using markdown formatting
- Use **bold** for key terms and concepts
- Use bullet points or numbered lists when presenting multiple items
- Use headers (##) to organize longer answers into sections
- Be thorough but stay focused on what the context actually says
- Always cite your sources using [1], [2], [3] notation matching the context numbers
- If the context doesn't contain enough information, say so honestly
- Never make up information that isn't in the provided context"""


def generate_answer(question, contexts, history=None):
    """Generate an answer using Groq LLM with full context and optional conversation history."""

    context_text = "\n\n".join(contexts)

    prompt = f"""Use the following document excerpts to answer the question. Cite sources using [1], [2], [3] etc.

Context:
{context_text}

Question: {question}

Provide a thorough, well-formatted answer:"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    # Add conversation history for multi-turn support
    if history:
        for msg in history[-6:]:  # Keep last 6 messages for context window
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": prompt})

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3,
        max_tokens=1024
    )

    return completion.choices[0].message.content


def generate_answer_stream(question, contexts, history=None):
    """Stream answer tokens using Groq's streaming API. Yields string chunks."""

    context_text = "\n\n".join(contexts)

    prompt = f"""Use the following document excerpts to answer the question. Cite sources using [1], [2], [3] etc.

Context:
{context_text}

Question: {question}

Provide a thorough, well-formatted answer:"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    if history:
        for msg in history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": prompt})

    stream = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3,
        max_tokens=1024,
        stream=True
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content