# Current Issues and Pending Tasks

This document tracks the current issues, bugs, and pending tasks for the Grey Literature Search App. It serves as a centralized reference for developers to understand what needs to be addressed.

## Critical Issues

### Authentication

1. **Logout Functionality**
   - **Issue**: Logout button sometimes requires multiple clicks to work properly
   - **Root Cause**: Race condition in the logout process
   - **Fix**: Ensure proper sequence of operations during logout (clear local storage, sign out from Supabase, then redirect)

2. **Session Persistence**
   - **Issue**: Users occasionally need to log in again despite having a valid session
   - **Root Cause**: Session refresh mechanism not working consistently
   - **Fix**: Implement more robust session refresh logic

### Search Functionality

1. **tRPC API Usage** (RESOLVED)
   - **Issue**: Incorrect usage of tRPC hooks causing runtime errors
   - **Root Cause**: Using tRPC mutations directly instead of through hooks
   - **Fix**: Ensure all tRPC mutations are used with the `useMutation` hook
   - **Status**: Implemented comprehensive solution including:
     - Created documentation and best practices guide
     - Implemented example components and utility hooks
     - Added ESLint rule to prevent direct usage of trpcClient
     - Created tests to verify proper tRPC usage

2. **Search Results Loading**
   - **Issue**: "Loading search results..." message appears indefinitely
   - **Root Cause**: Error in the search results fetching process
   - **Fix**: Implement proper error handling and fallback UI

3. **Batch Search Serialization Error**
   - **Issue**: Error "Unable to transform response from server" when executing batch searches
   - **Root Cause**: Serialization issue with tRPC response, possibly related to complex data structures or response size
   - **Current Status**: Partially mitigated by creating a separate batch search procedure with simplified response
   - **Workaround**: For single queries, the regular search function works correctly
   - **Fix**: Further investigation needed to identify the exact cause of the serialization issue

## High Priority Tasks

### Search Builder

1. **Complete Task 005**
   - **Description**: Implement the remaining Search Strategy Management features
   - **Subtasks**:
     - Save search strategies for future use
     - Implement history tracking for search strategies
     - Add management UI for saved strategies
   - **Reference**: See [Task 005 Documentation](./developer-handover-task005.md)

2. **Multi-Query Execution**
   - **Description**: Implement the ability to execute multiple search queries in parallel
   - **Subtasks**:
     - Update the search execution API to handle multiple queries
     - Implement UI for tracking multiple query execution
     - Add result aggregation functionality

### User Experience

1. **Responsive Design Improvements**
   - **Description**: Improve the responsive design for mobile and tablet devices
   - **Subtasks**:
     - Fix layout issues on small screens
     - Implement mobile-friendly navigation
     - Optimize input controls for touch devices

2. **Loading States**
   - **Description**: Implement consistent loading states across the application
   - **Subtasks**:
     - Add skeleton loaders for content
     - Implement loading indicators for actions
     - Add progress tracking for long-running operations

## Medium Priority Tasks

### Performance Optimization

1. **Server-Side Analytics**
   - **Description**: Implement server-side analytics to track performance and usage
   - **Subtasks**:
     - Set up analytics infrastructure
     - Implement tracking for key user actions
     - Create dashboard for monitoring

2. **Code Splitting**
   - **Description**: Implement code splitting to reduce initial load time
   - **Subtasks**:
     - Identify large components for splitting
     - Implement dynamic imports
     - Measure and optimize bundle size

### Testing

1. **Expand Test Coverage**
   - **Description**: Increase test coverage for critical components
   - **Subtasks**:
     - Add tests for authentication flow
     - Add tests for search execution
     - Add tests for result processing

2. **End-to-End Testing**
   - **Description**: Implement end-to-end tests for critical user flows
   - **Subtasks**:
     - Set up Cypress or Playwright
     - Create tests for registration and login
     - Create tests for search execution and results viewing

## Low Priority Tasks

### Documentation

1. **API Documentation**
   - **Description**: Create comprehensive API documentation
   - **Subtasks**:
     - Document all tRPC procedures
     - Document REST API endpoints
     - Add examples and usage guidelines

