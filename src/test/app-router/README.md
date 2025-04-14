# App Router Tests

This directory contains tests for the App Router components and functionality. These tests ensure that the migration from Pages Router to App Router is successful and that all components work correctly.

## Test Structure

The tests are organized by functionality:

- **auth.test.tsx**: Tests for the authentication flow, including `getSession` and `requireAuth` functions.
- **auth-context.test.tsx**: Tests for the AuthContext provider and useAuth hook.
- **home.test.tsx**: Tests for the home page, including conditional rendering based on authentication state.
- **search-builder.test.tsx**: Tests for the search builder page.
- **search-results.test.tsx**: Tests for the search results page.
- **saved-searches.test.tsx**: Tests for the saved searches page.
- **api-routes.test.ts**: Tests for the API route handlers.
- **client-components.test.tsx**: Tests for the client components used in the App Router pages.
- **middleware.test.ts**: Tests for the middleware that handles authentication and protected routes.

## Running Tests

To run the tests, use the following command:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- src/test/app-router/auth.test.tsx
```

## Test Coverage

These tests cover:

1. **Authentication Flow**:
   - Session management
   - Protected routes
   - Authentication context

2. **Page Rendering**:
   - Conditional rendering based on authentication state
   - Component composition
   - Props passing

3. **API Routes**:
   - Request handling
   - Response formatting
   - Error handling
   - Authentication checks

4. **Client Components**:
   - UI rendering
   - User interactions
   - State management

5. **Middleware**:
   - Route protection
   - Authentication checks
   - Redirects

## Mocking Strategy

The tests use Vitest's mocking capabilities to mock:

- Supabase authentication
- Next.js navigation
- tRPC API calls
- Server-side utilities

This allows for isolated testing of components without requiring actual API calls or authentication.

## Best Practices

When adding new tests or modifying existing ones:

1. Ensure that each test focuses on a single aspect of functionality
2. Use descriptive test names that explain what is being tested
3. Mock external dependencies to isolate the component being tested
4. Test both success and error cases
5. Test edge cases and boundary conditions
6. Keep tests independent of each other
