/**
 * Types for search API integration
 */

import { CoreSearchResult } from './common-types';

// Search query parameters
export interface SearchParams {
  query: string;
  maxResults?: number;
  fileType?: FileType | FileType[];
  page?: number;
  domain?: string;
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

// Normalized search result format
export interface SearchResult extends CoreSearchResult {
  rank?: number;
  resultType?: string;
  searchEngine: string;
  device?: string;
  location?: string;
  language?: string;
  totalResults?: number;
  creditsUsed?: number;
  searchId?: string;
  searchUrl?: string;
  relatedSearches?: string[];
  similarQuestions?: string[];
  timestamp: Date;
  rawResponse?: Record<string, any>;
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