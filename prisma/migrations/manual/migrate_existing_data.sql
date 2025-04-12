-- Migrate existing search results to the new schema
-- This script should be run after the schema changes have been applied

-- Step 1: Set status for all existing search results to 'processed'
UPDATE search_results
SET status = 'processed';

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
  title,
  url,
  search_engine,
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
WHERE deduped = true;

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
AND sr.deduped = false;

-- Step 4: Update status for duplicate results
UPDATE search_results
SET 
  status = 'duplicate',
  duplicate_of_id = dr.original_result_id
FROM duplicate_relationships dr
WHERE search_results.id = dr.duplicate_result_id;

-- Step 5: Add processing metadata to all results
UPDATE search_results
SET processing_metadata = jsonb_build_object(
  'migrated', true,
  'migrationTimestamp', NOW(),
  'originalDeduped', deduped
);
