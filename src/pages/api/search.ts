import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { SearchParams, SearchResult, SearchRequest } from '../../lib/search/types';
import { DEFAULT_SEARCH_CONFIG } from '../../lib/search/index';
import { SerpExecutorService } from '../../lib/search/serp-executor.service';
import { ResultsProcessorService, ProcessingContext, ProcessingResult } from '../../lib/search/results-processor.service';
import { v4 as uuidv4 } from 'uuid';
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

// Define search request state for database
type SearchRequestStatus = 'pending' | 'processing' | 'completed' | 'error';

interface SearchRequestState {
    status: SearchRequestStatus;
    resultCount?: number;
    error?: string;
    [key: string]: any; // Allow additional properties for JSON storage
}

// Validate search request parameters
function validateSearchRequest(body: any): { isValid: boolean; error?: string } {
    if (!body.query || typeof body.query !== 'string') {
        return { isValid: false, error: 'Query is required and must be a string' };
    }

    if (body.numResults !== undefined) {
        const num = Number(body.numResults);
        if (isNaN(num) || num < 1 || num > 100) {
            return { isValid: false, error: 'numResults must be a number between 1 and 100' };
        }
    }

    return { isValid: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        // Validate request
        const validation = validateSearchRequest(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ success: false, message: validation.error });
        }

        const searchRequest: SearchRequest = {
            ...req.body,
            maxResults: req.body.numResults // Map numResults to maxResults for internal use
        };
        const userId = uuidv4(); // TODO: Replace with actual user ID from session/auth

        // --- Instantiate New Services ---
        const config: any = DEFAULT_SEARCH_CONFIG;
        const executorService = new SerpExecutorService(config);
        const processorService = new ResultsProcessorService(config, prisma);

        // --- Save Search Request to DB ---
        let searchRequestRecord;
        try {
            const initialState: SearchRequestState = {
                status: 'pending',
                timestamp: new Date().toISOString(),
                maxResults: searchRequest.maxResults
            };

            searchRequestRecord = await prisma.searchRequest.create({
                data: {
                    userId,
                    query: searchRequest.query,
                    source: 'api',
                    filters: initialState
                }
            });
        } catch (dbError) {
            console.error("Error saving SearchRequest:", dbError);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to initialize search request' 
            });
        }

        // --- Execute Search ---
        let initialResults: SearchResult[];
        try {
            console.log(`Executing search for query: ${searchRequest.query}`);
            initialResults = await executorService.execute(searchRequest);
            console.log(`Executor returned ${initialResults.length} initial results.`);
        } catch (searchError: any) {
            console.error('Search execution error:', searchError);
            const errorState: SearchRequestState = {
                status: 'error',
                error: searchError.message || 'Search execution failed',
                timestamp: new Date().toISOString()
            };

            await prisma.searchRequest.update({
                where: { queryId: searchRequestRecord.queryId },
                data: { filters: errorState }
            });
            
            return res.status(500).json({ 
                success: false, 
                message: 'The search execution failed' 
            });
        }

        // --- Process Results ---
        let processingResult: ProcessingResult;
        try {
            const processingContext: ProcessingContext = {
                userId: userId,
                searchRequestId: searchRequestRecord.queryId
            };
            console.log(`Processing ${initialResults.length} results...`);
            processingResult = await processorService.process(
                initialResults,
                searchRequest,
                processingContext
            );
            console.log(`Processor finished. Unique results: ${processingResult.uniqueResults.length}, CacheHit: ${processingResult.cacheHit}`);

            // Update search request with results info
            const completedState: SearchRequestState = {
                status: 'completed',
                resultCount: processingResult.uniqueResults.length,
                timestamp: new Date().toISOString(),
                cacheHit: processingResult.cacheHit,
                duplicatesRemoved: processingResult.duplicatesRemoved
            };

            await prisma.searchRequest.update({
                where: { queryId: searchRequestRecord.queryId },
                data: { filters: completedState }
            });
        } catch (processingError: any) {
            console.error('Results processing error:', processingError);
            const errorState: SearchRequestState = {
                status: 'error',
                error: processingError.message || 'Results processing failed',
                timestamp: new Date().toISOString()
            };

            await prisma.searchRequest.update({
                where: { queryId: searchRequestRecord.queryId },
                data: { filters: errorState }
            });
            
            return res.status(500).json({ 
                success: false, 
                message: 'The results processing failed' 
            });
        }

        // --- Send Response ---
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
        res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred' 
    });
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