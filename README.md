# QuizCraft 🧠

> **AI-powered quiz generation from your own documents — grounded in your content, not hallucinations.**

QuizCraft turns any Word document into a ready-to-use quiz in seconds. Upload a `.docx`, name a topic, and the system extracts the most relevant passages using semantic search, feeds them to a local LLM, and returns well-formed quiz questions — all without sending your documents to a third-party API.

---

## Table of Contents

- [Why QuizCraft?](#why-quizcraft)
- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [The RAG Pipeline — A Closer Look](#the-rag-pipeline--a-closer-look)
- [Web Fallback: Scraping Reliable Sources](#web-fallback-scraping-reliable-sources)
- [Known Limitations & Future Work](#known-limitations--future-work)

---

## Why QuizCraft?

Most AI quiz generators ask you to paste text or use generic internet knowledge. QuizCraft is different in two important ways:

**1. Your document is the source of truth.**  
Questions are generated from text *inside your file*, not from the model's memory. This matters for domain-specific content — lecture notes, research papers, technical documentation — where hallucinated questions would be worse than useless.

**2. It degrades gracefully.**  
If your document doesn't contain enough relevant content for the requested topic, QuizCraft doesn't fail silently or make things up. Instead, it falls back to scraping curated, trustworthy sources (Wikipedia, Britannica, Stanford Encyclopedia of Philosophy) and retries the full pipeline on that content.

---

## How It Works

The core flow is a **Retrieval-Augmented Generation (RAG)** pipeline:

```
User uploads .docx + specifies topic
        │
        ▼
Extract full text from document
        │
        ▼
Split into sentence groups → encode with MiniLM → store in FAISS index
        │
        ▼
Encode user topic as query vector
        │
        ▼
FAISS similarity search → retrieve top-3 relevant chunks
        │
        ├─── [Chunks found & relevant] ──────────────────────────────────┐
        │                                                                 │
        └─── [No relevant chunks found] → scrape reliable web source     │
                    │                                                     │
                    └─── re-index scraped content → re-run FAISS search ─┘
                                                                          │
                                                                          ▼
                                                             Feed context to Phi-3.5-mini
                                                                          │
                                                                          ▼
                                                             Return N questions of chosen type
```

Every question the model generates is anchored to a real passage from either your document or a verified source. The LLM never generates questions from scratch.

---

## Architecture Overview

QuizCraft is split into two independent services:

| Layer | Responsibility |
|---|---|
| **FastAPI backend** (`app.py`) | Document parsing, embedding, FAISS indexing, LLM inference, web fallback orchestration |
| **Scrapy spider** (`wiki_scrapy_main.py`) | Invoked as a subprocess; scrapes a single URL and writes structured JSON to disk |

The backend and spider communicate through the filesystem (`scraped_results.json`). This keeps the Scrapy process isolated from FastAPI's async event loop, avoiding reactor conflicts that are common when embedding Scrapy inside other async frameworks.

---

## Tech Stack

| Component | Technology | Why |
|---|---|---|
| API server | FastAPI | Async, type-safe, great file upload support |
| LLM | `microsoft/Phi-3.5-mini-instruct` | Capable instruction-following at a size that runs on consumer GPUs |
| Embedding model | `sentence-transformers/all-MiniLM-L6-v2` | Fast, 384-dimensional embeddings; good semantic accuracy for retrieval |
| Vector store | FAISS (`IndexFlatL2`) | In-memory exact-search; no infrastructure needed for a single-user session |
| Document parsing | `python-docx` | Reads `.docx` files directly from the upload stream without writing to disk |
| Web scraping | Scrapy | Robust HTML extraction with XPath; handles Wikipedia and Britannica reliably |
| Web search | `googlesearch-python` | Finds the best URL for a topic from a curated list of trusted domains |
| ML runtime | PyTorch (CUDA-aware) | GPU inference when available, CPU fallback |

---

## Project Structure

```
QuizCraft/
├── app.py                  # FastAPI application — main entry point
├── wiki_scrapy_main.py     # Scrapy spider — run as subprocess for web fallback
├── scraped_results.json    # Temporary cache written by the spider (gitignore this)
├── micro-chat/             # Cached Phi-3.5-mini model weights
└── embed-model/            # Cached MiniLM embedding model weights
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- CUDA-capable GPU (recommended) or CPU with patience
- ~8GB disk space for model weights on first run

### Installation

```bash
git clone https://github.com/nandithay/QuizCraft.git
cd QuizCraft

pip install fastapi uvicorn transformers sentence-transformers \
    torch faiss-cpu python-docx googlesearch-python scrapy
```

> If you have a CUDA GPU, replace `faiss-cpu` with `faiss-gpu` for faster vector search.

### Running the Server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

On first run, the Phi-3.5-mini and MiniLM models will download automatically into `./micro-chat` and `./embed-model` respectively. This takes a few minutes but only happens once.

The API will be live at `http://localhost:8000`. You can explore the auto-generated docs at `http://localhost:8000/docs`.

---

## API Reference

### `POST /generate-questions`

Generates quiz questions from a document, grounded in the specified topic.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `.docx` file | Yes | The source document |
| `topic` | string | Yes | The topic to focus questions on |
| `question_type` | string | No | `"MCQs"`, `"True/False"`, `"Short Answer"` — default: `"Mcqs"` |
| `number_questions` | integer | No | How many questions to generate — default: `6` |

**Example using curl:**

```bash
curl -X POST http://localhost:8000/generate-questions \
  -F "file=@lecture_notes.docx" \
  -F "topic=photosynthesis" \
  -F "question_type=MCQs" \
  -F "number_questions=5"
```

**Response**

```json
{
  "generated_questions": "1. Which molecule is the primary product of...\n2. ...",
  "time_taken": "4.32 seconds"
}
```

**Error responses**

```json
{ "generated_questions": "Please provide both topic and a Word document." }
{ "generated_questions": "No relevant text found even after scraping." }
{ "error": "<exception message>" }
```

---

## The RAG Pipeline — A Closer Look

### Text Chunking Strategy

Rather than embedding individual sentences (which can be too short to carry meaningful context) or entire paragraphs (which can dilute signal), QuizCraft groups sentences into windows of 15:

```python
def group_sentences(sentences, group_size=15):
    grouped = [' '.join(sentences[i:i+group_size]) 
               for i in range(0, len(sentences), group_size)]
    return grouped
```

This balances specificity with context richness — each chunk is long enough to answer a question, but short enough that irrelevant content doesn't drown out the relevant passage.

### Relevance Threshold

FAISS returns distances, not scores. A low L2 distance means high similarity. QuizCraft uses a hardcoded threshold of `1.3` to reject results that are retrieved but semantically unrelated to the query:

```python
if len(distances[0]) == 0 or np.all(distances[0] >= 1.3):
    return None  # triggers the web fallback
```

This prevents the LLM from being fed irrelevant context just because FAISS always returns *some* nearest neighbors.

### LLM Prompting

The system prompt and user prompt are kept intentionally focused:

```python
messages = [
    {"role": "system", "content": f"You are a helpful AI assistant who generates "
                                   f"{number_questions} {question_type} questions from given text."},
    {"role": "user",   "content": f"Using the following '{relevant_text}', generate "
                                   f"{number_questions} {question_type} questions on the topic '{topic}'"},
]
```

The retrieved context is injected directly into the user turn, keeping the model grounded. Temperature is set to `0.1` with `do_sample=False` for deterministic, factual output — appropriate for educational content where creativity is less valuable than accuracy.

---

## Web Fallback: Scraping Reliable Sources

When the document doesn't have relevant content, QuizCraft doesn't give up. It searches for the topic across a hardcoded list of authoritative domains:

```python
reliable_sites = ["wikipedia.org", "britannica.com", "plato.stanford.edu"]
```

The spider (`wiki_scrapy_main.py`) is invoked as a subprocess rather than imported directly. This is a deliberate design choice: Scrapy's Twisted reactor can only run once per process, and importing it into an already-running FastAPI server causes reactor restart errors. Running it as a subprocess sidesteps this completely.

```python
process = subprocess.Popen(
    ["python", "wiki_scrapy_main.py", url],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)
```

The spider writes its output to `scraped_results.json`, which the backend reads once the subprocess exits. The scraped content is then indexed into FAISS and the retrieval step runs again — giving the same quality guarantee as the document-based path.

---

## Known Limitations & Future Work

**Current limitations:**

- The FAISS index is reset on each request (`vector_text_mapping = []`). For multi-user scenarios, you'd want per-session indices.
- `max_new_tokens: 5` in the generation args is almost certainly a bug left in from debugging — this needs to be increased to a meaningful value (500–1000) for real question generation.
- Model weights are cached to hardcoded absolute paths (`C:/Users/Dell/Desktop/...`), which will break on any other machine. These should be environment variables or relative paths.
- The scraper communicates through a shared JSON file on disk, which isn't safe for concurrent requests.

**Planned improvements:**

- [ ] Per-session vector stores (Redis + FAISS, or a persistent vector DB like Chroma)
- [ ] Support for PDF documents in addition to `.docx`
- [ ] Streaming response for long generation outputs
- [ ] Frontend UI for uploading documents and browsing generated quizzes
- [ ] Configurable trusted source domains via environment variable

---
