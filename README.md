# xAIM Thesis - Grey Literature Search Application

> 🚧 **Work in Progress**: This project is currently under active development as part of a thesis project. Documentation will be updated as features are completed.

## Project Overview

A specialized search application designed to streamline the process of finding and managing grey literature for systematic reviews in medical research. The application integrates advanced search capabilities with systematic review workflows, making it easier to discover, organize, and analyze non-traditional research materials.

### Key Features (In Development)

- 🔍 **Advanced Search Strategy Builder**
  - MeSH term integration
  - Structured concept input (Population, Interest, Context)
  - Clinical guideline term support
  - Search strategy saving and reuse

- 🌐 **Multi-Source Search Execution**
  - Integrated search API support
  - Result normalization
  - Automated deduplication
  - Progress tracking

- 📊 **Review Management**
  - Collaborative review interface
  - Tag-based classification
  - Note-taking capabilities
  - Progress tracking

- 📑 **PRISMA-Aligned Reporting**
  - Automated metrics generation
  - Multiple export formats
  - Search strategy documentation
  - Result statistics

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: 
  - Supabase for authentication and PostgreSQL database
  - Prisma ORM for type-safe database access
  - tRPC for end-to-end typesafe API
- **Services**: Resend for email notifications

## Current Status

- ✅ Project Setup & Environment Configuration
- ✅ Design System & UI Component Library
- ✅ Authentication & User Management
- 🔄 Database Schema & API Layer (In Progress)
- 📅 Search Strategy Builder (Planned)
- 📅 SERP Execution & Results Management (Planned)
- 📅 Review Interface (Planned)
- 📅 Reporting System (Planned)

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/barrie-cork/xAIM_thesis_greyLit.git
   cd xAIM_thesis_greyLit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

4. **Database Setup**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Contributing

This project is part of a thesis work and is currently not open for external contributions. Documentation and contribution guidelines will be updated upon project completion.

## License

This project is currently under development. License terms will be specified upon completion.

---

© 2024 xAIM Thesis Project. All rights reserved.