-- Combined migration script for search workflow refactoring

-- Begin transaction
BEGIN;

-- 1. Schema Changes
-- CreateEnum
CREATE TYPE "SearchResultStatus" AS ENUM ('raw', 'processed', 'duplicate');

-- AlterTable
ALTER TABLE "search_results" 
ADD COLUMN IF NOT EXISTS "status" "SearchResultStatus" NOT NULL DEFAULT 'raw',
ADD COLUMN IF NOT EXISTS "duplicate_of_id" UUID,
ADD COLUMN IF NOT EXISTS "processing_metadata" JSONB;

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'search_results_duplicate_of_id_fkey'
    ) THEN
        ALTER TABLE "search_results" 
        ADD CONSTRAINT "search_results_duplicate_of_id_fkey" 
        FOREIGN KEY ("duplicate_of_id") REFERENCES "search_results"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "raw_search_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "search_request_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_search_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "duplicate_relationships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "original_result_id" UUID NOT NULL,
    "duplicate_result_id" UUID NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "raw_search_results_search_request_id_idx" 
ON "raw_search_results"("search_request_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duplicate_relationships_original_result_id_idx" 
ON "duplicate_relationships"("original_result_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "duplicate_relationships_duplicate_result_id_idx" 
ON "duplicate_relationships"("duplicate_result_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'raw_search_results_search_request_id_fkey'
    ) THEN
        ALTER TABLE "raw_search_results" 
        ADD CONSTRAINT "raw_search_results_search_request_id_fkey" 
        FOREIGN KEY ("search_request_id") REFERENCES "search_requests"("query_id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'duplicate_relationships_original_result_id_fkey'
    ) THEN
        ALTER TABLE "duplicate_relationships" 
        ADD CONSTRAINT "duplicate_relationships_original_result_id_fkey" 
        FOREIGN KEY ("original_result_id") REFERENCES "search_results"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'duplicate_relationships_duplicate_result_id_fkey'
    ) THEN
        ALTER TABLE "duplicate_relationships" 
        ADD CONSTRAINT "duplicate_relationships_duplicate_result_id_fkey" 
        FOREIGN KEY ("duplicate_result_id") REFERENCES "search_results"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- 2. Data Migration
-- Step 1: Set status for all existing search results to 'processed'
UPDATE search_results
SET status = 'processed'
WHERE status = 'raw';

-- Step 2: Create raw search results from existing search results
INSERT INTO raw_search_results (
  id,
  search_request_id,
  title,
  url,
  source,
  metadata,
  created_at
)
SELECT 
  gen_random_uuid(),
  query_id,
  COALESCE(title, ''),
  COALESCE(url, ''),
  COALESCE(search_engine, 'unknown'),
  jsonb_build_object(
    'snippet', snippet,
    'rank', rank,
    'resultType', result_type,
    'searchEngine', search_engine,
    'device', device,
    'location', location,
    'language', language,
    'rawResponse', raw_response
  ),
  timestamp
FROM search_results
WHERE deduped = true
AND NOT EXISTS (
  SELECT 1 FROM raw_search_results 
  WHERE raw_search_results.search_request_id = search_results.query_id
  AND raw_search_results.url = search_results.url
);

-- Step 3: Create duplicate relationships from existing duplicate log
INSERT INTO duplicate_relationships (
  id,
  original_result_id,
  duplicate_result_id,
  confidence_score,
  created_at
)
SELECT
  gen_random_uuid(),
  dl.original_result_id,
  sr.id,
  0.9, -- Default confidence score
  dl.timestamp
FROM duplicate_log dl
JOIN search_results sr ON sr.url = dl.duplicate_url
WHERE dl.original_result_id IS NOT NULL
AND sr.deduped = false
AND NOT EXISTS (
  SELECT 1 FROM duplicate_relationships 
  WHERE duplicate_relationships.original_result_id = dl.original_result_id
  AND duplicate_relationships.duplicate_result_id = sr.id
);

-- Step 4: Update status for duplicate results
UPDATE search_results
SET 
  status = 'duplicate',
  duplicate_of_id = dr.original_result_id
FROM duplicate_relationships dr
WHERE search_results.id = dr.duplicate_result_id
AND search_results.status != 'duplicate';

-- Step 5: Add processing metadata to all results
UPDATE search_results
SET processing_metadata = jsonb_build_object(
  'migrated', true,
  'migrationTimestamp', NOW(),
  'originalDeduped', deduped
)
WHERE processing_metadata IS NULL;

-- 3. RLS Policies
-- Enable RLS for raw_search_results
ALTER TABLE public.raw_search_results ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT raw results linked to their own search requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'raw_search_results' 
        AND policyname = 'Allow individual user SELECT access based on search request'
    ) THEN
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
    END IF;
END
$$;

-- Policy: Allow users to INSERT raw results linked to their own search requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'raw_search_results' 
        AND policyname = 'Allow individual user INSERT access based on search request'
    ) THEN
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
    END IF;
END
$$;

-- Enable RLS for duplicate_relationships
ALTER TABLE public.duplicate_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to SELECT duplicate relationships linked to their own search results
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'duplicate_relationships' 
        AND policyname = 'Allow individual user SELECT access based on search results'
    ) THEN
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
    END IF;
END
$$;

-- Policy: Allow users to INSERT duplicate relationships linked to their own search results
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'duplicate_relationships' 
        AND policyname = 'Allow individual user INSERT access based on search results'
    ) THEN
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
    END IF;
END
$$;

-- Commit transaction
COMMIT;
