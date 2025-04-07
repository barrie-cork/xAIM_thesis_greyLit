-- Enable RLS for the table
ALTER TABLE public.search_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT their own search requests
CREATE POLICY "Allow individual user SELECT access"
ON public.search_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to INSERT their own search requests
CREATE POLICY "Allow individual user INSERT access"
ON public.search_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to UPDATE their own search requests
CREATE POLICY "Allow individual user UPDATE access"
ON public.search_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to DELETE their own search requests
CREATE POLICY "Allow individual user DELETE access"
ON public.search_requests
FOR DELETE
USING (auth.uid() = user_id); 