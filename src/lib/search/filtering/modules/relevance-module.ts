import { SearchResult as BaseSearchResult } from '../../types';
import { EnrichmentModule } from '../types';

/**
 * Relevance module configuration
 */
export interface RelevanceModuleConfig {
  // Weights for different components of relevance
  weightKeywordMatch: number;
  weightTitleMatch: number;
  weightUrlMatch: number;
  weightRecency: number;
  weightRank: number;
  
  // Whether to normalize scores to 0-1 range
  normalizeScores: boolean;
  
  // Whether to extract keywords from the query
  extractKeywords: boolean;
  
  // Maximum age in days for recency calculation
  maxAgeDays: number;
  
  // Minimum threshold for considering a relevance score
  minimumRelevanceThreshold: number;
}

/**
 * Default module configuration
 */
const DEFAULT_CONFIG: RelevanceModuleConfig = {
  weightKeywordMatch: 0.4,
  weightTitleMatch: 0.3,
  weightUrlMatch: 0.1,
  weightRecency: 0.1,
  weightRank: 0.1,
  normalizeScores: true,
  extractKeywords: true,
  maxAgeDays: 365,
  minimumRelevanceThreshold: 0.01
};

/**
 * Relevance metadata structure
 */
export interface RelevanceMetadata {
  calculatedAt: Date;
  query?: string;
  relevanceScore: number;
  components: {
    keywordMatchScore?: number;
    titleMatchScore?: number;
    urlMatchScore?: number;
    recencyScore?: number;
    rankScore?: number;
  };
  keywords?: string[];
}

/**
 * Module that calculates relevance scores for search results
 */
export class RelevanceModule implements EnrichmentModule {
  readonly id: string = 'relevance';
  readonly name: string = 'Relevance Scorer';
  readonly description: string = 'Calculates relevance scores for search results';
  readonly enabled: boolean = true;
  
  private config: RelevanceModuleConfig;
  private currentQuery: string = '';
  private keywords: string[] = [];

  constructor(config?: Partial<RelevanceModuleConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the current search query
   */
  setQuery(query: string): void {
    this.currentQuery = query;
    
    if (this.config.extractKeywords) {
      this.keywords = this.extractKeywords(query);
    }
  }

  /**
   * Process a batch of search results
   */
  async processBatch(results: BaseSearchResult[]): Promise<BaseSearchResult[]> {
    if (results.length === 0) {
      return [];
    }
    
    // Calculate scores for all results
    const scoredResults = results.map(result => {
      const relevanceData = this.calculateRelevance(result);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          relevance: relevanceData
        }
      };
    });
    
    // Normalize scores if configured
    if (this.config.normalizeScores) {
      // Find max score
      const maxScore = Math.max(
        ...scoredResults.map(r => (r.metadata?.relevance as RelevanceMetadata).relevanceScore)
      );
      
      if (maxScore > 0) {
        // Normalize all scores
        scoredResults.forEach(result => {
          const relevance = result.metadata?.relevance as RelevanceMetadata;
          relevance.relevanceScore = relevance.relevanceScore / maxScore;
        });
      }
    }
    
