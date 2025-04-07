# 📦 Results Manager  
*Core module #3 in the Grey Literature Search App pipeline*

---

## 🔹 Purpose

The **Results Manager** is responsible for processing, cleaning, and storing search results returned by the SERP Execution workflow.

It ensures:
- 🚫 Duplicate results are removed
- 📊 PRISMA-compliant tracking is maintained
- 🧾 Each result is enriched with **search metadata**
- 🗃️ All data is saved in a structured, queryable format for downstream use

---

## 🔹 Workflow Overview

```plaintext
                +------------------------+
                |  SERP Execution Output |
                +------------------------+
                           |
                           v
                 +-------------------+
                 |  Results Manager  |
                 +-------------------+
                           |
         +----------------+----------------+
         |                                 |
         v                                 v
+------------------+             +---------------------+
|  Deduplicate     |             | Enrich with Metadata|
|  (URL & title)   |             +---------------------+
+--------+---------+                         |
         |                                    v
         v                         +---------------------+
+---------------------------+     | Store to Database    |
| Log Duplicates for PRISMA |     | with UUIDs & metadata|
+---------------------------+     +----------+----------+
                                             |
                                    +--------+--------+
                                    | Ready for Review |
                                    | UI / Export Flow |
                                    +------------------+
```

---

## 🔹 Step-by-Step Process

### 1. 🧽 Deduplication

#### Techniques:
- **Normalized URL Matching**:
  - Strip protocol, tracking parameters, trailing slashes
  - Example:  
    `https://example.com/page?utm_source=x` → `example.com/page`

- **Optional: Title Similarity Matching**  
  Use fuzzy string matching (e.g., Levenshtein distance) to catch near-duplicates

#### ✅ PRISMA Logging:
- Track total before/after
- Count of duplicates removed

```json
{
  "total_results_before": 183,
  "duplicates_removed": 47,
  "total_after_deduplication": 136
}
```

---

### 2. 🧠 Enrich with SERP Metadata

For each result, metadata from the API response is stored alongside it.

#### 🔹 Request Metadata:
- `query`: Search string used
- `device`: Search run on desktop, mobile, etc.
- `location`: Geographic location
- `language`: Search language
- `search_engine`: e.g., Google via Serper, Bing via Serper

#### 🔹 Response Metadata:
- `status`: API response status
- `total_results`: Total results found
- `time_taken`: How long the search took
- `search_id`: Unique search ID
- `search_url`: URL of the actual search results page

#### 🔹 Additional Metadata:
- `credits_used`: For credit-based APIs like SerpApi
- `search_volume`: (if available) — popularity of query
- `related_searches`: Alternative query suggestions
- `similar_questions`: Related FAQs
- `result_type`: "organic", "ad", "snippet", etc.

---

### 3. 🗃️ Results Storage

#### Each final (deduplicated) result includes:
- Unique `UUID`
- Result data (`title`, `url`, `snippet`, `rank`)
- Full metadata from the request and response
- Raw API response stored as JSON blob (optional)

#### ✅ Example Output Schema (Per Result)

```json
{
  "id": "a789bcee-4721-4a33-8046-122dcd0d3abc",
  "query": "(adults AND type 2 diabetes) site:nice.org.uk filetype:pdf",
  "url": "https://www.nice.org.uk/guidance/ng28",
  "title": "Type 2 Diabetes Guidelines",
  "snippet": "This guideline covers the diagnosis and management...",
  "rank": 1,
  "result_type": "organic",
  "search_engine": "Google Search API (via Serper)",
  "device": "desktop",
  "location": "UK",
  "language": "en",
  "total_results": 13400000,
  "credits_used": 1,
  "search_id": "search-xyz-456",
  "search_url": "https://www.google.com/search?q=...",
  "related_searches": ["type 2 diabetes treatment", "diabetes guidelines 2024"],
  "similar_questions": ["What are the NICE diabetes guidelines?"],
  "timestamp": "2025-03-27T14:42:00Z",
  "raw_response": { /* full original API response here */ }
}
```

---

## 🔧 Database Design Overview

### 📌 `search_requests` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique request ID |
| query | TEXT | Full query string |
| device | TEXT | `desktop`, `mobile`, etc. |
| location | TEXT | User-set or inferred |
| language | TEXT | `en`, `fr`, etc. |
| search_engine | TEXT | API used |
| search_id | TEXT | API-provided ID |
| search_url | TEXT | Link to live results |
| total_results | INTEGER | From SERP response |
| time_taken | FLOAT | Time in seconds |
| status | TEXT | `success`, `error`, etc. |
| credits_used | INTEGER | API credit cost |
| search_volume | INTEGER | If available |
| related_searches | JSONB | Array of related terms |
| similar_questions | JSONB | Array of related Q&A |
| created_at | TIMESTAMP | Timestamp of search |

### 📌 `search_results` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique result ID |
| search_request_id | UUID | FK to `search_requests` |
| title | TEXT | Result title |
| url | TEXT | Canonical result URL |
| snippet | TEXT | Description or preview |
| rank | INTEGER | Order in result list |
| result_type | TEXT | `organic`, `ad`, etc. |
| raw_data | JSONB | Original result block |
| created_at | TIMESTAMP | Timestamp of insert |

---

## ✅ Benefits of the Results Manager

| Feature | Benefit |
|--------|---------|
| Deduplication | Clean, non-redundant dataset |
| PRISMA Tracking | Transparent search reporting |
| Metadata Storage | Reproducibility + debug insight |
| UUIDs | Secure, traceable, non-colliding IDs |
| Raw storage | Future-proofing & audit trail |
| Structured DB | UI-friendly and export-ready |

---

## 🔜 Next Steps

- Build deduplication logic (normalize URLs + optional title similarity)
- Implement metadata enrichment from SERP response
- Set up database schema and saving logic
- Connect this to your **Results Review UI** or export system

---
