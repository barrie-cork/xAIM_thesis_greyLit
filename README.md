# Grey Literature Search App

The *Grey Literature Search App* enables researchers to systematically search, screen, and extract insights from non-traditional sources (e.g., government reports, clinical guidelines, white papers) using structured strategies, automation, and transparency.

## Features


- **Search Strategy Builder**: Create and save sophisticated search strategies using the PIC framework (Population, Interest, Context)
- **Flexible Search Options**: Target specific file types, trusted domains, and include specialized terminology

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/grey-literature-search-app.git
   cd grey-literature-search-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env.local
   ```
   
4. Download and process MeSH data
   ```
   npm run mesh:download
   ```

5. Start the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Search Strategy Builder

1. Navigate to the Search Strategy Builder page
2. Define your research concepts using the PIC framework:
   - **Population**: Who or what is affected?
   - **Interest**: What is being done or examined?
   - **Context**: In what setting or compared to what?
3. Set search options such as file types, trusted domains, and search engine
4. Preview your generated search query
5. Save or export your search strategy

## Technologies

- Next.js for the frontend and API routes
- tRPC for type-safe API endpoints
- Tailwind CSS for styling
- Prisma for database access

# The Five Most Important Questions for a Developer

## 1. What is the overall architecture and workflow of the application?

The **Grey Literature Search App** follows a **Clean Architecture** pattern using **Next.js**, organised into four distinct layers:

- **Presentation**: UI components and interfaces
- **Application**: Business logic and services
- **Domain**: Core entities and interfaces
- **Infrastructure**: External services and persistence

### Core Workflow Modules

1. **Search Strategy Builder** – Creates structured search queries  
2. **SERP Execution** – Executes searches across multiple providers  
3. **Results Manager** – Handles deduplication and normalization  
4. **Review Interface** – Allows tagging and annotation of results  
5. **Reporting & Export** – Generates PRISMA-compliant reports

---

## 2. How does the search functionality work and how can it be extended?

The app uses a **provider-based architecture** for search functionality:

### Key Components

- `SearchService`: Main entry point for search operations
- `SearchProviderFactory`: Instantiates search provider classes (e.g. `Serper`, `SerpAPI`)
- Each provider implements the `SearchProvider` interface
- Results are normalized to a common schema
- Deduplication is handled by a dedicated service

### Extending Search Functionality

To add a new search provider:

1. Create a new class implementing the `SearchProvider` interface  
2. Add the provider to the `SearchProviderType` enum  
3. Update the `SearchProviderFactory` to support the new class  

---

## 3. How is data stored and what are the key data models?

The app uses **PostgreSQL** via **Prisma ORM**, with the following core models:

- `User`: Handles authentication and user identity
- `SearchRequest`: Stores structured queries and configuration
- `SearchResult`: Contains normalized results from providers
- `ReviewTag`: Records user decisions (`Include`, `Exclude`, `Maybe`)
- `DuplicateLog`: Tracks removed duplicates for PRISMA reporting

The schema supports the full lifecycle from search through review to reporting.

---

## 4. How does the review and tagging system work?

The review interface enables users to:

- Tag results as **Include**, **Exclude**, or **Maybe**
- Add **exclusion reasons** when excluding results
- Attach **notes** to results
- Track when a result is **clicked** (retrieved)
- Filter and sort results
- **Auto-save** all user actions

This system is designed to be **PRISMA-compliant**, capturing all key metrics for systematic reviews.

---

## 5. How can I test and extend the application?

### Testing Tools

- **Unit tests** using Jest
- **tRPC** for type-safe APIs
- **OpenAPI** for auto-generated API documentation
- Project-level documentation in `/project_docs`

### Extension Guidelines

To extend the app:

1. Follow the **Clean Architecture** principles
2. Use existing **provider interfaces** for integrations
3. Ensure **PRISMA compliance** for all new features
4. Write unit tests for new functionality
5. Update project documentation accordingly


## License

This project is licensed under the MIT License - see the LICENSE file for details.