# Testing Documentation

This directory contains the test suite for the Grey Literature Search application.

## Structure

- `api/` - Tests for tRPC API endpoints
- `utils/` - Helper utilities for testing
- `setup.ts` - Common setup for tests

## Running Tests

You can run the tests using the following npm commands:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run API tests only
npm test -- -t "API"
```

## API Tests

The API tests verify the functionality of our tRPC endpoints. These tests:

1. Mock the Prisma database client
2. Mock the authentication context
3. Test both success and failure cases for each endpoint
4. Ensure proper error handling

### Test Files

- `user.test.ts` - Authentication and user profile tests
- `search.test.ts` - Search strategy and saved searches tests
- `results.test.ts` - Search results and deduplication tests
- `review.test.ts` - Review tagging and annotation tests

## Writing New Tests

When writing new tests, follow these guidelines:

1. Create a clear test description that indicates what is being tested
2. Mock all external dependencies
3. Test both successful operations and error conditions
4. Verify response data structure and content
5. Follow the existing patterns for consistency

Example:

```typescript
test('should return user profile when authenticated', async () => {
  // Mock data
  const mockUser = { id: 'user123', email: 'test@example.com' };
  
  // Setup mocks
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
  
  // Create caller
  const ctx = createInnerTRPCContext({
    headers: new Headers(),
    cookies: {} as any,
  });
  
  const caller = appRouter.createCaller(ctx);
  
  // Execute the query
  const result = await caller.user.getCurrent();
  
  // Verify the result
  expect(result).toEqual(mockUser);
  expect(prisma.user.findUnique).toHaveBeenCalledWith({
    where: { id: 'user123' },
  });
});
```

## API Documentation

The API documentation is generated from the `src/server/api-docs.ts` file and follows OpenAPI standards. It includes:

1. Endpoint descriptions
2. Request/response schemas
3. Authentication requirements
4. Error responses

The documentation is accessible at `/documentation` when the application is running. 