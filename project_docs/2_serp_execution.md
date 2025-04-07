# 🔍 SERP Execution Workflow  
*Core module #2 in the Grey Literature Search App pipeline*

---

## 🔹 Purpose

The **SERP Execution** module takes fully generated search strings from the **Search Strategy Builder**, executes them across selected SERP APIs, and returns standardized, enriched, and deduplicatable search results to the **Results Manager**.

---

## 🔹 Goals

- Execute each search string against selected SERP APIs
- Retrieve up to the user-defined maximum number of results
- Enrich results with structured **search metadata**
- Output each result in a standardized format with a unique ID
- Ensure compatibility with the **Results Manager** for downstream processing and PRISMA tracking

---

## 🔹 Core Workflow

```plaintext
For each search string:
  For each selected SERP API:
    → Make authenticated API request
    → Paginate (if supported) to retrieve max N results
    → Parse and normalize results
    → Enrich each result with:
        - Metadata (search engine, language, location, etc.)
        - Unique identifier (UUID)
        - Raw API response (optional)
    → Output each result in the standard format
```

---

## 🔹 Standard Output Format (Per Result)

```json
{
  "id": "a789bcee-4721-4a33-8046-122dcd0d3abc",                    // Unique per result
  "query": "(adults AND type 2 diabetes) site:nice.org.uk filetype:pdf",
  "title": "Type 2 Diabetes Guidelines",
  "url": "https://www.nice.org.uk/guidance/ng28",
  "snippet": "This guideline covers the diagnosis and management...",
  "rank": 1,
  "result_type": "organic",                                       // Can be "ad", "snippet", etc.
  "search_engine": "Google Search API (via Serper)",
  "device": "desktop",                                            // Optional, if API supports
  "location": "UK",                                               // Optional, user-defined or inferred
  "language": "en",
  "total_results": 13400000,                                      // From SERP response
  "credits_used": 1,
  "search_id": "search-xyz-456",                                  // Unique per API search
  "search_url": "https://www.google.com/search?q=...",
  "related_searches": [
    "type 2 diabetes treatment",
    "diabetes guidelines 2024"
  ],
  "similar_questions": [
    "What are the NICE diabetes guidelines?"
  ],
  "timestamp": "2025-03-27T14:42:00Z",                            // UTC timestamp
  "raw_response": { /* Full raw API result block */ }
}
```

---

## 🔹 Metadata Fields Explained

### 📤 Request Metadata
| Field | Description |
|-------|-------------|
| `query` | The complete search string |
| `device` | `desktop`, `mobile`, etc. |
| `location` | Location context used in the query |
| `language` | Language of the search |
| `search_engine` | API or search source used |

### 📥 Response Metadata
| Field | Description |
|-------|-------------|
| `status` | Status of the search request |
| `total_results` | Reported total results from the API |
| `time_taken` | (Optional) Execution time |
| `search_id` | Unique ID for the search from the API |
| `search_url` | Link to live results page |

### 📈 Additional
| Field | Description |
|-------|-------------|
| `credits_used` | API credit count used for query |
| `related_searches` | Related queries from API |
| `similar_questions` | Related FAQs (SERP features) |

---

## 🔄 Pagination Support (Per API)

### ✅ SerpApi
- Use `start` parameter to paginate in steps of 10
- Retrieve up to 100 results per query

### ⚠️ Serper API
- Limited to first 10–20 results per query
- No formal pagination support currently

---

## 🧪 Result Normalization

Before output:
- Normalize URLs (strip parameters)
- Assign UUID to each result
- Attach all metadata fields
- Store original result in `raw_response` field

---

## 🔧 Output Structure (Batch Mode)

If emitting multiple results per query:
```json
{
  "query": "...",
  "search_engine": "...",
  "search_id": "...",
  "timestamp": "...",
  "total_results": ...,
  "results": [ { ... }, { ... } ]
}
```

The **Results Manager** can extract and persist each result individually using the `results[]` array.

---

## 🔐 Security and Logging

- Secure API keys via environment variables
- Log:
  - Errors
  - Rate limits
  - Failed queries
  - Duplicate search prevention

---

## ✅ Compatibility with Results Manager

The SERP Execution output format:
- ✅ Includes all required metadata
- ✅ Is normalized and deduplicatable
- ✅ Assigns a unique `id` per result
- ✅ Stores rich search context for PRISMA reporting
- ✅ Can be stored directly into a structured database

