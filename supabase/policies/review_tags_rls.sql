-- Enable RLS for the table
ALTER TABLE public.review_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT tags linked to results from their searches
CREATE POLICY "Allow users to SELECT tags for their search results"
ON public.review_tags
FOR SELECT
USING (
  auth.uid() = (
    SELECT sr.user_id
    FROM public.search_results res
    JOIN public.search_requests sr ON res.query_id = sr.query_id
    WHERE res.id = review_tags.result_id
  )
);

-- Policy: Allow users to INSERT tags where they are the reviewer
CREATE POLICY "Allow individual user INSERT access for own reviews"
ON public.review_tags
FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- Policy: Allow users to UPDATE tags where they are the reviewer
CREATE POLICY "Allow individual user UPDATE access for own reviews"
ON public.review_tags
FOR UPDATE
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

-- Policy: Allow users to DELETE tags where they are the reviewer
CREATE POLICY "Allow individual user DELETE access for own reviews"
ON public.review_tags
FOR DELETE
USING (auth.uid() = reviewer_id); 