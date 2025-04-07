# Database Architecture  
**Grey Literature Search database structure**

---

## 🧩 Purpose

This document defines the **database structure** that supports the full workflow of the Medical Search App, including:

- Search query generation
- SERP execution and results storage
- Deduplication
- Review tagging
- Reporting (PRISMA)
- 🔐 **User authentication**
- 💾 **User-specific search history & saved data**

---

## 🧱 Recommended Database: PostgreSQL via Supabase

Use a relational structure for:
- Referential integrity (foreign keys)
- Indexing for performance
- Easy querying and joins
- JSONB fields for flexible metadata

---

## 📂 Core Tables

---

### 👤 `users`

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Unique user ID |
| email | TEXT (unique) | User login credential |
| password_hash | TEXT | Hashed password |
| created_at | TIMESTAMP | Signup timestamp |
| last_login | TIMESTAMP | Last login timestamp |

🔐 Use secure hashing (e.g., bcrypt) for passwords.

---

### 🔍 `search_requests`

| Field | Type | Description |
|-------|------|-------------|
| query_id | UUID (PK) | Unique ID for each search string |
| user_id | UUID (FK) | Owner of the search |
| query | TEXT | Full search string |
| source | TEXT | Search engine/API used |
| filters | JSONB | `{ "filetype": "pdf", "guideline_terms": true }` |
| timestamp | TIMESTAMP | Search creation time |
| search_title | TEXT | (Optional) User-friendly label |
| is_saved | BOOLEAN | True if user saved this for reuse |

🧠 Enables saved search history and personal dashboards.

---

### 🌐 `search_results`

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Unique result ID |
| query_id | UUID (FK) | Link to originating search |
| title | TEXT | Result title |
| url | TEXT | Cleaned/normalized URL |
| snippet | TEXT | Preview text |
| rank | INTEGER | Position in SERP |
| result_type | TEXT | `"organic"`, `"ad"`, etc. |
| search_engine | TEXT | API used |
| device | TEXT | (optional) |
| location | TEXT | Region used in search |
| language | TEXT | Language code |
| total_results | INTEGER | From SERP |
| credits_used | INTEGER | API credit usage |
| search_id | TEXT | API-specific search ID |
| search_url | TEXT | Link to actual SERP |
| related_searches | JSONB | Suggestions |
| similar_questions | JSONB | Questions from snippets |
| timestamp | TIMESTAMP | Time retrieved |
| raw_response | JSONB | Full result block |
| deduped | BOOLEAN | `true` = kept after deduplication |

🔍 Can be filtered to only include `deduped = true` for review.

---

### ♻️ `duplicate_log` (optional)

| Field | Type | Description |
|-------|------|-------------|
| duplicate_id | UUID (PK) | Log entry ID |
| original_result_id | UUID (FK) | Result that was kept |
| duplicate_url | TEXT | Removed URL |
| search_engine | TEXT | API source of the duplicate |
| reason | TEXT | "URL match", "Title similarity" |
| timestamp | TIMESTAMP | Time deduplicated |

---

### ✅ `review_tags`

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Tag entry ID |
| result_id | UUID (FK) | Link to `search_results` |
| tag | TEXT | `"include"`, `"exclude"`, `"maybe"` |
| exclusion_reason | TEXT | Optional reason |
| notes | TEXT | Reviewer notes |
| retrieved | BOOLEAN | If link was clicked |
| reviewer_id | UUID (FK) | User performing review |
| created_at | TIMESTAMP | Timestamp of tagging |
| updated_at | TIMESTAMP | Timestamp of last edit |

🧾 Enables full PRISMA tracking and collaborative review.

---

## 🔐 User + Search Relationship

Each search string (`search_requests`) is owned by a user (`users.id`) and can:
- Be revisited, edited, or re-run
- Display only the user’s own saved searches
- Be used to scope results to a single user's context

This supports:
- Personal dashboards
- Multi-user environments
- Future team-based review

---

## 🔎 Cross-Workflow Linkages

| Table | Linked To | Via |
|-------|-----------|-----|
| `search_requests` | `users` | `user_id` |
| `search_results` | `search_requests` | `query_id` |
| `review_tags` | `search_results` | `result_id` |
| `review_tags` | `users` | `reviewer_id` |
| `duplicate_log` | `search_results` | `original_result_id` |

---

## 🧠 Developer Notes & Best Practices

- ✅ Use UUIDs everywhere for future scalability
- ✅ Normalize URLs early and store only the deduplicated results
- ✅ Index key fields (`user_id`, `query_id`, `search_engine`) for fast querying
- ✅ Use `deduped = true` filter for any downstream workflows (review, export)
- ✅ Ensure all search results carry `query_id` to allow source tracking
- ✅ Store `raw_response` in JSONB format — useful for debugging, export, and audit

---

## ✅ Next Steps

- [ ] Set up schema migration scripts
- [ ] Configure basic authentication endpoints (register/login)
- [ ] Build `/my-searches` view: shows only current user’s saved searches
- [ ] Enable "Save Search" checkbox or toggle in Search Strategy Builder UI

---

Let me know if you'd like:
- SQL schema / migration files
- Entity-Relationship Diagram (ERD)
- Auth mockups or login API spec!