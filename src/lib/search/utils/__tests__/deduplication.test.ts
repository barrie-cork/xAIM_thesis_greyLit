import { 
  normalizeUrl, 
  calculateSimilarity, 
  levenshteinDistance, 
  deduplicateResults,
  DeduplicationOptions
} from '../deduplication';
import { SearchResult } from '../../types';

describe('URL Normalization', () => {
  test('handles basic URL normalization', () => {
    const url = 'https://www.example.com/path/to/page';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('example.com/path/to/page');
  });

  test('removes tracking parameters', () => {
    const url = 'https://example.com/product?id=123&utm_source=google&utm_medium=cpc';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('example.com/product?id=123');
  });

  test('sorts remaining query parameters alphabetically', () => {
    const url = 'https://example.com/search?category=books&query=typescript&page=2';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('example.com/search?category=books&page=2&query=typescript');
  });

  test('removes trailing slashes from paths', () => {
    const url = 'https://example.com/blog/2023/';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('example.com/blog/2023');
  });

  test('handles URLs with no path', () => {
    const url = 'https://example.com';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('example.com');
  });

  test('handles malformed URLs gracefully', () => {
    const url = 'not a valid url';
    const normalized = normalizeUrl(url);
    expect(normalized).toBe('not a valid url');
  });
});

describe('String Similarity Functions', () => {
  test('levenshteinDistance calculates correct distances', () => {
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('a', '')).toBe(1);
    expect(levenshteinDistance('', 'a')).toBe(1);
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('book', 'back')).toBe(2);
  });

  test('calculateSimilarity returns values between 0 and 1', () => {
    expect(calculateSimilarity('identical', 'identical')).toBe(1);
    expect(calculateSimilarity('', '')).toBe(1);
    expect(calculateSimilarity('a', '')).toBe(0);
    expect(calculateSimilarity('', 'a')).toBe(0);
    
    const kittenSimilarity = calculateSimilarity('kitten', 'sitting');
    expect(kittenSimilarity).toBeGreaterThan(0);
    expect(kittenSimilarity).toBeLessThan(1);
  });

  test('calculateSimilarity is symmetric', () => {
    const pairs = [
      ['hello', 'hallo'],
      ['JavaScript', 'TypeScript'],
      ['search result', 'search results']
    ];

    pairs.forEach(([a, b]) => {
      expect(calculateSimilarity(a, b)).toEqual(calculateSimilarity(b, a));
    });
  });
});

describe('Result Deduplication', () => {
  // Helper function to create test search results
  const createTestResult = (
    title: string, 
    url: string, 
    searchEngine = 'google'
  ): SearchResult => ({
    title,
    url,
    snippet: `Snippet for ${title}`,
    searchEngine,
    timestamp: new Date()
  });

  test('deduplicates exact URL matches', () => {
    const results: SearchResult[] = [
      createTestResult('Result 1', 'https://example.com/page1'),
      createTestResult('Different Title', 'https://example.com/page1'),
      createTestResult('Result 2', 'https://example.com/page2')
    ];

    const { uniqueResults, duplicateGroups } = deduplicateResults(results);
    
    expect(uniqueResults.length).toBe(2);
    expect(duplicateGroups.length).toBe(1);
    expect(duplicateGroups[0].kept.title).toBe('Result 1');
    expect(duplicateGroups[0].removed[0].result.title).toBe('Different Title');
    expect(duplicateGroups[0].removed[0].reason).toBe('url');
  });

  test('deduplicates based on title similarity', () => {
    const results: SearchResult[] = [
      createTestResult('JavaScript Tutorial', 'https://site1.com/js'),
      createTestResult('Javascript Tutorial', 'https://site2.com/javascript'),
      createTestResult('React Guide', 'https://site3.com/react')
    ];

    const { uniqueResults, duplicateGroups } = deduplicateResults(results);
    
    expect(uniqueResults.length).toBe(2);
    expect(duplicateGroups.length).toBe(1);
    expect(uniqueResults.some(r => r.title === 'React Guide')).toBe(true);
  });

  test('respects titleSimilarityThreshold option', () => {
    const results: SearchResult[] = [
      createTestResult('Programming Basics', 'https://site1.com/programming'),
      createTestResult('Programming 101', 'https://site2.com/programming101')
    ];

    // With default threshold (0.85), these should be considered different
    const resultWithDefaultThreshold = deduplicateResults(results);
    expect(resultWithDefaultThreshold.uniqueResults.length).toBe(2);
    
    // With lower threshold, they should be considered duplicates
    const options: DeduplicationOptions = { titleSimilarityThreshold: 0.5 };
    const resultWithLowerThreshold = deduplicateResults(results, options);
    expect(resultWithLowerThreshold.uniqueResults.length).toBe(1);
  });

  test('handles empty results array', () => {
    const { uniqueResults, duplicateGroups } = deduplicateResults([]);
    expect(uniqueResults).toEqual([]);
    expect(duplicateGroups).toEqual([]);
  });

  test('honors ignoredDomains option', () => {
    const results: SearchResult[] = [
      createTestResult('Trusted Result', 'https://trusted-domain.com/page'),
      createTestResult('Trusted Result', 'https://other-domain.com/page')
    ];

    const options: DeduplicationOptions = {
      ignoredDomains: ['trusted-domain.com']
    };

    const { uniqueResults } = deduplicateResults(results, options);
    
    // Both should be kept because one is from an ignored domain
    expect(uniqueResults.length).toBe(2);
  });

  test('strictUrlMatching option disables title-based deduplication', () => {
    const results: SearchResult[] = [
      createTestResult('Almost Identical Title', 'https://site1.com/page'),
      createTestResult('Almost Identical Titlé', 'https://site2.com/page')
    ];

    // Without strictUrlMatching, these should be considered duplicates
    const resultWithoutStrict = deduplicateResults(results);
    expect(resultWithoutStrict.uniqueResults.length).toBe(1);
    
    // With strictUrlMatching, they should be considered different
    const options: DeduplicationOptions = { strictUrlMatching: true };
    const resultWithStrict = deduplicateResults(results, options);
    expect(resultWithStrict.uniqueResults.length).toBe(2);
  });

  test('handles mixed duplicate types correctly', () => {
    const results: SearchResult[] = [
      createTestResult('Original Result', 'https://example.com/page'),
      createTestResult('Different Title', 'https://example.com/page'), // URL duplicate
      createTestResult('Original Result', 'https://different.com/page'), // Title duplicate
      createTestResult('Unique Result', 'https://unique.com/page') // Unique
    ];

    const { uniqueResults, duplicateGroups } = deduplicateResults(results);
    
    expect(uniqueResults.length).toBe(2);
    expect(uniqueResults[0].title).toBe('Original Result');
    expect(uniqueResults[1].title).toBe('Unique Result');
    
    expect(duplicateGroups.length).toBe(1);
    expect(duplicateGroups[0].removed.length).toBe(2);
  });
}); 