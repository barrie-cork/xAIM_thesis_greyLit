# Prisma Client and Database Access Fixes

This document details the issues encountered with Prisma client initialization and model access, along with the solutions implemented to fix these problems.

## 1. Creating a Singleton Prisma Client

### The Issue

The application was experiencing an error: `Cannot read properties of undefined (reading 'create')` when trying to save search results. This occurred because:

1. **Multiple Prisma Client Instances**: The StorageService was creating a new Prisma client instance each time it was instantiated, which can lead to connection pool exhaustion and inconsistent behavior.

2. **Connection Management Problems**: Having multiple Prisma clients can cause issues with database connections, especially in a Next.js application where server-side rendering and API routes might create multiple instances.

3. **Hot Reloading Issues**: During development, hot reloading could create additional instances, further exacerbating the problem.

### The Solution

We implemented a singleton pattern for the Prisma client by creating a new file `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

This implementation:

1. **Creates a Single Instance**: Ensures only one Prisma client instance exists throughout the application
2. **Handles Development Mode**: Attaches the client to the global object in development to prevent creating new instances during hot reloading
3. **Enables Logging**: Adds logging for queries, errors, and warnings to help with debugging
4. **Follows Best Practices**: Implements the recommended pattern from Prisma's documentation for Next.js applications

Then we updated the StorageService to use this singleton client instead of creating its own instance:

```typescript
// Before
import { PrismaClient } from '@prisma/client';

export class StorageService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }
  // ...
}

// After
import prisma from '@/lib/prisma';

export class StorageService {
  constructor() {
    // Use the singleton prisma client
  }
  // ...
}
```

## 2. Fixing the Case of the RawSearchResult Model in the Storage Service

### The Issue

Even after implementing the singleton Prisma client, the application was still encountering an error: `Cannot read properties of undefined (reading 'create')` when trying to access `prisma.rawSearchResult.create()`. This occurred because:

1. **Case Sensitivity**: Prisma model names are case-sensitive, and the code was using `rawSearchResult` (lowercase 'r') but the model was defined as `RawSearchResult` (uppercase 'R') in the schema.

2. **Model Access**: When accessing Prisma models, the case must exactly match how the model is defined in the schema.

### The Solution

We updated all references to the RawSearchResult model in the StorageService to use the correct case:

```typescript
// Before
return prisma.$transaction(
  rawResults.map(result => 
    prisma.rawSearchResult.create({
      data: result
    })
  )
);

// After
return prisma.$transaction(
  rawResults.map(result => 
    prisma.RawSearchResult.create({
      data: result
    })
  )
);
```

We also updated the `getRawResults` method:

```typescript
// Before
async getRawResults(searchRequestId: string): Promise<RawSearchResult[]> {
  return prisma.rawSearchResult.findMany({
    where: {
      searchRequestId
    }
  });
}

// After
async getRawResults(searchRequestId: string): Promise<RawSearchResult[]> {
  return prisma.RawSearchResult.findMany({
    where: {
      searchRequestId
    }
  });
}
```

## Benefits of These Fixes

1. **Improved Stability**: The singleton pattern ensures consistent database connections and prevents connection pool exhaustion.

2. **Better Performance**: Reusing the same Prisma client instance is more efficient than creating new instances.

3. **Reduced Memory Usage**: A single Prisma client instance uses less memory than multiple instances.

4. **Correct Model Access**: Using the correct case for model names ensures that Prisma can properly access the database tables.

5. **Consistent Error Handling**: With proper model access, errors are more predictable and easier to debug.

## Best Practices for Prisma in Next.js Applications

1. **Always Use a Singleton Pattern**: Create a single Prisma client instance and reuse it throughout your application.

2. **Match Schema Case Exactly**: When accessing Prisma models, ensure the case matches exactly how the model is defined in the schema.

3. **Enable Logging in Development**: Use the `log` option to enable logging for queries, errors, and warnings to help with debugging.

4. **Handle Hot Reloading**: In development, attach the Prisma client to the global object to prevent creating new instances during hot reloading.

5. **Consider Connection Pooling**: For production deployments, consider using connection pooling to improve performance and stability.

## Related Documentation

- [Prisma Best Practices for Next.js](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-nextjs)
- [Prisma Connection Management](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
