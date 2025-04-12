Absolutely — here’s a clear, structured, and comprehensive **Product Requirements Document (PRD)** for the **Grey Literature Search App**. It includes product vision, core features, workflows, data models, and technical considerations — ideal for aligning your development team.

---

# 📘 Product Requirements Document (PRD)

**Product Name:** *Grey Literature Search App*\
**Version:** 1.0\
**Date:** 2025-03-27\
**Owner:** [Product Manager or Owner's Name]\
**Audience:** Engineering, UX, QA, Research, Project Stakeholders

---

## 🔹 1. Product Overview

### **Purpose**

The *Grey Literature Search App* enables researchers to systematically search, screen, and extract insights from non-traditional sources (e.g., government reports, clinical guidelines, white papers) using structured strategies, automation, and transparency.

### **Goals**

- Improve discoverability of grey literature relevant to public health, clinical guidelines, and policy
- Enable reproducible, PRISMA-aligned screening workflows
- Support multi-user, multi-query search and review processes
- Generate high-quality exportable reports in Markdown, HTML, and CSV

---

## 🔹 2. Target Users

- Public health researchers
- Medical librarians
- Systematic reviewers
- Academic clinicians
- Policy analysts

---

## 🔹 3. Key Features

### 🔍 **Search Strategy Builder**

- Define structured concepts (Population, Interest, Context)
- Allow users to add multiple keywords for each concept
- Select target websites and SERP APIs
- Add filetype filters (PDF, DOCX)
- Include "clinical guideline" terms toggle
- Save and reuse search strategies

### 🧠 **SERP Execution**

- Executes all queries using selected APIs (Serper, SerpAPI, etc.)
- Retrieves maximum results with pagination
- Parses, normalizes, and enriches results
- Stores raw + structured data per result

### 🧽 **Results Manager**

- Deduplicates by normalized URL and fuzzy title
- Flags final results with `deduped = true`
- Logs duplicates (optional)
- Tracks source API, query, and filters for analysis

### 🏷️ **Review Workflow**

- User interface for tagging results: `Include`, `Exclude`, `Maybe`
- Exclusion reasons + researcher notes
- Progress tracker
- Filters and sort options
- Auto-save state, resume anytime

### 📤 **Reporting & Export**

- PRISMA 2020 metrics auto-generated
- Export report in:
  - Markdown (editable)
  - HTML (web-ready)
  - CSV (spreadsheet analysis)
- Includes:
  - Search configs, filters, query history
  - Total number of results returned, number of duplicates, number after duplicates removed, number of records retrienved (clicked), total number of records screened
  - Included/excluded/maybe results
  - Clicked URLs, user notes, exclusion reasons

### 🔐 **User Accounts**

- Register/login with email + password
- User-owned searches and results
- Personal history of searches and reviews

---

## 🔹 4. Functional Requirements

| Workflow        | Core Functionality                                                 |
| --------------- | ------------------------------------------------------------------ |
| Search Builder  | Concept tagging, keyword generation, filter options, saved queries |
| SERP Execution  | Query routing, pagination, result parsing, storage                 |
| Results Manager | Deduplication, PRISMA logging, normalized URLs                     |
| Review UI       | Tagging, notes, retrieval tracking, filters                        |
| Reporting       | Metrics calculation, export formatting                             |
| User System     | Registration, login, session persistence, per-user data filtering  |

---

## 🔹 5. Non-Functional Requirements

- ✅ Multi-user support with user isolation
- ✅ Auto-save actions and progress
- ✅ Scalable and performant API execution (supports pagination)
- ✅ Accessible, intuitive UI
- ✅ Secure data handling (auth, storage)

---

## 🔹 6. Data Model Summary

| Table             | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `users`           | Stores account credentials and metadata            |
| `search_requests` | Stores all structured queries created by users     |
| `search_results`  | Stores all unique, deduplicated search results     |
| `review_tags`     | Stores all review decisions (per user, per result) |
| `duplicate_log`   | (Optional) Tracks duplicates removed for audit     |
| `export_logs`     | (Future) Stores export history per user            |

---

## 🔹 7. Dependencies & Integrations

- ✅ Serper API (Google, Bing, DuckDuckGo)
- ✅ SerpAPI (Google + other engines)
- ✅ Optional: PDF/Word file detection via URL pattern or file header

---

## 🔹 8. Success Criteria

| Metric                  | Goal                                  |
| ----------------------- | ------------------------------------- |
| Search query execution  | 100% API queries complete per session |
| Deduplication accuracy  | >95% duplicates removed correctly     |
| Export success rate     | 100% reports generated without error  |
| User satisfaction       | ≥4.5 / 5 via internal pilot feedback  |

---

## 🔹 9. Future Features (Post-MVP)

- Team/collaborative reviews with one lead reviewer who designs and runs the searches
- Relevance ranking of results
- PRISMA flowchart visualisation
- Feedback loop at search strategy builder workflow using meta data to improve synonym generation
- Admin dashboard for API usage & audit