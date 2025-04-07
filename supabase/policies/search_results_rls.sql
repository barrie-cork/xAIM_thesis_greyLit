-- Enable RLS for the table
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT results linked to their own search requests
CREATE POLICY "Allow individual user SELECT access based on search request"
ON public.search_results
FOR SELECT
USING (
  auth.uid() = (
    SELECT user_id
    FROM public.search_requests sr
    WHERE sr.query_id = search_results.query_id
  )
);

-- Note: INSERT/UPDATE/DELETE policies are intentionally omitted for now. 