/**
 * Types for search API integration
 */

import { CoreSearchResult } from './common-types';
import { DeduplicationOptions } from './deduplication';
import { SearchProviderType } from './factory';

// Search query parameters
export interface SearchParams {
  query: string;
  maxResults?: number;
  fileType?: FileType | FileType[];
  page?: number;
  domain?: string;
}

// Search request parameters, extending basic SearchParams
// Needed by API layer and potentially services
export interface SearchRequest extends SearchParams {
  providers?: SearchProviderType[];
  deduplication?: boolean | Partial<DeduplicationOptions>;
  useCache?: boolean;
}

// Supported file types for filtering
export enum FileType {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  PPT = 'ppt',
  PPTX = 'pptx',
  HTML = 'html',
}

// Canonical search result format used throughout the backend
export interface SearchResult extends CoreSearchResult {
  id?: string;                   // Optional UUID, likely added just before storage
  rank?: number;                 // Canonical name for position/rank
  resultType?: string;           // e.g., 'organic', 'ad', 'snippet'
  searchEngine: string;         // Canonical name for the provider/source API
  device?: string;               // Device context if available
  location?: string;             // Location context if available
  language?: string;             // Language context if available
  totalResults?: number;        // From SERP metadata, if available
  creditsUsed?: number;         // From SERP metadata, if available
  searchId?: string;            // Unique ID for the search from the API, if available
  searchUrl?: string;           // URL of the search results page, if available
  relatedSearches?: string[];   // From SERP metadata, if available
  similarQuestions?: string[];  // From SERP metadata, if available
  timestamp: Date;              // Timestamp of fetch or processing
  rawResponse?: Record<string, any>; // Original provider response data block
  deduped?: boolean;             // Flag set after deduplication (optional during processing)
  metadata?: Record<string, any>; // Inherited from CoreSearchResult for custom enrichments
  [key: string]: any;           // Add index signature back to allow dynamic access in mergeResults
}

// Provider response format (before normalization)
export interface ProviderResponse {
  results: any[];
  pagination?: {
    nextPage?: number;
    totalResults?: number;
    hasMore?: boolean;
  };
  meta?: {
    searchEngine?: string;
    searchId?: string;
    creditsUsed?: number;
    searchUrl?: string;
    relatedSearches?: string[];
    similarQuestions?: string[];
    [key: string]: any;
  };
  rawResponse: Record<string, any>;
}

// Standardized search response structure (often used for caching)
export interface SearchResponse {
  results: SearchResult[];
  provider: SearchProviderType | 'processed'; // Which provider OR indicates processed results
  pagination?: {
    nextPage?: number;
    totalResults?: number;
    hasMore?: boolean;
  };
  metadata: {
    searchEngine: string;
    searchId?: string;
    creditsUsed: number;
    searchUrl?: string;
    timestamp: Date;
    deduplication?: {
      enabled: boolean;
      originalCount: number;
      uniqueCount: number;
      duplicatesRemoved: number;
    };
    cache?: {
      hit: boolean;
      fingerprint: string;
    };
    // Allow other potential metadata
    [key: string]: any;
  };
}

// Rate limiting options
export interface RateLimitOptions {
  maxTokens: number;
  refillRate: number; // tokens per second
  timeWindow: number; // milliseconds
}

// Error types specific to search operations
export enum SearchErrorType {
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

// Search error class
export class SearchError extends Error {
  type: SearchErrorType;
  provider?: string;
  statusCode?: number;
  retryAfter?: number;
  
  constructor(
    message: string, 
    type: SearchErrorType, 
    provider?: string,
    statusCode?: number,
    retryAfter?: number
  ) {
    super(message);
    this.type = type;
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
    this.name = 'SearchError';
  }
} 