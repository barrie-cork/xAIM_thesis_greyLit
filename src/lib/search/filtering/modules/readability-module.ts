import { EnrichmentModule, EnrichmentResult } from '../types';
import { SearchResult } from '../../types';

/**
 * Readability module for analyzing and scoring content readability
 */
export class ReadabilityModule implements EnrichmentModule {
  id: string = 'readability';
  name: string = 'Readability Analysis';
  description: string = 'Analyzes content readability and provides scoring';
  enabled: boolean = true;

  private config: {
    minCharactersForAnalysis: number;
    applyToSnippetsOnly: boolean;
    scoreThresholds: {
      easy: number;
      moderate: number;
      difficult: number;
    };
  };

  constructor(config?: Partial<typeof ReadabilityModule.prototype.config>) {
    this.config = {
      minCharactersForAnalysis: 50,
      applyToSnippetsOnly: true,
      scoreThresholds: {
        easy: 80,
        moderate: 50,
        difficult: 30
      },
      ...config
    };
  }

  /**
   * Process a single search result
   */
  async process(result: SearchResult): Promise<SearchResult> {
    const textToAnalyze = this.config.applyToSnippetsOnly ? result.snippet : (result.snippet || '');
    
    // Skip analysis if text is too short
    if (!textToAnalyze || textToAnalyze.length < this.config.minCharactersForAnalysis) {
      return {
        ...result,
        metadata: {
          ...result.metadata,
          readability: {
            score: null,
            level: 'unknown',
            analyzed: false,
            reason: 'insufficient content'
          }
        }
      };
    }

    // Calculate readability score
    const readabilityScore = this.calculateReadabilityScore(textToAnalyze);
    const readabilityLevel = this.getReadabilityLevel(readabilityScore);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        readability: {
          score: readabilityScore,
          level: readabilityLevel,
          analyzed: true,
          textLength: textToAnalyze.length,
          sentenceCount: this.countSentences(textToAnalyze),
          wordCount: this.countWords(textToAnalyze)
        }
      }
    };
  }

  /**
   * Process a batch of search results
   * Corrected return type to Promise<SearchResult[]>
   */
  async processBatch(results: SearchResult[]): Promise<SearchResult[]> {
    // Process each result individually using the existing process method
    const processedResults = await Promise.all(results.map(result => this.process(result)));
    return processedResults;
  }

  /**
   * Get module configuration
   */
  getConfig(): typeof ReadabilityModule.prototype.config {
    return this.config;
  }

  /**
   * Update module configuration
   */
  updateConfig(config: Partial<typeof ReadabilityModule.prototype.config>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Calculate readability score based on text complexity
   * Uses a simplified algorithm based on sentence length, word length, and syllable count
   */
  private calculateReadabilityScore(text: string): number {
    // Simplified implementation of flesch reading ease score
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const syllables = this.estimateSyllables(text);
    
    if (words === 0 || sentences === 0) return 0;
    
    // Simplified Flesch Reading Ease formula
    const wordsPerSentence = words / sentences;
    const syllablesPerWord = syllables / words;
    
    // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const readabilityScore = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    
    // Clamp score between 0-100
    return Math.max(0, Math.min(100, readabilityScore));
  }

  /**
   * Determine readability level based on score
   */
  private getReadabilityLevel(score: number): string {
    if (score >= this.config.scoreThresholds.easy) {
      return 'easy';
    } else if (score >= this.config.scoreThresholds.moderate) {
      return 'moderate';
    } else if (score >= this.config.scoreThresholds.difficult) {
      return 'difficult';
    } else {
      return 'very difficult';
    }
  }

  /**
   * Count sentences in text
   */
  private countSentences(text: string): number {
    // Simple sentence detection using common sentence terminators
    return (text.match(/[.!?]+\s/g) || []).length + 1;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return (text.match(/\b\w+\b/g) || []).length;
  }

  /**
   * Estimate syllable count in text
   */
  private estimateSyllables(text: string): number {
    // A very simplified syllable estimator
    // Count vowel groups as syllables
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let syllableCount = 0;
    
    for (const word of words) {
      // Count vowel groups in the word
      const vowelGroups = word.match(/[aeiouy]+/g) || [];
      let wordSyllables = vowelGroups.length;
      
      // Adjust for common patterns
      if (word.endsWith('e') && wordSyllables > 1) {
        wordSyllables--;
      }
      
      // Every word has at least one syllable
      syllableCount += Math.max(1, wordSyllables);
    }
    
    return syllableCount;
  }
} 