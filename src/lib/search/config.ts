/**
 * Default search configuration
 */

import { SearchProviderType } from './types';

export const DEFAULT_SEARCH_CONFIG = {
  maxResults: 50,
  providers: [SearchProviderType.SERPER],
  fileTypes: [],
  domain: '',
  timeout: 30000, // 30 seconds
  retryCount: 3,
  retryDelay: 1000, // 1 second
};

export const SEARCH_PROVIDER_NAMES = {
  [SearchProviderType.SERPER]: 'Serper',
  [SearchProviderType.SERPAPI]: 'SerpAPI',
  [SearchProviderType.BING]: 'Bing',
  [SearchProviderType.DUCKDUCKGO]: 'DuckDuckGo',
};

export const SEARCH_PROVIDER_PRIORITIES = {
  [SearchProviderType.SERPER]: 1,
  [SearchProviderType.SERPAPI]: 2,
  [SearchProviderType.BING]: 3,
  [SearchProviderType.DUCKDUCKGO]: 4,
};
