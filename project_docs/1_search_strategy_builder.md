# 🧠 Search Strategy Builder  
*Core module #1 in the Grey Literature Search App pipeline*

---

## 🔹 Purpose

The **Search Strategy Builder** helps researchers generate comprehensive, high-precision search queries by structuring concepts and keywords, enhancing them using controlled vocabularies (like MeSH), and preparing them for automated searching across trusted websites and SERP APIs.

---

## 🔹 Workflow Overview

### Step 1: User Input  
The user defines their search focus and preferences.

#### 🧩 Key Concepts
The research question is broken into **concept groups**, such as:
- `Population`: e.g. "Adults"
- `Interest`: e.g. "Type 2 Diabetes"
- `Context`: e.g. "Primary Care"

#### 🌐 Website Targeting
Users can specify **trusted domains** to include in each query (optional):
- Example: `www.who.int`, `www.nice.org.uk`

#### 🔍 SERP API Selection
User selects one or more APIs to run searches:
- [x] SerpApi
- [x] Serper API
- [x] Google Search API (via Serper)
- [x] Bing Search API (via Serper)
- [x] DuckDuckGo Search API (via Serper)

#### 🎯 Max Results Per API
User sets how many results to retrieve (up to a max defined by each API):
- Example: `50 results per API`

#### 📄 File Type Filter (Optional)
User can restrict results to:
- **PDFs**: `filetype:pdf`
- **Word documents**: `filetype:doc OR filetype:docx`
- Combined using `OR` logic

#### 📘 Clinical Guidelines (Optional)
Users can toggle **“Include Clinical Guidelines”** to:
- Automatically add terms like:
  - `guideline`, `recommendation*`, `consensus`, `guidance`
- These are **pulled from a locally stored MeSH file**

---

### Step 2: Keyword Expansion (via MeSH)

The app loads a local copy of the **MeSH (Medical Subject Headings)** dataset (JSON or RDF/XML), and:
- Expands each concept with **preferred terms** and **entry terms** (synonyms)
- Example:
  - `"Type 2 Diabetes"` → `"T2D"`, `"adult-onset diabetes"`

🔎 Keywords are grouped by concept:
```json
{
  "Population": ["adults", "middle-aged", "grown-ups"],
  "Interest": ["type 2 diabetes", "T2D", "adult-onset diabetes"],
  "Context": ["primary care", "general practice"],
  "Guideline": ["guideline", "recommendation*", "consensus", "guidance"]
}
```

The user can:
- ✅ Select/deselect generated keywords
- ➕ Add custom terms
- ❌ Remove any terms not relevant

---

### Step 3: Search String Generation

Each concept group becomes an **AND-joined block**, and each website (if provided) adds a `site:` clause. Optionally, `filetype:` filters are appended.

#### 🧪 Example Search String

```text
("adults" AND "middle-aged") AND
("type 2 diabetes" AND "T2D") AND
("primary care" AND "family medicine") AND
("guideline" AND "recommendation*") site:www.nice.org.uk filetype:pdf OR filetype:docx
```

Multiple search strings are generated — one per website + filetype combination.

---

### Step 4: Output for Review

The user reviews the final list of search strings:
- ✅ Approves useful queries
- ❌ Deletes irrelevant ones
- ➕ Adds custom-written search strings if needed

These are now ready to be passed to the **SERP Execution** module.

---

## 🔧 Architectural Considerations

### 🧠 Use of MeSH (Local)
- No external API dependency for synonyms
- Stored in JSON format and indexed by term
- Lookup via preferred term, entry terms, or tree numbers
- Example source: [https://id.nlm.nih.gov/mesh/](https://id.nlm.nih.gov/mesh/)

### 🏷️ Concept Grouping
Each concept is a **keyword group**, joined with `AND` logic. Within groups, keywords are joined using `OR` if needed (future enhancement).

### 📎 Filetype Filtering
Implemented via search modifiers like:
- `filetype:pdf`
- `filetype:doc`
- These can be appended to the end of each query string for compliant search APIs.

### 🌐 Website Filtering
Using `site:domain` ensures search results are scoped to trusted sources.

---

## 🧩 Example User Flow

1. User inputs:
   - Population: `Adults`
   - Interest: `Type 2 Diabetes`
   - Context: `Primary Care`
   - Selects: NICE and WHO websites
   - Enables: Clinical Guidelines, Restrict to PDFs
   - Selects: Google via Serper, Bing via Serper
   - Max results: 50

2. App:
   - Expands each term using MeSH
   - Adds `"guideline"` terms from MeSH
   - Builds full search strings
   - Applies `filetype:pdf` filters

3. User reviews generated queries and confirms

## **Output Format (to SERP Execution)**
- Structured list of search queries
- Metadata:
  - Selected APIs
  - Websites/domains
  - Max results per API
  - Clinical guideline toggle (Y/N)
  - Filetype filters
  - Concept-to-keyword map

## **Storage Requirements**
- Save to  `search_requests` table
- Should generate:
  ```json
  {
  "query_id": "uuid",
  "user_id": "user-abc-123",
  "query": "(...) site:who.int",
  "source": "Google Search API",
  "filters": {
    "filetype": "pdf",
    "guideline_terms": true
  },
  "search_title": "Diabetes in Adults (NICE)",
  "is_saved": true,
  "timestamp": "..."
  
  ```

## 🔍 search_requests
Field	Type	Description
query_id	UUID (PK)	Unique ID for each search string
user_id	UUID (FK)	Owner of the search
query	TEXT	Full search string
source	TEXT	Search engine/API used
filters	JSONB	{ "filetype": "pdf", "guideline_terms": true }
timestamp	TIMESTAMP	Search creation time
search_title	TEXT	(Optional) User-friendly label
is_saved	BOOLEAN	True if user saved this for reuse


## **Authentication-aware searches**
- Each query must include a `user_id` (foreign key to `users`) and optionally a `search_title` for human readability. Saved searches should be marked with `is_saved = true`. This enables `/my-searches` or `/search-history` dashboards per user.

### **Next Workflow Requirements**
- SERP Executor expects an array of structured query objects with metadata

---

---
## ASCII Flowchart for the Search Strategy Builder

+-----------------------------------------------------+
|               Search Strategy Builder               |
+-----------------------------------------------------+
                        |
                        v
         +------------------------------+
         |      Step 1: User Input      |
         +------------------------------+
         | - Population                |
         | - Interest                  |
         | - Context                   |
         | - Websites (optional)       |
         | - Filetype filter (PDF/DOC) |
         | - Max results per API       |
         | - Clinical Guidelines? [Y/N]|
         | - Select SERP APIs          |
         +------------------------------+
                        |
                        v
         +------------------------------+
         | Step 2: Keyword Expansion    |
         +------------------------------+
         | Load local MeSH file         |
         | -> Lookup terms & synonyms   |
         | -> Add clinical terms (if Y) |
         | User edits/approves keywords |
         +------------------------------+
                        |
                        v
         +------------------------------+
         | Step 3: Search String Build  |
         +------------------------------+
         | - Join concepts with AND     |
         | - Add site: filters          |
         | - Add filetype filters       |
         | - Create 1 query per site    |
         +------------------------------+
                        |
                        v
         +------------------------------+
         |  Step 4: User Review         |
         +------------------------------+
         | - Approve or edit strings    |
         | - Add custom queries         |
         +------------------------------+
                        |
                        v
         +------------------------------+
         |   → Output to SERP Runner    |
         +------------------------------+
