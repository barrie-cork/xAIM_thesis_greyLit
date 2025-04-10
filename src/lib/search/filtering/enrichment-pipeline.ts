import { SearchResult as BaseSearchResult } from '../types';
import { 
  EnrichmentModule, 
  EnrichmentResult, 
  PipelineOptions 
} from './types';

/**
 * Manages the enrichment pipeline for search results
 */
export class EnrichmentPipeline {
  private modules: Map<string, EnrichmentModule>;
  private moduleOrder: string[];
  private options: Required<PipelineOptions>;

  /**
   * Default pipeline options
   */
  private static DEFAULT_OPTIONS: Required<PipelineOptions> = {
    parallelProcessing: true,
    maxConcurrent: 5,
    timeoutMs: 30000,
    measurePerformance: true
  };

  constructor(options?: PipelineOptions) {
    this.modules = new Map();
    this.moduleOrder = [];
    this.options = { ...EnrichmentPipeline.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register an enrichment module
   * @param module The module to register
   * @param position Optional position in the pipeline (default: append to end)
   */
  registerModule(module: EnrichmentModule, position?: number): void {
    // Check if the module already exists
    if (this.modules.has(module.id)) {
      this.removeModule(module.id);
    }

    // Add the module
    this.modules.set(module.id, module);

    // Update the module order
    if (position !== undefined && position >= 0 && position <= this.moduleOrder.length) {
      this.moduleOrder.splice(position, 0, module.id);
    } else {
      this.moduleOrder.push(module.id);
    }
  }

  /**
   * Remove a module from the pipeline
   */
  removeModule(moduleId: string): boolean {
    if (!this.modules.has(moduleId)) {
      return false;
    }

    // Remove from modules map
    this.modules.delete(moduleId);

    // Remove from order array
    const index = this.moduleOrder.indexOf(moduleId);
    if (index !== -1) {
      this.moduleOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Get a module by ID
   */
  getModule(moduleId: string): EnrichmentModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): EnrichmentModule[] {
    return this.moduleOrder.map(id => this.modules.get(id)!);
  }

  /**
   * Process search results through the enrichment pipeline
   */
  async process(results: BaseSearchResult[]): Promise<EnrichmentResult> {
    // Skip if no results or no modules
    if (results.length === 0 || this.moduleOrder.length === 0) {
      return {
        results: [...results],
        metrics: {
          totalProcessed: results.length,
          totalEnriched: 0,
          moduleMetrics: {}
        }
      };
    }

    const startTime = Date.now();
    const enabledModules = this.moduleOrder
      .map(id => this.modules.get(id))
      .filter((mod): mod is EnrichmentModule => !!mod && mod.enabled);

    if (enabledModules.length === 0) {
      return {
        results: [...results],
        metrics: {
          totalProcessed: results.length,
          totalEnriched: 0,
          moduleMetrics: {}
        }
      };
    }

    const moduleMetrics: EnrichmentResult['metrics']['moduleMetrics'] = {};
    let processedResults = [...results];
    let totalEnriched = 0;

    // Process through each enabled module in order
    for (const module of enabledModules) {
      const moduleStartTime = Date.now();
      
      // Use batch processing if available, otherwise process one by one
      if (module.processBatch) {
        try {
          processedResults = await this.runWithTimeout(
            module.processBatch(processedResults),
            this.options.timeoutMs,
            `Module ${module.id} batch processing timed out after ${this.options.timeoutMs}ms`
          );
          
          // Update metrics
          if (this.options.measurePerformance) {
            moduleMetrics[module.id] = {
              moduleId: module.id,
              moduleName: module.name,
              processingTimeMs: Date.now() - moduleStartTime,
              itemsProcessed: processedResults.length
            };
          }
          
          totalEnriched += processedResults.length;
        } catch (error) {
          console.error(`Error in enrichment module ${module.id}:`, error);
          
          // Record metrics even on error
          if (this.options.measurePerformance) {
            moduleMetrics[module.id] = {
              moduleId: module.id,
              moduleName: module.name,
              processingTimeMs: Date.now() - moduleStartTime,
              itemsProcessed: 0
            };
          }
        }
      } else {
        // Process items individually
        if (this.options.parallelProcessing) {
          try {
            // Process in parallel with concurrency limit
            processedResults = await this.processInParallel(
              module,
              processedResults,
              this.options.maxConcurrent
            );
            
            // Update metrics
            if (this.options.measurePerformance) {
              moduleMetrics[module.id] = {
                moduleId: module.id,
                moduleName: module.name,
                processingTimeMs: Date.now() - moduleStartTime,
                itemsProcessed: processedResults.length
              };
            }
            
            totalEnriched += processedResults.length;
          } catch (error) {
            console.error(`Error in parallel processing for module ${module.id}:`, error);
            
            // Record metrics even on error
            if (this.options.measurePerformance) {
              moduleMetrics[module.id] = {
                moduleId: module.id,
                moduleName: module.name,
                processingTimeMs: Date.now() - moduleStartTime,
                itemsProcessed: 0
              };
            }
          }
        } else {
          // Sequential processing
          const newResults: BaseSearchResult[] = [];
          let itemsProcessed = 0;
          
          for (const result of processedResults) {
            try {
              const enrichedResult = await this.runWithTimeout(
                module.process(result),
                this.options.timeoutMs,
                `Module ${module.id} processing timed out after ${this.options.timeoutMs}ms`
              );
              
              newResults.push(enrichedResult);
              itemsProcessed++;
            } catch (error) {
              console.error(`Error processing item with module ${module.id}:`, error);
              
              // Keep the original result on error
              newResults.push(result);
            }
          }
          
          processedResults = newResults;
          
          // Update metrics
          if (this.options.measurePerformance) {
            moduleMetrics[module.id] = {
              moduleId: module.id,
              moduleName: module.name,
              processingTimeMs: Date.now() - moduleStartTime,
              itemsProcessed
            };
          }
          
          totalEnriched += itemsProcessed;
        }
      }
    }

    return {
      results: processedResults,
      metrics: {
        totalProcessed: results.length,
        totalEnriched,
        moduleMetrics
      }
    };
  }

  /**
   * Process items in parallel with a concurrency limit
   */
  private async processInParallel(
    module: EnrichmentModule,
    results: BaseSearchResult[],
    concurrency: number
  ): Promise<BaseSearchResult[]> {
    const processedResults: BaseSearchResult[] = new Array(results.length);
    const chunks = this.chunkArray(results, concurrency);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStartIndex = i * concurrency;
      
      // Process the current chunk in parallel
      const promises = chunk.map(async (result, index) => {
        try {
          const enriched = await this.runWithTimeout(
            module.process(result),
            this.options.timeoutMs,
            `Module ${module.id} processing timed out after ${this.options.timeoutMs}ms`
          );
          
          // Store the result in the correct position
          processedResults[chunkStartIndex + index] = enriched;
          return { success: true, index: chunkStartIndex + index };
        } catch (error) {
          console.error(`Error processing item ${chunkStartIndex + index} with module ${module.id}:`, error);
          
          // Keep the original result on error
          processedResults[chunkStartIndex + index] = result;
          return { success: false, index: chunkStartIndex + index };
        }
      });
      
      // Wait for the current chunk to complete before moving to the next
      await Promise.all(promises);
    }
    
    return processedResults;
  }

  /**
   * Split an array into chunks of the specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    
    return chunks;
  }

  /**
   * Run a promise with a timeout
   */
  private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      
      promise.then(
        result => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }

  /**
   * Update pipeline options
   */
  updateOptions(options: Partial<PipelineOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current pipeline options
   */
  getOptions(): Required<PipelineOptions> {
    return { ...this.options };
  }

  /**
   * Reorder modules in the pipeline
   */
  reorderModules(moduleIds: string[]): boolean {
    // Validate that all IDs exist
    const allExist = moduleIds.every(id => this.modules.has(id));
    
    if (!allExist) {
      return false;
    }
    
    // Validate that all modules are included
    if (new Set(moduleIds).size !== this.modules.size) {
      return false;
    }
    
    // Update the order
    this.moduleOrder = [...moduleIds];
    return true;
  }
} 