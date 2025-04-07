# 🔎 Review Results Workflow  
*Core module #4 in the Grey Literature Search App pipeline*

---

## 🔹 Purpose

The **Review Results** module allows researchers to efficiently screen, tag, annotate, and track search results retrieved via SERP Execution and managed by the Results Manager.

It supports:
- Systematic inclusion/exclusion decisions
- Transparent reasoning
- Review resumption
- PRISMA-compatible logging

---

## 🧭 Workflow Overview

```plaintext
                +------------------------+
                |   Results Manager DB   |
                +------------------------+
                           |
                           v
                +-------------------------+
                |    Review Results UI    |
                +-------------------------+
                           |
         +----------------+-----------------+
         |                |                 |
         v                v                 v
   Tagging (Include)   Tagging (Exclude)  Tagging (Maybe)
                           |
                     +-----+------+
                     | Exclusion  |
                     |  Reason(s) |
                     +------------+
                           |
                           v
          +------------------------------+
          | Notes, Filters, Progress, PRISMA |
          +------------------------------+
```

---

## 🔹 Key Features

### 1. 📃 Result List Display

- Results are shown in a **paginated table view**
- **50 results per page**
- Each result shows:
  - ✅ Clickable **Title** (opens URL in new tab)
  - 📄 **Snippet/Description**
  - 🔗 **Source (API/search engine)**
  - 🏷️ **Metadata** (rank, site, filetype, etc.)

---

### 2. 🏷️ Include / Exclude / Maybe Tagging

Each result can be tagged with:
- ✅ **Include** → Relevant to the research question
- ❌ **Exclude** → Not relevant or unsuitable
- ❓ **Maybe** → Requires further review

**Controls:**
- Radio buttons or tag-style selectors
- Auto-saves decisions to the database

---

### 3. 🚫 Exclusion Reasons

If a user selects **Exclude**, they are prompted to:
- Choose a reason from a preset list:
  - "Not relevant to research question"
  - "Wrong publication type"
  - "Duplicate"
  - "Insufficient information"
- Optionally add a **custom exclusion reason**

---

### 4. 📝 Researcher Notes

- Users can attach **notes** to any result
- Notes are editable, saved automatically
- Use cases:
  - Highlight important sections
  - Explain why a “Maybe” wasn’t an “Include”
  - Mark follow-ups

---

### 5. 🔍 Filtering and Sorting

Users can:
- Filter by:
  - Tag status (Include, Exclude, Maybe, Untagged)
  - Keyword match in title/snippet
  - Source API
- Sort by:
  - Rank
  - Title A-Z
  - Tag status
  - Custom fields (e.g., “recently tagged”)

---

### 6. 📈 Progress Tracking

Real-time display of review status:
- `15 of 30 results processed (50%)`
- Optionally shows breakdown:
  - ✅ 10 Included
  - ❌ 3 Excluded
  - ❓ 2 Maybe

---

### 7. 💾 State Persistence

- All actions are **auto-saved**
- Review session can be paused and resumed
- All tags, reasons, and notes are stored in the database with timestamps

---

### 8. 🧾 PRISMA Compliance Logging

- All reviewed results are tracked
- **Click tracking**: when a user clicks a result link to review it, this interaction is stored
- Metadata is exported for PRISMA diagram generation

---

## 🗃️ Suggested Database Schema

### `review_tags` Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique review ID |
| result_id | UUID | FK to search result |
| tag | TEXT | `include`, `exclude`, `maybe` |
| exclusion_reason | TEXT | Preset or custom |
| notes | TEXT | Researcher comment |
| retrieved | BOOLEAN | Link clicked for full review |
| reviewer_id | UUID | User reviewing |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-updated |

---

## 🧠 UI Design Considerations

- Inline tagging should be lightweight and intuitive
- Notes area collapsible/expandable
- Progress tracker fixed in UI or floating sidebar
- Tagging must be **undoable** (e.g., switch from “Exclude” to “Include” easily)