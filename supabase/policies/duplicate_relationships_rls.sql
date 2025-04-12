-- Enable RLS for the table
ALTER TABLE public.duplicate_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT duplicate relationships linked to their own search results
CREATE POLICY "Allow individual user SELECT access based on search results"
ON public.duplicate_relationships
FOR SELECT
USING (
  auth.uid() IN (
    -- Check if user owns the original result
    SELECT sr.user_id
    FROM public.search_results res
    JOIN public.search_requests sr ON res.query_id = sr.query_id
    WHERE res.id = duplicate_relationships.original_result_id
    
    UNION
    
    -- Check if user owns the duplicate result
    SELECT sr.user_id
    FROM public.search_results res
    JOIN public.search_requests sr ON res.query_id = sr.query_id
    WHERE res.id = duplicate_relationships.duplicate_result_id
  )
);

-- Policy: Allow users to INSERT duplicate relationships linked to their own search results
CREATE POLICY "Allow individual user INSERT access based on search results"
ON public.duplicate_relationships
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    -- Check if user owns the original result
    SELECT sr.user_id
    FROM public.search_results res
    JOIN public.search_requests sr ON res.query_id = sr.query_id
    WHERE res.id = duplicate_relationships.original_result_id
    
    UNION
    
    -- Check if user owns the duplicate result
    SELECT sr.user_id
    FROM public.search_results res
    JOIN public.search_requests sr ON res.query_id = sr.query_id
    WHERE res.id = duplicate_relationships.duplicate_result_id
  )
);

-- Note: UPDATE/DELETE policies are intentionally omitted for now.
-- Duplicate relationships should be immutable once created.
