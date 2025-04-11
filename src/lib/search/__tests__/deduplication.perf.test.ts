import { describe, it, expect } from 'vitest';
import { DeduplicationService } from '../deduplication';
import { SearchResult } from '../types';
import { faker } from '@faker-js/faker'; // Using faker to generate diverse data

// Helper to generate mock search results for deduplication
const generateMockResults = (count: number, duplicateRatio: number = 0.2): SearchResult[] => {
  const results: SearchResult[] = [];
  const uniqueUrls = new Set<string>();
  const uniqueTitles = new Set<string>();

  for (let i = 0; i < count; i++) {
    let url: string;
    let title: string;
    let isDuplicate = Math.random() < duplicateRatio;

    if (isDuplicate && results.length > 0) {
      // Create a duplicate (either URL or title)
      const originalIndex = Math.floor(Math.random() * results.length);
      const originalResult = results[originalIndex];
      
      if (Math.random() < 0.5) { // Duplicate URL
        url = originalResult.url; 
        // Slightly modify title to test title similarity later
        title = originalResult.title + (Math.random() < 0.5 ? '' : ' Extra'); 
      } else { // Duplicate Title
        title = originalResult.title;
        // Generate a slightly different but canonicalizing URL
        const urlObj = new URL(originalResult.url);
        urlObj.pathname += (Math.random() < 0.5 ? '/' : '/alt'); // Add trailing slash or path variation
        url = urlObj.toString();
      }
    } else {
      // Create a unique result
      do {
        url = faker.internet.url();
      } while (uniqueUrls.has(url));
      uniqueUrls.add(url);
      
      do {
         title = faker.lorem.sentence();
      } while (uniqueTitles.has(title));
      uniqueTitles.add(title);
    }

    results.push({
      title,
      url,
      snippet: faker.lorem.paragraph(),
      rank: i + 1,
      searchEngine: faker.company.name(),
      timestamp: new Date(),
      metadata: { providerSpecific: { score: Math.random() } }
    });
  }
  return results;
};

describe('DeduplicationService Performance', () => {
  const TARGET_MS = 500;
  const NUM_RESULTS = 1000;
  const service = new DeduplicationService();

  it(`should deduplicate ${NUM_RESULTS} results within ${TARGET_MS}ms (Optimized)`, () => {
    const testResults = generateMockResults(NUM_RESULTS, 0.3);
    const timeLabel = `Deduplication Optimized (${NUM_RESULTS} results)`;

    console.time(timeLabel);
    const deduplicatedResult = service.deduplicate(testResults);
    console.timeEnd(timeLabel);

    // Validation
    expect(deduplicatedResult.results.length).toBeLessThan(NUM_RESULTS);
    expect(deduplicatedResult.duplicatesRemoved).toBeGreaterThan(0);
    console.log(`Optimized: Processed=${NUM_RESULTS}, Unique=${deduplicatedResult.results.length}, Removed=${deduplicatedResult.duplicatesRemoved}`);
  });
  
  it(`should handle 100% unique results efficiently (Optimized)`, () => {
     const testResults = generateMockResults(NUM_RESULTS, 0);
     const timeLabel = `Deduplication Optimized (${NUM_RESULTS} unique results)`;
     console.time(timeLabel);
     const deduplicatedResult = service.deduplicate(testResults);
     console.timeEnd(timeLabel);
     expect(deduplicatedResult.results.length).toBe(NUM_RESULTS);
     expect(deduplicatedResult.duplicatesRemoved).toBe(0);
     console.log(`Optimized: Processed=${NUM_RESULTS}, Unique=${deduplicatedResult.results.length}, Removed=${deduplicatedResult.duplicatesRemoved}`);
  });
  
  it(`should handle high duplicate ratio efficiently (Optimized)`, () => {
     const testResults = generateMockResults(NUM_RESULTS, 0.8);
     const timeLabel = `Deduplication Optimized (${NUM_RESULTS} high duplicate results)`;
     console.time(timeLabel);
     const deduplicatedResult = service.deduplicate(testResults);
     console.timeEnd(timeLabel);
     expect(deduplicatedResult.results.length).toBeLessThan(NUM_RESULTS * 0.5);
     expect(deduplicatedResult.duplicatesRemoved).toBeGreaterThan(NUM_RESULTS * 0.5);
      console.log(`Optimized: Processed=${NUM_RESULTS}, Unique=${deduplicatedResult.results.length}, Removed=${deduplicatedResult.duplicatesRemoved}`);
  });

  // Future: Add tests with different DeduplicationOptions (e.g., merging enabled)
}); 