# Deduplication System Security Considerations

This document outlines security considerations for the deduplication system (Task 6.3) in light of the recent authentication and security improvements.

## Current Status

Task 6.3: "Develop Result Deduplication System with Fuzzy Matching" is currently in progress. This system identifies and handles duplicate search results using URL normalization and fuzzy title matching.

## Security Implications

The recent security improvements, particularly Row Level Security (RLS) and user data synchronization, have several implications for the deduplication system:

1. **User Data Isolation**: Each user's search results must be isolated from other users
2. **RLS Policies**: Appropriate RLS policies must be in place for any tables used by the deduplication system
3. **Database Triggers**: Any new tables should be considered for synchronization if they contain user-specific data

## Implementation Recommendations

### 1. Duplicate Log Table

The `duplicate_log` table should:

- Have RLS enabled
- Have appropriate policies to ensure users can only see their own duplicate logs
- Include a reference to the user who owns the search request

```sql
-- Enable RLS
ALTER TABLE public.duplicate_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own duplicate logs
CREATE POLICY "users_select_own_duplicates" ON public.duplicate_log
FOR SELECT USING (
  search_request_id IN (
    SELECT query_id FROM public.search_requests WHERE user_id = auth.uid()
  )
);

-- System can insert duplicate logs
CREATE POLICY "system_insert_duplicates" ON public.duplicate_log
FOR INSERT TO authenticated WITH CHECK (true);
```

### 2. Deduplication Service

The deduplication service should:

- Always include user context in its operations
- Respect RLS boundaries when querying the database
- Use the user's ID when logging duplicates

Example code pattern:

```typescript
class DeduplicationService {
  async deduplicateResults(
    searchRequestId: string,
    results: SearchResult[],
    options: DeduplicationOptions,
    userId: string  // Include userId parameter
  ): Promise<DeduplicatedResults> {
    // Verify the user owns this search request
    const searchRequest = await this.prisma.searchRequest.findUnique({
      where: {
        queryId: searchRequestId,
        userId: userId  // Ensure the user owns this search request
      }
    });

    if (!searchRequest) {
      throw new Error('Search request not found or access denied');
    }

    // Proceed with deduplication...
    
    // Log duplicates with user context
    await this.logDuplicates(duplicates, searchRequestId, userId);
    
    return {
      uniqueResults,
      duplicateCount: duplicates.length
    };
  }
  
  private async logDuplicates(
    duplicates: DuplicateResult[],
    searchRequestId: string,
    userId: string  // Include userId parameter
  ): Promise<void> {
    // Log duplicates with user context
    await this.prisma.duplicateLog.createMany({
      data: duplicates.map(duplicate => ({
        searchRequestId,
        originalUrl: duplicate.originalUrl,
        duplicateUrl: duplicate.duplicateUrl,
        similarityScore: duplicate.similarityScore,
        reason: duplicate.reason,
        userId  // Include userId in the log
      }))
    });
  }
}
```

### 3. API Endpoints

Any API endpoints related to deduplication should:

- Use `protectedProcedure` to ensure authentication
- Include the user's ID in database operations
- Verify ownership of resources before operating on them

Example tRPC procedure:

```typescript
getDuplicateLogs: protectedProcedure
  .input(z.object({
    searchRequestId: z.string().uuid()
  }))
  .query(async ({ ctx, input }) => {
    const { userId } = ctx.session;
    
    // Verify the user owns this search request
    const searchRequest = await ctx.prisma.searchRequest.findUnique({
      where: {
        queryId: input.searchRequestId,
        userId  // Ensure the user owns this search request
      }
    });
    
    if (!searchRequest) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Search request not found'
      });
    }
    
    // Get duplicate logs
    const duplicateLogs = await ctx.prisma.duplicateLog.findMany({
      where: {
        searchRequestId: input.searchRequestId
      }
    });
    
    return duplicateLogs;
  })
```

## Testing Considerations

When testing the deduplication system:

1. **Multi-user testing**: Test with multiple user accounts to ensure proper data isolation
2. **RLS verification**: Verify that RLS policies are working correctly
3. **Error handling**: Test error cases, especially unauthorized access attempts
4. **Performance**: Ensure that RLS doesn't significantly impact performance

## Integration with Existing Code

The current implementation already includes user authentication and associates search requests with user IDs. The deduplication system should:

1. Use the existing user context from the tRPC procedures
2. Maintain the association between search requests and users
3. Ensure all new tables have appropriate RLS policies

By following these recommendations, the deduplication system will maintain the security improvements we've made while providing the required functionality.
