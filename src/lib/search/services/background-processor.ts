import { DeduplicationService } from './deduplication-service';
import { StorageService } from './storage-service';
import { DeduplicationOptions } from '../utils/deduplication';

/**
 * Background processor for handling asynchronous search result processing
 */
export class BackgroundProcessor {
  private storageService: StorageService;
  private deduplicationService: DeduplicationService;
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];
  private defaultOptions: DeduplicationOptions;

  constructor(
    storageService: StorageService,
    options?: DeduplicationOptions
  ) {
    this.storageService = storageService;
    this.deduplicationService = new DeduplicationService(storageService, options);
    this.defaultOptions = {
      titleSimilarityThreshold: 0.85,
      strictUrlMatching: false,
      ignoredDomains: [],
      ...options
    };
  }

  /**
   * Queue a search request for processing
   * @param searchRequestId The ID of the search request to process
   * @returns True if the request was queued, false if it was already in the queue
   */
  queueForProcessing(searchRequestId: string): boolean {
    if (this.processingQueue.includes(searchRequestId)) {
      return false;
    }

    this.processingQueue.push(searchRequestId);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextInQueue();
    }
    
    return true;
  }

  /**
   * Process the next search request in the queue
   */
  private async processNextInQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const searchRequestId = this.processingQueue.shift()!;

    try {
      // Process the search request
      const result = await this.deduplicationService.processRawResults(
        searchRequestId,
        this.defaultOptions
      );
      
      console.log(`Processed search request ${searchRequestId}:`, result);
    } catch (error) {
      console.error(`Error processing search request ${searchRequestId}:`, error);
    }

    // Process the next request in the queue
    this.processNextInQueue();
  }

  /**
   * Get the current processing status
   * @returns The current processing status
   */
  getStatus(): {
    isProcessing: boolean;
    queueLength: number;
    currentlyProcessing?: string;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      currentlyProcessing: this.isProcessing && this.processingQueue.length > 0
        ? this.processingQueue[0]
        : undefined
    };
  }

  /**
   * Process a specific search request immediately
   * @param searchRequestId The ID of the search request to process
   * @param options Optional deduplication options
   * @returns The processing result
   */
  async processImmediately(
    searchRequestId: string,
    options?: DeduplicationOptions
  ): Promise<{
    totalProcessed: number;
    uniqueResults: number;
    duplicatesFound: number;
    processingTime: number;
  }> {
    return this.deduplicationService.processRawResults(
      searchRequestId,
      options || this.defaultOptions
    );
  }
}
