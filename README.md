Here’s a **detailed, professional README** for your project that you can directly use for GitHub or submissions 👇

---

# 🧠 Interactive Quiz Generator (RAG-Based)

## 📌 Overview

The **Interactive Quiz Generator** is an AI-powered system that generates quiz questions from a given document. It uses a **Retrieval-Augmented Generation (RAG)** approach to ensure that questions are relevant, accurate, and context-aware.

If the uploaded document does not contain sufficient information, the system automatically fetches data from reliable web sources and generates questions based on that content.

---

## 🚀 Features

* 📄 Upload `.docx` files as input
* 🔍 Semantic search using embeddings
* 🧠 RAG-based question generation
* 🌐 Automatic fallback to web scraping
* ⚡ Fast API backend with real-time response
* 🎯 Supports customizable:

  * Question type (MCQs, etc.)
  * Number of questions

---

## 🏗️ Tech Stack

### Backend

* FastAPI – API framework for handling requests
* Uvicorn – Server to run FastAPI app

### AI / NLP

* Hugging Face Transformers – Model loading & pipeline
* Phi-3.5-mini-instruct – Question generation model
* SentenceTransformers – Text embeddings

### Vector Search

* FAISS – Fast vector similarity search

### Scraping

* Google Search Python library – Finding reliable links
* Custom Scraper (`wiki_scrapy_main.py`) – Extracts webpage content

---

## 🧠 Architecture

```
User Input (Doc + Topic)
        ↓
Text Extraction (.docx)
        ↓
Chunking + Embedding (SentenceTransformers)
        ↓
Vector Storage (FAISS)
        ↓
Semantic Search (L2 Similarity)
        ↓
    ┌───────────────┐
    │ Relevant Text?│
    └──────┬────────┘
           │ YES
           ↓
      Perform RAG
           ↓
   Generate Questions (LLM)
           ↓
         Output

           │ NO
           ↓
   Web Scraping (Google + Scraper)
           ↓
   Store → Retrieve → Generate
```

---

## 🔄 Workflow Explanation

### 1. Input Handling

* User uploads a `.docx` file and provides a topic.
* Additional parameters:

  * Question type
  * Number of questions

---

### 2. Text Extraction

* Extract text from the Word document using `python-docx`.

---

### 3. Text Processing & Embedding

* Split text into sentence groups (chunks).
* Convert each chunk into embeddings using:

  ```
  all-MiniLM-L6-v2
  ```
* Store embeddings in FAISS index.

---

### 4. Retrieval (R in RAG)

* Convert the topic into an embedding.
* Perform similarity search in FAISS.
* Retrieve top-K most relevant chunks using **L2 distance**.

---

### 5. Relevance Check

* If distance ≥ threshold (1.3):
  → No relevant content found
  → Trigger web scraping

---

### 6. Web Scraping (Fallback)

* Search trusted sources:

  * Wikipedia
  * Britannica
  * Stanford Encyclopedia
* Run scraper (`wiki_scrapy_main.py`)
* Extract content and store it again in FAISS

---

### 7. Augmentation (A in RAG)

* Combine:

  * Retrieved text
  * User topic
* Form prompt for the model

---

### 8. Generation (G in RAG)

* Use **Phi-3.5-mini-instruct** to generate questions
* Uses structured prompting:

  * System role
  * User role

---

### 9. Output

* Returns:

  * Generated questions
  * Time taken

---

## 🔍 Similarity Search

* Uses **FAISS IndexFlatL2**
* Computes **Euclidean (L2) distance**
* Lower distance = Higher similarity

---

## 📡 API Endpoints

### `GET /`

* Health check
* Returns:

```json
{
  "message": "Hello World"
}
```

---

### `POST /generate-questions`

#### Request:

* `file`: Upload `.docx`
* `topic`: Topic string
* `question_type`: (default: MCQs)
* `number_questions`: (default: 6)

#### Response:

```json
{
  "generated_questions": "...",
  "time_taken": "1.45 seconds"
}
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd quiz-generator
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Access API Docs

```
http://localhost:8000/docs
```

---

## ⚠️ Limitations

* `max_new_tokens` is low → limits output length
* Scraping depends on external scripts
* Only supports `.docx` (no PDF yet)
* Basic threshold tuning for relevance

---

## 🔮 Future Improvements

* Add support for:

  * PDFs
  * Multiple file uploads
* Improve question formatting (structured MCQs)
* Switch to cosine similarity
* Add frontend (React UI)
* Add caching for scraped results
* Improve prompt engineering

---

## 🎯 Key Concepts Demonstrated

* Retrieval-Augmented Generation (RAG)
* Semantic Search
* Vector Databases
* LLM-based Question Generation
* Web Scraping Integration
* API Development with FastAPI

---

## 🧪 Example Use Case

> Upload a document about **Machine Learning**
> Ask for **6 MCQs on Neural Networks**
> → System retrieves relevant sections
> → Generates questions from context
> → If missing → fetches from Wikipedia → retries

---

## 📌 Conclusion

This project demonstrates how to integrate:

* **LLMs + Vector Search + Web Data**
  to build a **real-world AI application** that adapts dynamically based on available information.

---

If you want, I can also:

* Convert this into **resume bullet points**
* Create a **short 1-minute pitch**
* Or generate **GitHub badges + project structure**
