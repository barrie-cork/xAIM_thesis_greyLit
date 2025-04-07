# 📤 Reporting & Data Export Workflow  
*A module of the Grey Literature Search App pipeline*

---

## 🔹 Purpose

This workflow enables researchers to:
- Generate PRISMA 2020-compliant reports
- Export search data for publication, audit, or sharing
- Track review outcomes in a transparent and structured way

---

## 📊 PRISMA Flow Diagram Data

The system automatically calculates and stores all key metrics required for PRISMA reporting:

| Metric | Description |
|--------|-------------|
| **Total Records Identified** | Total from all SERP queries before deduplication |
| **Duplicates Removed** | Count of records removed during deduplication |
| **Records Screened** | All unique results viewed in the review UI |
| **Records Retrieved** | Clicked/opened links (tracked for PRISMA) |
| **Records Excluded** | Tagged as `Exclude`, with reasons |
| **Records Included** | Tagged as `Include` |
| **Maybe** | Results tagged for further consideration |

These metrics are used to populate PRISMA flowcharts and form the basis of final documentation.

---

## 📋 Report Generation

Users can generate structured reports of their full literature search workflow.

### 📁 Supported Formats
| Format | Purpose |
|--------|---------|
| **Markdown (`.md`)** | Easy to edit or convert to PDF |
| **HTML** | Web-ready, can be embedded in internal or public sites |
| **CSV** | For spreadsheet use or importing into other tools (e.g., Zotero, Rayyan, Excel) |

---

## 📑 Report Content Overview

### 1. 🧠 **Search Details**
- Filters selected (e.g., filetype, clinical guideline toggle)
- SERP APIs used
- List of websites/domains searched
- Search queries run (with result counts)
- Date/time of search execution

### 2. 📈 **PRISMA 2020 Metrics**
- Auto-generated table of:
  - Total results
  - Deduplication stats
  - Inclusion/exclusion breakdown
  - "Maybe" count
  - Click-through count
- Optional: exportable PRISMA flow diagram (e.g., SVG or PNG if implemented)

### 3. ✅ **Included Results**
- Title  
- Domain  
- URL  
- Date retrieved  
- Optionally export raw metadata

### 4. ❌ **Excluded Results**
- Title  
- Domain  
- URL  
- **Reason for exclusion**

### 5. ❓ **Maybe Results**
- Title  
- Domain  
- URL  
- **User notes**

---

## ⚙️ Export Workflow

### UI Flow:
1. User completes or pauses review
2. Clicks **“Export Report”**
3. Chooses file format (`Markdown`, `HTML`, or `CSV`)
4. System generates and downloads/export file

📂 Optional: save a version server-side for download history or shared access

---

## 📁 Suggested Folder/File Naming

```plaintext
/exported_reports/
├── search_summary_2025-03-27.md
├── search_summary_2025-03-27.html
├── prisma_data_2025-03-27.csv
```

---

## 🗃️ Technical Notes

### Required Data Sources:
- `search_requests` table (searches run)
- `search_results` table (deduplicated results)
- `review_tags` table (inclusion/exclusion/maybe + notes/reasons)

### Report Generator Responsibilities:
- Collate and aggregate PRISMA stats
- Format lists for export
- Serialize all data to markdown/HTML/CSV templates
- Track export history (optional)

---

## ✅ Benefits

| Feature | Value |
|--------|-------|
| Markdown output | Clean, editable, version-controlled |
| CSV output | Interoperable with reference managers & spreadsheets |
| HTML output | For research team websites or online logs |
| Full PRISMA integration | Supports academic transparency & reproducibility |
| Manual note export | Useful for future review/audit/follow-up |