2. **User Guide**
   - **Description**: Create a user guide for the application
   - **Subtasks**:
     - Document the search builder workflow
     - Document the results management workflow
     - Add troubleshooting section

### Refactoring

1. **Component Standardization**
   - **Description**: Standardize component patterns across the application
   - **Subtasks**:
     - Create component templates
     - Refactor existing components to follow standards
     - Document component patterns

2. **State Management Refactoring**
   - **Description**: Refactor state management for consistency
   - **Subtasks**:
     - Standardize on React Context or other state management
     - Refactor components to use the standard approach
     - Document state management patterns

## Technical Debt

1. **Dependency Updates**
   - **Description**: Update dependencies to latest versions
   - **Subtasks**:
     - Audit dependencies for security issues
     - Update non-breaking dependencies
     - Plan migration for breaking changes

2. **Code Cleanup**
   - **Description**: Remove unused code and improve code quality
   - **Subtasks**:
     - Remove dead code
     - Fix linting issues
     - Improve code comments and documentation

3. **Migration Cleanup**
   - **Description**: Clean up artifacts from the App Router migration
   - **Subtasks**:
     - Remove any remaining Pages Router code
     - Consolidate duplicate implementations
     - Update imports and references

## Known Bugs

1. **ChunkLoadError**
   - **Description**: Occasional ChunkLoadError in the browser console
   - **Reproduction**: Appears randomly, especially after deployment
   - **Workaround**: Refresh the page
   - **Fix**: Investigate webpack configuration and chunk loading

2. **Mock Data in Saved Searches**
   - **Description**: Saved searches sometimes show mock data instead of real data
   - **Reproduction**: Visit the saved searches page
   - **Workaround**: Refresh the page
   - **Fix**: Remove all mock data implementations and ensure only real data is displayed

3. **Route Conflicts**
   - **Description**: Occasional conflicts between old and new routes
   - **Reproduction**: Navigate between pages quickly
   - **Workaround**: Use the navigation menu instead of direct URLs
   - **Fix**: Remove any remaining duplicate routes and ensure consistent routing

4. **Batch Search Serialization Error**
   - **Description**: Error "Unable to transform response from server" when executing batch searches
   - **Reproduction**: Click "Execute All Searches" when multiple search queries are generated
   - **Workaround**: Use the regular search function for single queries
   - **Fix**: Further investigation needed to identify the exact cause of the serialization issue

## Environment-Specific Issues

### Development Environment

1. **Hot Reload Inconsistency**
   - **Description**: Hot reload sometimes fails to update the UI
   - **Workaround**: Manually refresh the page
   - **Fix**: Investigate Next.js development server configuration

2. **Environment Variable Handling**
   - **Description**: Environment variables sometimes not loaded correctly
   - **Workaround**: Restart the development server
   - **Fix**: Improve environment variable loading and validation

### Production Environment

1. **Caching Issues**
   - **Description**: Stale data sometimes displayed due to caching
   - **Workaround**: Force refresh the page
   - **Fix**: Implement proper cache invalidation strategies

2. **Error Reporting**
   - **Description**: Error reporting not capturing all client-side errors
   - **Workaround**: Monitor server logs
   - **Fix**: Implement comprehensive error boundary and reporting system

## Next Steps

1. **Prioritize Critical Issues**
   - Address authentication and search functionality issues first
   - Create hotfixes for production if necessary

2. **Plan for High Priority Tasks**
   - Complete Task 005 (Search Strategy Management)
   - Improve user experience with responsive design and loading states

3. **Schedule Technical Debt Reduction**
   - Allocate time for dependency updates and code cleanup
   - Implement automated tools for ongoing maintenance

4. **Expand Testing**
   - Increase test coverage for critical components
   - Implement end-to-end tests for key user flows

## Tracking Progress

Progress on these issues and tasks should be tracked in:

1. **GitHub Issues**: Create and update issues for each item
2. **TASKS_STATUS.md**: Update the tasks status document
3. **CHANGELOG.md**: Document completed fixes and features

Regular reviews should be conducted to:

1. Reprioritize issues based on user feedback
2. Add new issues as they are discovered
3. Close resolved issues and update documentation
