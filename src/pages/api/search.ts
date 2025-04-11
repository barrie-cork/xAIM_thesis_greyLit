import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { SearchParams, SearchResult, SearchRequest } from '../../lib/search/types';
import { DEFAULT_SEARCH_CONFIG } from '../../lib/search/index';
import { SerpExecutorService } from '../../lib/search/serp-executor.service';
import { ResultsProcessorService, ProcessingContext, ProcessingResult } from '../../lib/search/results-processor.service';
// Remove unused imports related to old workflow
// import { SearchService, SearchResponse } from '@/lib/search';
// import { DeduplicationService, SearchResult as DeduplicationSearchResult } from '@/lib/search/deduplication';
// import { SearchResult as ApiSearchResult } from '@/lib/search/types';
// import { convertSearchResult, SearchResultTypeMap } from '@/lib/search/common-types';
// import { toDeduplicationResult } from '@/lib/search/result-resolver';

const prisma = new PrismaClient();

// Define API response structure
interface ApiResponse {
    success: boolean;
    data?: SearchResult[];
    message?: string;
    metadata?: {
        duplicatesRemoved: number;
        cacheHit: boolean;
        // Add other metadata if needed
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const searchRequest: SearchRequest = req.body;
        const userId = 'temp-user-id'; // TODO: Replace with actual user ID from session/auth

        // --- Instantiate New Services ---
        // Use a type assertion or define a local config type based on DEFAULT_SEARCH_CONFIG structure
        const config: any = DEFAULT_SEARCH_CONFIG; // Using any temporarily, refine if needed
        const executorService = new SerpExecutorService(config);
        const processorService = new ResultsProcessorService(config, prisma);

        // --- Save Search Request to DB (if needed to get ID for linking) ---
        let searchRequestId: string | undefined = undefined;
        try {
            const savedSearchRequest = await prisma.searchRequest.create({
                data: {
                    userId: userId,
                    query: searchRequest.query,
                    source: 'api', // Indicate source
                    // Map other fields from searchRequest if needed (filters, title etc.)
                    // Ensure all required fields are present
                }
            });
            searchRequestId = savedSearchRequest.queryId;
        } catch (dbError) {
            console.error("Error saving SearchRequest:", dbError);
            // Decide how to handle this: proceed without linking, or return error?
            // For now, log and proceed without linking.
        }

        // --- Execute Search ---
        console.log(`Executing search for query: ${searchRequest.query}`);
        const initialResults: SearchResult[] = await executorService.execute(searchRequest);
        console.log(`Executor returned ${initialResults.length} initial results.`);

        // --- Process Results ---
        const processingContext: ProcessingContext = {
            userId: userId,
            searchRequestId: searchRequestId // Pass the saved request ID
        };
        console.log(`Processing ${initialResults.length} results...`);
        const processingResult: ProcessingResult = await processorService.process(
            initialResults,
            searchRequest,
            processingContext
        );
        console.log(`Processor finished. Unique results: ${processingResult.uniqueResults.length}, CacheHit: ${processingResult.cacheHit}`);

        // --- Format and Send Response ---
        res.status(200).json({
            success: true,
            data: processingResult.uniqueResults,
            metadata: {
                duplicatesRemoved: processingResult.duplicatesRemoved,
                cacheHit: processingResult.cacheHit,
            }
        });

    } catch (error: any) {
        console.error('Search API error:', error);
        // Basic error handling, can be enhanced
        const statusCode = error.statusCode || 500;
        const message = error.message || 'An unexpected error occurred';
        res.status(statusCode).json({ success: false, message });
    }
}

// Remove the unused getBatchInfo function entirely
/*
export async function getBatchInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... removed code ...
}
*/ 