# Row Level Security (RLS) Policy Guidelines

This document provides guidelines for implementing Row Level Security (RLS) policies in the application. These guidelines should be followed when creating new tables or modifying existing ones to ensure consistent security across the application.

## General Principles

1. **Enable RLS on all tables**: All tables in the `public` schema should have RLS enabled.
2. **User-specific data**: Users should only be able to access their own data.
3. **Explicit policies**: Each table should have explicit policies for all operations (SELECT, INSERT, UPDATE, DELETE).
4. **Default deny**: By default, access should be denied unless explicitly allowed by a policy.

## Standard Policy Templates

### User-Owned Resources

For tables that represent resources owned by a user (e.g., search requests, saved searches):

```sql
-- Allow users to select their own data
CREATE POLICY "users_select_own" ON table_name
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "users_insert_own" ON table_name
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own data
CREATE POLICY "users_update_own" ON table_name
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own data
CREATE POLICY "users_delete_own" ON table_name
FOR DELETE USING (auth.uid() = user_id);
```

### Related Resources

For tables that are related to user-owned resources (e.g., search results related to search requests):

```sql
-- Allow users to select related data
CREATE POLICY "users_select_related" ON table_name
FOR SELECT USING (
  foreign_key IN (
    SELECT id FROM parent_table WHERE user_id = auth.uid()
  )
);

-- Allow users to insert related data
CREATE POLICY "users_insert_related" ON table_name
FOR INSERT WITH CHECK (
  foreign_key IN (
    SELECT id FROM parent_table WHERE user_id = auth.uid()
  )
);

-- Similar policies for UPDATE and DELETE
```

### Shared Resources

For resources that can be shared between users:

```sql
-- Allow users to select shared data
CREATE POLICY "users_select_shared" ON table_name
FOR SELECT USING (
  is_public = true OR auth.uid() = user_id
);

-- Allow owners to update shared status
CREATE POLICY "owners_update_shared" ON table_name
FOR UPDATE USING (auth.uid() = user_id);
```

## Implementation Checklist

When implementing RLS for a new table:

1. **Enable RLS**:
   ```sql
   ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
   ```

2. **Create SELECT policy**:
   - Determine who should be able to read the data
   - Implement appropriate policy

3. **Create INSERT policy**:
   - Determine who should be able to create new records
   - Ensure user_id is set correctly

4. **Create UPDATE policy**:
   - Determine who should be able to modify records
   - Consider which fields should be updatable

5. **Create DELETE policy**:
   - Determine who should be able to delete records

6. **Test policies**:
   - Test as different users to ensure policies work as expected
   - Verify that users cannot access data they shouldn't

## Example: Search Requests Table

```sql
-- Enable RLS
ALTER TABLE public.search_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own search requests
CREATE POLICY "users_select_own_requests" ON public.search_requests
FOR SELECT USING (auth.uid() = user_id);

-- Users can create search requests (user_id must be their own)
CREATE POLICY "users_insert_own_requests" ON public.search_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own search requests
CREATE POLICY "users_update_own_requests" ON public.search_requests
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own search requests
CREATE POLICY "users_delete_own_requests" ON public.search_requests
FOR DELETE USING (auth.uid() = user_id);
```

## Example: Search Results Table

```sql
-- Enable RLS
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

-- Users can view results from their own search requests
CREATE POLICY "users_select_own_results" ON public.search_results
FOR SELECT USING (
  query_id IN (
    SELECT query_id FROM public.search_requests WHERE user_id = auth.uid()
  )
);

-- System can insert results (no WITH CHECK needed for system operations)
CREATE POLICY "system_insert_results" ON public.search_results
FOR INSERT TO authenticated WITH CHECK (true);

-- Users cannot update or delete results directly
```

## Considerations for Task 6: SERP Execution and Results Management

For the deduplication system and result storage:

1. **Duplicate Log Table**:
   - Enable RLS
   - Create policy to allow users to view their own duplicate logs
   - Allow system to insert duplicate logs

2. **Result Caching**:
   - Consider user-specific vs. shared caching
   - If shared, ensure no sensitive data is cached
   - If user-specific, implement appropriate RLS policies

## Considerations for Task 7: Review Interface

For the review tagging system:

1. **Review Tags Table**:
   - Enable RLS
   - Create policy to allow users to view/edit their own tags
   - Consider collaborative review scenarios

2. **Notes Table**:
   - Enable RLS
   - Create policy to allow users to view/edit their own notes
   - Consider sharing options if needed
