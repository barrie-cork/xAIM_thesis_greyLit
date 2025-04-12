# Frontend Migration Guide for Search Workflow Refactoring

This guide outlines the steps needed to update frontend code to use the refactored search workflow.

## Overview of Changes

The search workflow has been refactored to:

1. Separate the search execution from result processing
2. Store raw search results before deduplication
3. Process results asynchronously in the background
4. Improve duplicate detection and tracking

## API Changes

### New Endpoints

The following new endpoints have been added:

1. **`search.executeV2`** - Execute a search using the refactored service
   - Returns search request ID and queues processing
   - Does not return processed results immediately

2. **`search.getProcessedResults`** - Get processed search results
   - Retrieves results after processing is complete
   - Supports filtering out duplicates

3. **`search.processResults`** - Process search results immediately
   - Manually trigger processing if needed
   - Useful for testing or when immediate results are required

4. **`search.migrateResults`** - Migrate existing search results
   - Converts old format to new format
   - Queues for processing

5. **`results.getDuplicateRelationships`** - Get duplicate relationships
   - Shows which results are duplicates of others
   - Includes confidence scores

### Updated Endpoints

The following existing endpoints have been updated for compatibility:

1. **`results.getByQueryId`** - Now supports both old and new formats
   - Added `includeDuplicates` parameter

## Migration Steps

### Step 1: Update Search Execution

Replace calls to `search.execute` with `search.executeV2`:

```typescript
// Old code
const { data } = await trpc.search.execute.mutate({
  query: "example search",
  maxResults: 20,
  fileTypes: ["PDF"],
  domain: "example.com",
  providers: ["SERPER"],
  saveToDB: true,
  searchTitle: "My Search"
});

// Access results immediately
const results = data.searchResponses[0].results;

// New code
const { data } = await trpc.search.executeV2.mutate({
  query: "example search",
  maxResults: 20,
  fileTypes: ["PDF"],
  domain: "example.com",
  providers: ["SERPER"]
});

// Store the search request ID for later use
const searchRequestId = data.searchRequestId;
```

### Step 2: Fetch Processed Results

Add code to fetch processed results after search execution:

```typescript
// Fetch processed results
const { data: processedData } = await trpc.search.getProcessedResults.query({
  searchRequestId: searchRequestId,
  includeDuplicates: false
});

// Access processed results
const results = processedData.results;
```

### Step 3: Handle Background Processing

Add UI elements to show processing status:

```typescript
// Check if processing is complete
const [isProcessing, setIsProcessing] = useState(true);
const [results, setResults] = useState([]);

useEffect(() => {
  const checkProcessing = async () => {
    try {
      // Try to get results
      const { data } = await trpc.search.getProcessedResults.query({
        searchRequestId
      });
      
      // If we get results, processing is complete
      setResults(data.results);
      setIsProcessing(false);
    } catch (error) {
      // If error, try again in 1 second
      setTimeout(checkProcessing, 1000);
    }
  };
  
  checkProcessing();
}, [searchRequestId]);

// In your UI
return (
  <div>
    {isProcessing ? (
      <LoadingSpinner text="Processing search results..." />
    ) : (
      <ResultsList results={results} />
    )}
  </div>
);
```

### Step 4: Migrate Existing Searches

For existing searches, add a migration button:

```typescript
const handleMigrate = async () => {
  await trpc.search.migrateResults.mutate({
    searchRequestId
  });
  
  // Refresh results after migration
  const { data } = await trpc.search.getProcessedResults.query({
    searchRequestId
  });
  
  setResults(data.results);
};

// In your UI
return (
  <div>
    {needsMigration && (
      <Button onClick={handleMigrate}>
        Migrate to New Format
      </Button>
    )}
    <ResultsList results={results} />
  </div>
);
```

### Step 5: Show Duplicate Information

Add UI to display duplicate relationships:

```typescript
const [duplicateInfo, setDuplicateInfo] = useState(null);

const showDuplicateInfo = async (resultId) => {
  const { data } = await trpc.results.getDuplicateRelationships.query({
    resultId
  });
  
  setDuplicateInfo(data);
};

// In your UI
return (
  <div>
    {result.status === 'duplicate' && (
      <Button onClick={() => showDuplicateInfo(result.id)}>
        Show Original
      </Button>
    )}
    
    {duplicateInfo && (
      <DuplicateInfoPanel 
        relationships={duplicateInfo.relationships}
        onClose={() => setDuplicateInfo(null)}
      />
    )}
  </div>
);
```

## Compatibility Considerations

- The old `search.execute` endpoint still works but doesn't use the new processing pipeline
- Results from old searches can be migrated using `search.migrateResults`
- The `results.getByQueryId` endpoint works with both old and new formats

## Testing

When testing the migration:

1. Try executing a search with the new endpoint
2. Verify that results are processed correctly
3. Test the migration of existing searches
4. Verify that duplicate detection works as expected

## Troubleshooting

Common issues:

1. **Results not appearing**: Check if processing is complete
2. **Migration errors**: Ensure the search request exists and belongs to the user
3. **Duplicate detection issues**: Try adjusting similarity threshold in `processResults`

If you encounter any issues, please contact the backend team for assistance.
