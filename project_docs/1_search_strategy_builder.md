# 🧠 Search Strategy Builder  
*Core module #1 in the Grey Literature Search App pipeline*

---

## 🔹 Purpose

The **Search Strategy Builder** helps researchers generate comprehensive, high-precision search queries by structuring concepts and keywords, organizing them into logical groupings, and preparing them for automated searching across trusted websites and SERP APIs.

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
- **Powerpoint**: `filetype:ppt OR filetype:pptx`
- **HTML**: `filetype:html`
- Combined using `OR` logic

#### 📘 Clinical Guidelines (Optional)
Users can toggle **"Include Clinical Guidelines"** to:
- Automatically add terms like:
  - `guideline*`, `recommendation*`, `consensus`, `guidance`
These will focus the search on guidelines only

---

### Step 2: Keyword Entry and Organization

- Allow the user to add their own terms for each concept
- Users can enter multiple keywords for each concept group
- Example:
  - `"Type 2 Diabetes"` → User adds: `"T2D"`, `"adult-onset diabetes"`

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
- ➕ Add custom terms to each concept
- ❌ Remove any terms not relevant
- 🔄 Reorganize terms between concepts if needed

---

### Step 3: Search String Generation

Each concept group becomes an **AND-joined block**, with terms within each concept joined by OR logic. Each trusted domain (if provided) gets its own search query with a `site:` clause. Optionally, `filetype:` filters are appended.

#### 🧪 Example Search String

```text
(adults OR "middle-aged" OR "grown-ups") AND
("type 2 diabetes" OR "T2D" OR "adult-onset diabetes") AND
("primary care" OR "general practice") AND
(guideline OR recommendation* OR consensus OR guidance) site:www.nice.org.uk filetype:pdf
```

Multiple search strings are generated — one per trusted domain, each with the specified filetype filters.

---

### Step 4: Search Strategy Preview & Execution

The user reviews the search strings in the Search Strategy Preview:
- ✅ View all generated queries for each trusted domain
- 🔍 See estimated result counts (when available)
- 📋 Copy individual queries for external use
- ▶️ Execute searches directly from the interface

The preview clearly organizes:
- Concept groups with their keywords
- File type selections
- Trusted domains
- Selected search engines with result limits

---

## 🔧 Architectural Considerations

### 🧠 User-Defined Keywords
- Simple keyword entry without external API dependency
- Stored in state and persisted in JSON format
- Grouped by concept for logical organization

### 🏷️ Concept Grouping
Each concept is a **keyword group**, joined with `AND` logic. Within groups, keywords are joined using `OR` logic.

### 📎 Filetype Filtering
Implemented via search modifiers like:
- `filetype:pdf`
- `filetype:doc OR filetype:docx`
- `filetype:ppt OR filetype:pptx`
- `filetype:html`
- These are appended to the end of each query string for compliant search APIs.

### 🌐 Trusted Domain Targeting
- Using `site:domain` ensures search results are scoped to trusted sources
- Each domain gets its own dedicated query for more targeted searching

---

## 🧩 Example User Flow

1. User inputs:
   - Population: `Adults`
   - Interest: `Type 2 Diabetes`
   - Context: `Primary Care`
   - Selects: NICE and WHO websites as trusted domains
   - Enables: Clinical Guidelines, Restrict to PDFs
   - Selects: Google via Serper, Bing via Serper
   - Max results: 50

2. App:
   - Organizes terms by concept
   - Adds clinical guideline terms if enabled
   - Builds full search strings for each trusted domain
   - Applies filetype filters
   - Displays search queries in preview panel

3. User reviews generated queries and can:
   - Execute searches directly
   - Copy queries for external use
   - Modify concept terms and see real-time updates

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
  }
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
         | - Trusted Domains           |
         | - Filetype filter           |
         | - Max results per API       |
         | - Clinical Guidelines? [Y/N]|
         | - Select SERP APIs          |
         +------------------------------+
                        |
                        v
         +------------------------------+
         | Step 2: Keyword Organization |
         +------------------------------+
         | - Add terms for each concept|
         | - Group by concept          |
         | - Remove irrelevant terms   |
         +------------------------------+
                        |
                        v
         +------------------------------+
         | Step 3: Search String Build  |
         +------------------------------+
         | - Join concepts with AND     |
         | - Join terms with OR         |
         | - Add site: filters          |
         | - Add filetype filters       |
         | - Create 1 query per domain  |
         +------------------------------+
                        |
                        v
         +------------------------------+
         |  Step 4: Preview & Execute   |
         +------------------------------+
         | - View generated queries     |
         | - Copy for external use      |
         | - Execute searches directly  |
         +------------------------------+
                        |
                        v
         +------------------------------+
         |   → Output to SERP Runner    |
         +------------------------------+
