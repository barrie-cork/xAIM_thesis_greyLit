# Grey Literature Search App

The *Grey Literature Search App* enables researchers to systematically search, screen, and extract insights from non-traditional sources (e.g., government reports, clinical guidelines, white papers) using structured strategies, automation, and transparency.

## Features

- **MeSH Integration**: Use Medical Subject Headings (MeSH) from the National Library of Medicine to build structured search strategies
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

## License

This project is licensed under the MIT License - see the LICENSE file for details.