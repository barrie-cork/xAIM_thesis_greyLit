-- Enable RLS for the table
ALTER TABLE public.raw_search_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT raw results linked to their own search requests
CREATE POLICY "Allow individual user SELECT access based on search request"
ON public.raw_search_results
FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id
    FROM public.search_requests sr
    WHERE sr.query_id = raw_search_results.search_request_id
  )
);

-- Policy: Allow users to INSERT raw results linked to their own search requests
CREATE POLICY "Allow individual user INSERT access based on search request"
ON public.raw_search_results
FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT user_id
    FROM public.search_requests sr
    WHERE sr.query_id = raw_search_results.search_request_id
  )
);

-- Note: UPDATE/DELETE policies are intentionally omitted for now.
-- Raw results should be immutable once created.
