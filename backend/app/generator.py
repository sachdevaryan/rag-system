import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_answer(question, contexts):

    context_text = "\n\n".join(contexts)

    prompt = f"""
You are a question answering system using provided context.

Answer the question using ONLY the context.

Rules:
- Be concise
- Cite sources like [1], [2]
- If unsure say "Not found in document"

Context:
{context_text}

Question:
{question}

Answer:
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You answer questions using given documents."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=300
    )

    return completion.choices[0].message.content