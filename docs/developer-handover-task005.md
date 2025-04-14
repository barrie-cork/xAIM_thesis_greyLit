# Developer Handover: Task 005 - Search Strategy Builder Implementation

This document provides detailed information about the current state of the Search Strategy Builder implementation (Task 005) and focuses specifically on the remaining subtask 5.5 (Search Strategy Management). Understanding the current functionality will help developers efficiently implement the remaining features.

## Current Application Functionality

### Search Strategy Builder Overview

The Search Strategy Builder is a core component of the Grey Literature Search App that allows users to create structured search strategies using the PIC (Population, Interest, Context) framework. The current implementation includes:

1. **Concept-based Structure**: Users can define search concepts (Population, Interest, Context) and add keywords to each concept.
2. **Query Generation**: The system generates Boolean search queries with proper logic (AND between concepts, OR within concepts).
3. **Search Options**: Users can select file types (PDF, DOC, PPT, HTML), trusted domains, and toggle clinical guideline terms.
4. **Preview Functionality**: Users can preview generated search queries before execution.
5. **Direct Search Execution**: Users can execute searches against selected search engines.

### Current Implementation Details

#### 1. Component Structure

The Search Builder is implemented with the following key components:

- `SearchBuilder.tsx`: Main container component that orchestrates the entire search building process
- `ConceptGroup.tsx`: Manages a group of related keywords for a specific concept (Population, Interest, Context)
- `KeywordInput.tsx`: Allows users to add, edit, and remove keywords within a concept
- `SearchPreview.tsx`: Displays the generated search queries with proper formatting
- `TrustedDomains.tsx`: Manages the list of trusted domains to search

#### 2. Data Flow

The current data flow in the Search Builder is:

1. User adds concepts and keywords through the UI
2. Data is stored in local state (React useState/useReducer)
3. Search queries are generated in real-time as users modify concepts and keywords
4. Queries are displayed in the preview section
5. When executed, queries are sent to the search execution module

#### 3. State Management

The Search Builder currently uses:

- React state hooks for UI state
- Local storage for persisting search configuration between sessions
- No database integration yet for saving searches permanently

## Remaining Task: 5.5 Search Strategy Management

Subtask 5.5 focuses on implementing search strategy saving functionality and related features. Here's what needs to be implemented:

### Required Features

1. **Search Strategy Saving**: Allow users to save their search strategies to the database
2. **Search History Tracking**: Create a system to track search history in Supabase
3. **Saved Searches UI**: Build a user interface for managing saved searches
4. **Search Loading and Editing**: Implement functionality to load and edit saved searches
5. **Export Functionality**: Add the ability to export search strategies

### Integration Points with Existing Code

To implement these features efficiently, you need to understand how they integrate with the existing codebase:

#### 1. Database Integration

The application uses Supabase PostgreSQL with Prisma ORM. The relevant database models for search strategy management are:

```typescript
// Simplified schema representation
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  searches  Search[]
}

model Search {
  id          String    @id @default(uuid())
  userId      String
  title       String
  description String?
  concepts    Concept[]
  options     Json      // Stores search options (file types, domains, etc.)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id])
}

model Concept {
  id        String    @id @default(uuid())
  searchId  String
  name      String    // "Population", "Interest", "Context"
  position  Int       // Order in the search
  keywords  Keyword[]
  search    Search    @relation(fields: [searchId], references: [id], onDelete: Cascade)
}

model Keyword {
  id        String  @id @default(uuid())
  conceptId String
  text      String
  concept   Concept @relation(fields: [conceptId], references: [id], onDelete: Cascade)
}
```

#### 2. API Integration

The application uses tRPC for type-safe API routes. You'll need to implement or extend the following API procedures:

```typescript
// Simplified representation of required API procedures
router.search = {
  // Save a search strategy
  save: protectedProcedure
    .input(searchSchemaValidation)
    .mutation(async ({ ctx, input }) => {
      // Implementation needed
    }),
  
  // Get all searches for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      // Implementation needed
    }),
  
  // Get a specific search by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation needed
    }),
  
  // Update an existing search
  update: protectedProcedure
    .input(searchUpdateSchemaValidation)
    .mutation(async ({ ctx, input }) => {
      // Implementation needed
    }),
  
  // Delete a search
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation needed
    }),
  
  // Export a search strategy
  export: protectedProcedure
    .input(z.object({ id: z.string(), format: z.enum(['json', 'csv', 'markdown']) }))
    .query(async ({ ctx, input }) => {
      // Implementation needed
    })
};
```

#### 3. UI Components Needed

To complete this task, you'll need to create or extend the following UI components:

1. **SaveSearchModal**: A modal dialog for saving a search strategy with title and description
2. **SearchHistoryList**: A component to display the user's saved searches
3. **SearchHistoryItem**: A component representing a single saved search with options to load, edit, or delete
4. **ExportOptionsModal**: A modal for selecting export format and options
5. **SearchBuilderToolbar**: A toolbar with save, load, and export buttons

### Current State Management Considerations

The current Search Builder uses local state and localStorage for persistence. When implementing database integration:

1. **State Synchronization**: Ensure that the UI state is properly synchronized with the database state
2. **Loading Mechanism**: Implement a mechanism to load saved searches from the database into the UI state
3. **Optimistic Updates**: Consider using optimistic updates for a better user experience
4. **Error Handling**: Implement proper error handling for database operations

### Authentication Integration

The search saving functionality must integrate with the existing authentication system:

1. **User Association**: All saved searches must be associated with the current user
2. **Permission Checks**: Ensure users can only access their own searches
3. **Session Handling**: Verify that the user session is valid before performing database operations

## Implementation Recommendations

Based on the current application state, here are recommendations for implementing the remaining features:

1. **Start with API Layer**: Begin by implementing the tRPC procedures for saving, loading, and managing searches
2. **Create Database Models**: Ensure the database models are properly set up for storing search strategies
3. **Implement UI Components**: Create the necessary UI components for the user to interact with saved searches
4. **Connect UI to API**: Connect the UI components to the API layer using tRPC hooks
5. **Add Export Functionality**: Implement the export functionality with multiple format options
6. **Test Thoroughly**: Test all features with different search configurations and user scenarios

## Potential Challenges and Solutions

### 1. Complex State Management

**Challenge**: The search builder has complex state with nested concepts and keywords.

**Solution**: Use a normalized state structure and consider using a state management library like Zustand or Redux for more complex state management needs.

### 2. Data Synchronization

**Challenge**: Keeping the UI state in sync with the database state.

**Solution**: Implement a clear data flow with loading and saving functions that transform between UI state and database models.

### 3. Performance with Large Searches

**Challenge**: Performance issues when dealing with large search strategies.

**Solution**: Implement pagination or virtualization for displaying large lists of saved searches, and optimize database queries.

### 4. Export Format Complexity

**Challenge**: Generating different export formats (JSON, CSV, Markdown) with proper formatting.

**Solution**: Create separate formatter classes for each export format, following the strategy pattern.

## Conclusion

Completing Task 5.5 (Search Strategy Management) will significantly enhance the functionality of the Grey Literature Search App by allowing users to save, manage, and export their search strategies. Understanding the current implementation and integration points will help you implement these features efficiently and effectively.

The existing codebase provides a solid foundation with a well-structured Search Builder component, and the remaining task is to connect it to the database and implement the user interface for managing saved searches.

For any questions or clarifications, please refer to the main developer handover document or contact the original development team.
