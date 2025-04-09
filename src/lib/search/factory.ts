import { SearchProvider } from './provider';
import { SerperConfig, SerperProvider } from './providers/serper';
import { SerpApiConfig, SerpApiProvider } from './providers/serpapi';

/**
 * Available search provider types
 */
export enum SearchProviderType {
  SERPER = 'serper',
  SERPAPI = 'serpapi',
}

/**
 * Factory for creating search providers
 */
export class SearchProviderFactory {
  /**
   * Create a search provider
   */
  static createProvider(type: SearchProviderType, config: any): SearchProvider {
    switch (type) {
      case SearchProviderType.SERPER:
        return new SerperProvider(config as SerperConfig);
      
      case SearchProviderType.SERPAPI:
        return new SerpApiProvider(config as SerpApiConfig);
      
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
  
  /**
   * Create all available providers from configuration
   */
  static createAllProviders(config: {
    [key in SearchProviderType]?: any;
  }): Map<SearchProviderType, SearchProvider> {
    const providers = new Map<SearchProviderType, SearchProvider>();
    
    // Create each provider if config exists
    Object.values(SearchProviderType).forEach(type => {
      if (config[type]) {
        try {
          const provider = this.createProvider(type, config[type]);
          if (provider.isAvailable()) {
            providers.set(type, provider);
          }
        } catch (error) {
          console.error(`Failed to create provider ${type}:`, error);
        }
      }
    });
    
    return providers;
  }
} 