    return scoredResults;
  }

  /**
   * Process a single search result
   */
  async process(result: BaseSearchResult): Promise<BaseSearchResult> {
    const relevanceData = this.calculateRelevance(result);
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        relevance: relevanceData
      }
    };
  }

  /**
   * Get module configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Update module configuration
   */
  updateConfig(config: Partial<RelevanceModuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate relevance score and components for a result
   */
  private calculateRelevance(result: BaseSearchResult): RelevanceMetadata {
    const components: RelevanceMetadata['components'] = {};
    
    // 1. Calculate keyword match score
    if (this.config.weightKeywordMatch > 0) {
      components.keywordMatchScore = this.calculateKeywordMatchScore(result);
    }
    
    // 2. Calculate title match score
    if (this.config.weightTitleMatch > 0 && result.title) {
      components.titleMatchScore = this.calculateTitleMatchScore(result);
    }
    
    // 3. Calculate URL match score
    if (this.config.weightUrlMatch > 0 && result.url) {
      components.urlMatchScore = this.calculateUrlMatchScore(result);
    }
    
    // 4. Calculate recency score
    if (this.config.weightRecency > 0 && result.timestamp) {
      components.recencyScore = this.calculateRecencyScore(result);
    }
    
    // 5. Calculate rank score
    if (this.config.weightRank > 0 && result.rank !== undefined) {
      components.rankScore = this.calculateRankScore(result);
    }
    
    // 6. Calculate combined relevance score
    let relevanceScore = 0;
    let weightSum = 0;
    
    if (components.keywordMatchScore !== undefined) {
      relevanceScore += components.keywordMatchScore * this.config.weightKeywordMatch;
      weightSum += this.config.weightKeywordMatch;
    }
    
    if (components.titleMatchScore !== undefined) {
      relevanceScore += components.titleMatchScore * this.config.weightTitleMatch;
      weightSum += this.config.weightTitleMatch;
    }
    
    if (components.urlMatchScore !== undefined) {
      relevanceScore += components.urlMatchScore * this.config.weightUrlMatch;
      weightSum += this.config.weightUrlMatch;
    }
    
    if (components.recencyScore !== undefined) {
      relevanceScore += components.recencyScore * this.config.weightRecency;
      weightSum += this.config.weightRecency;
    }
    
    if (components.rankScore !== undefined) {
      relevanceScore += components.rankScore * this.config.weightRank;
      weightSum += this.config.weightRank;
    }
    
    // Normalize by applied weights
    if (weightSum > 0) {
      relevanceScore = relevanceScore / weightSum;
    }
    
    // Apply minimum threshold
    if (relevanceScore < this.config.minimumRelevanceThreshold) {
      relevanceScore = 0;
    }
    
    return {
      calculatedAt: new Date(),
      query: this.currentQuery,
      relevanceScore,
      components,
      keywords: this.keywords.length > 0 ? [...this.keywords] : undefined
    };
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatchScore(result: BaseSearchResult): number {
    if (!this.keywords.length || !result.snippet) {
      return 0;
    }
    
    const snippet = result.snippet.toLowerCase();
    const title = (result.title || '').toLowerCase();
    
    let matches = 0;
    let importantMatches = 0;
    
    for (const keyword of this.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Check snippet
      if (snippet.includes(keywordLower)) {
        matches++;
        
        // Count occurrences
        const occurrences = (snippet.match(new RegExp(keywordLower, 'g')) || []).length;
        matches += Math.min(occurrences - 1, 2) * 0.5; // Diminishing returns
      }
      
      // Check title (more important)
      if (title.includes(keywordLower)) {
        importantMatches++;
      }
    }
    
    // Calculate score based on matches and keywords
    const maxPossibleMatches = this.keywords.length * 2; // Account for potential multiple occurrences
    const baseScore = matches / maxPossibleMatches;
    
    // Boost score for title matches
    const titleBoost = importantMatches / this.keywords.length * 0.5;
    
    return Math.min(1, baseScore + titleBoost);
  }

  /**
   * Calculate title match score
   */
  private calculateTitleMatchScore(result: BaseSearchResult): number {
    if (!result.title || !this.currentQuery) {
      return 0;
    }
    
    const title = result.title.toLowerCase();
    const query = this.currentQuery.toLowerCase();
    
    // Exact title match
    if (title === query) {
      return 1;
    }
    
    // Title starts with query
    if (title.startsWith(query)) {
      return 0.9;
    }
    
    // Query starts with title
    if (query.startsWith(title)) {
      return 0.8;
    }
    
    // Title contains exact query
    if (title.includes(query)) {
      return 0.7;
    }
    
    // Check for word matches
    const titleWords = title.split(/\s+/);
    const queryWords = query.split(/\s+/);
    
    let matchCount = 0;
    for (const queryWord of queryWords) {
      if (queryWord.length <= 2) continue; // Skip short words
      
      if (titleWords.includes(queryWord)) {
        matchCount++;
      }
    }
    
    if (queryWords.length > 0) {
      return 0.5 * (matchCount / queryWords.length);
    }
    
    return 0;
  }

  /**
   * Calculate URL match score
   */
  private calculateUrlMatchScore(result: BaseSearchResult): number {
    if (!result.url || this.keywords.length === 0) {
      return 0;
    }
    
    try {
      const url = new URL(result.url);
      const path = url.pathname.toLowerCase();
      const hostname = url.hostname.toLowerCase();
      
      let score = 0;
      
      // Check for keywords in hostname (domain)
      for (const keyword of this.keywords) {
        if (keyword.length <= 2) continue; // Skip short keywords
        
        const keywordLower = keyword.toLowerCase();
        
        if (hostname.includes(keywordLower)) {
          score += 0.5;
        }
        
        // Check for keywords in path
        if (path.includes(keywordLower)) {
          score += 0.3;
        }
      }
      
      // Bonus for clean URLs that likely indicate a main page on the topic
      if (path.split('/').filter(Boolean).length <= 2) {
        score += 0.2;
      }
      
      return Math.min(1, score);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(result: BaseSearchResult): number {
    if (!result.timestamp) {
      return 0;
    }
    
    const now = new Date();
    const timestamp = new Date(result.timestamp);
    
    // Calculate age in days
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    // Normalize age to score (newer is better)
    return Math.max(0, 1 - (ageInDays / this.config.maxAgeDays));
  }

  /**
   * Calculate rank score
   */
  private calculateRankScore(result: BaseSearchResult): number {
    if (result.rank === undefined || result.rank <= 0) {
      return 0;
    }
    
    // Assume lower rank number is better (e.g., #1 result)
    // and typical searches return around 10 results per page
    return Math.max(0, 1 - ((result.rank - 1) / 10));
  }

  /**
   * Extract significant keywords from a query
   */
  private extractKeywords(query: string): string[] {
    // Skip if query is empty
    if (!query || !query.trim()) {
      return [];
    }
    
    // Split into words and filter
    const words = query
      .split(/\s+/)
      .map(word => word.toLowerCase())
      .filter(word => {
        // Remove very short words and common stop words
        if (word.length <= 2) return false;
        
        const stopWords = [
          'the', 'and', 'for', 'from', 'with', 'that', 'have', 'this', 'are', 'not',
          'what', 'when', 'where', 'who', 'why', 'how', 'does', 'which'
        ];
        
        return !stopWords.includes(word);
      });
    
    // Return unique keywords
    return [...new Set(words)];
  }
} 