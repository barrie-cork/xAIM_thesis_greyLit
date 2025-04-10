import { SearchResult as BaseSearchResult } from '../../types';
import { EnrichmentModule } from '../types';

/**
 * Content type module configuration
 */
export interface ContentTypeModuleConfig {
  // Whether to use URL patterns to detect file types
  detectFromUrl: boolean;
  
  // Whether to use content snippets to detect content types
  detectFromSnippet: boolean;
  
  // Whether to extract publication dates if detected
  extractDates: boolean;
  
  // Whether to identify academic content
  identifyAcademic: boolean;
  
  // Whether to detect languages
  detectLanguage: boolean;
  
  // Whether to identify organization types
  identifyOrganizationType: boolean;
}

/**
 * Default module configuration
 */
const DEFAULT_CONFIG: ContentTypeModuleConfig = {
  detectFromUrl: true,
  detectFromSnippet: true,
  extractDates: true,
  identifyAcademic: true,
  detectLanguage: true,
  identifyOrganizationType: true
};

/**
 * Content type metadata structure
 */
export interface ContentTypeMetadata {
  calculatedAt: Date;
  fileType?: string;
  contentType?: string;
  isAcademic?: boolean;
  publicationDate?: Date;
  publicationYear?: number;
  language?: string;
  organizationType?: OrganizationType;
  confidence: {
    fileType?: number;
    contentType?: number;
    isAcademic?: number;
    publicationDate?: number;
    language?: number;
    organizationType?: number;
  };
}

/**
 * Organization types for content classification
 */
export enum OrganizationType {
  ACADEMIC = 'academic',
  GOVERNMENT = 'government',
  HEALTHCARE = 'healthcare',
  COMMERCIAL = 'commercial',
  NONPROFIT = 'nonprofit',
  NEWS = 'news',
  BLOG = 'blog',
  UNKNOWN = 'unknown'
}

/**
 * File types that can be detected from URLs
 */
const FILE_TYPE_EXTENSIONS: Record<string, string[]> = {
  PDF: ['.pdf'],
  WORD: ['.doc', '.docx'],
  EXCEL: ['.xls', '.xlsx'],
  POWERPOINT: ['.ppt', '.pptx'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
  VIDEO: ['.mp4', '.mov', '.avi', '.wmv', '.webm'],
  AUDIO: ['.mp3', '.wav', '.ogg', '.aac'],
  HTML: ['.html', '.htm'],
  TEXT: ['.txt', '.md', '.rtf'],
  XML: ['.xml'],
  JSON: ['.json'],
  ARCHIVE: ['.zip', '.rar', '.tar', '.gz', '.7z']
};

/**
 * Content types that can be detected from URLs and snippets
 */
const CONTENT_TYPE_PATTERNS: Record<string, { urlPatterns: RegExp[], snippetPatterns: RegExp[] }> = {
  RESEARCH_PAPER: {
    urlPatterns: [
      /\/doi\//i,
      /\/abs\//i,
      /\/article\//i,
      /\/(pdf|pdfx)$/i,
      /research|paper|journal|study|publication/i
    ],
    snippetPatterns: [
      /abstract|conclusion|methodology|doi:|cited by|references|\d+\s*citations/i,
      /published in|volume|issue|pages|journal of|research in/i
    ]
  },
  CLINICAL_GUIDELINE: {
    urlPatterns: [
      /guideline|recommendation|standard|protocol|clinical|medical/i,
      /\/guidelines?\/|\/recommendations?\/|\/standards?\//i
    ],
    snippetPatterns: [
      /clinical guideline|practice guideline|recommendation|standard of care/i,
      /treatment protocol|clinical protocol|care pathway|best practice/i
    ]
  },
  GOVERNMENT_REPORT: {
    urlPatterns: [
      /\.gov\//,
      /\/report\/|\/reports\/|\/publication\/|\/documents\//i,
      /government|agency|department|ministry|commission|authority/i
    ],
    snippetPatterns: [
      /official report|government publication|public document|whitepaper/i,
      /agency|department|ministry|commission|federal|state|policy/i
    ]
  },
  CASE_STUDY: {
    urlPatterns: [
      /case[-\s]?study|case[-\s]?report|case[-\s]?series/i
    ],
    snippetPatterns: [
      /case study|case report|case series|case presentation|patient case/i,
      /year-old|presented with|diagnosed with|treatment of|follow-up/i
    ]
  },
  NEWS_ARTICLE: {
    urlPatterns: [
      /news|article|press|release|story/i,
      /\/\d{4}\/\d{1,2}\/\d{1,2}\//
    ],
    snippetPatterns: [
      /published on|posted on|by reporter|news|article|today|yesterday/i,
      /according to|reports?|announced|stated|disclosed|revealed/i
    ]
  },
  BLOG_POST: {
    urlPatterns: [
      /blog|post|article/i
    ],
    snippetPatterns: [
      /blog post|posted by|written by|author|comment|opinion/i
    ]
  }
};

/**
 * Language detection patterns (simplified, not comprehensive)
 */
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  ENGLISH: [/\b(the|and|in|to|of|a|for|is|that|this|you|are)\b/i],
  SPANISH: [/\b(el|la|los|las|de|en|y|por|que|es|con|para)\b/i],
  FRENCH: [/\b(le|la|les|des|en|du|un|une|et|pour|est|dans)\b/i],
  GERMAN: [/\b(der|die|das|und|in|zu|den|für|ist|auf|dem|von)\b/i]
};

/**
 * Organization type detection patterns
 */
const ORG_TYPE_PATTERNS: Record<OrganizationType, { urlPatterns: RegExp[], snippetPatterns: RegExp[] }> = {
  [OrganizationType.ACADEMIC]: {
    urlPatterns: [/\.edu|\.ac\.|university|college|academy|institute|school/i],
    snippetPatterns: [/university|college|faculty|professor|student|academic|research/i]
  },
  [OrganizationType.GOVERNMENT]: {
    urlPatterns: [/\.gov|government|agency|department|ministry|commission|authority/i],
    snippetPatterns: [/government|agency|department|ministry|federal|state|policy|regulation|law/i]
  },
  [OrganizationType.HEALTHCARE]: {
    urlPatterns: [/hospital|clinic|medical|health|care|patient|doctor|physician/i],
    snippetPatterns: [/hospital|clinic|patient|doctor|medical|health|care|treatment|diagnosis/i]
  },
  [OrganizationType.COMMERCIAL]: {
    urlPatterns: [/\.com|company|business|corporate|enterprise|industry|product|service/i],
    snippetPatterns: [/company|business|product|service|market|customer|price|commercial|industry/i]
  },
  [OrganizationType.NONPROFIT]: {
    urlPatterns: [/\.org|nonprofit|non-profit|organization|foundation|charity|association/i],
    snippetPatterns: [/nonprofit|non-profit|organization|foundation|charity|donation|volunteer/i]
  },
  [OrganizationType.NEWS]: {
    urlPatterns: [/news|times|herald|post|gazette|journal|tribune|daily|weekly/i],
    snippetPatterns: [/reported|journalist|article|news|story|editor|press|media|publication/i]
  },
  [OrganizationType.BLOG]: {
    urlPatterns: [/blog|wordpress|blogger|medium|post|article/i],
    snippetPatterns: [/blog|post|author|comment|opinion|my thoughts|personal/i]
  },
  [OrganizationType.UNKNOWN]: {
    urlPatterns: [/.*/],
    snippetPatterns: [/.*/]
  }
};

/**
 * Date patterns for extraction (simplified)
 */
const DATE_PATTERNS = [
  // ISO format: 2023-01-15
  { regex: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, confidence: 0.9 },
  
  // Month name format: January 15, 2023
  { regex: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\b/i, confidence: 0.8 },
  
  // Short month format: Jan 15, 2023
  { regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\b/i, confidence: 0.8 },
  
  // Published/Posted format: Published on 15/01/2023
  { regex: /\b(?:published|posted|updated)\s+on\s+(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/i, confidence: 0.7 },
  
  // Year only: 2023
  { regex: /\b(20\d{2})\b/, confidence: 0.3 }
];

/**
 * Module that detects content types, file formats, and other metadata from search results
 */
export class ContentTypeModule implements EnrichmentModule {
  readonly id: string = 'content-type';
  readonly name: string = 'Content Type Detector';
  readonly description: string = 'Detects file types, content types, and other metadata from search results';
  readonly enabled: boolean = true;
  
  private config: ContentTypeModuleConfig;

  constructor(config?: Partial<ContentTypeModuleConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a single search result
   */
  async process(result: BaseSearchResult): Promise<BaseSearchResult> {
    const metadata: ContentTypeMetadata = {
      calculatedAt: new Date(),
      confidence: {}
    };
    
    // Detect file type from URL
    if (this.config.detectFromUrl && result.url) {
      const fileType = this.detectFileType(result.url);
      if (fileType) {
        metadata.fileType = fileType.type;
        metadata.confidence.fileType = fileType.confidence;
      }
    }
    
    // Detect content type from URL and snippet
    if ((this.config.detectFromUrl && result.url) || (this.config.detectFromSnippet && result.snippet)) {
      const contentType = this.detectContentType(result.url || '', result.snippet || '');
      if (contentType) {
        metadata.contentType = contentType.type;
        metadata.confidence.contentType = contentType.confidence;
      }
    }
    
    // Detect if academic content
    if (this.config.identifyAcademic && (result.url || result.snippet)) {
      const isAcademic = this.isAcademicContent(result.url || '', result.snippet || '');
      if (isAcademic) {
        metadata.isAcademic = isAcademic.value;
        metadata.confidence.isAcademic = isAcademic.confidence;
      }
    }
    
    // Extract publication date
    if (this.config.extractDates && (result.snippet || result.title)) {
      const date = this.extractPublicationDate(result.snippet || '', result.title || '');
      if (date) {
        metadata.publicationDate = date.date;
        metadata.publicationYear = date.date.getFullYear();
        metadata.confidence.publicationDate = date.confidence;
      }
    }
    
    // Detect language
    if (this.config.detectLanguage && (result.snippet || result.title)) {
      const language = this.detectLanguage(result.snippet || '', result.title || '');
      if (language) {
        metadata.language = language.language;
        metadata.confidence.language = language.confidence;
      }
    }
    
    // Identify organization type
    if (this.config.identifyOrganizationType && (result.url || result.snippet)) {
      const orgType = this.identifyOrganizationType(result.url || '', result.snippet || '');
      if (orgType) {
        metadata.organizationType = orgType.type;
        metadata.confidence.organizationType = orgType.confidence;
      }
    }
    
    // Create enriched result with content type metadata
    return {
      ...result,
      metadata: {
        ...result.metadata,
        contentType: metadata
      }
    };
  }

  /**
   * Process multiple search results in batch
   */
  async processBatch(results: BaseSearchResult[]): Promise<BaseSearchResult[]> {
    return Promise.all(results.map(result => this.process(result)));
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
  updateConfig(config: Partial<ContentTypeModuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Detect file type from a URL
   */
  private detectFileType(url: string): { type: string, confidence: number } | null {
    try {
      // Extract the path from the URL
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      
      // Check for file extensions
      for (const [type, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
        for (const ext of extensions) {
          if (path.endsWith(ext)) {
            return { type, confidence: 0.9 };
          }
        }
      }
      
      // Check for content type hints in the URL
      if (path.includes('pdf') || path.includes('document')) {
        return { type: 'PDF', confidence: 0.6 };
      }
      
      if (path.includes('presentation') || path.includes('slides')) {
        return { type: 'POWERPOINT', confidence: 0.6 };
      }
      
      if (path.includes('spreadsheet') || path.includes('excel')) {
        return { type: 'EXCEL', confidence: 0.6 };
      }
      
      // Default to HTML for web pages
      if (!path.includes('.')) {
        return { type: 'HTML', confidence: 0.5 };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect content type from URL and snippet
   */
  private detectContentType(url: string, snippet: string): { type: string, confidence: number } | null {
    let bestMatch: { type: string, confidence: number } | null = null;
    
    for (const [type, patterns] of Object.entries(CONTENT_TYPE_PATTERNS)) {
      let urlScore = 0;
      let snippetScore = 0;
      
      // Check URL patterns
      if (url) {
        for (const pattern of patterns.urlPatterns) {
          if (pattern.test(url)) {
            urlScore += 1;
          }
        }
      }
      
      // Check snippet patterns
      if (snippet) {
        for (const pattern of patterns.snippetPatterns) {
          if (pattern.test(snippet)) {
            snippetScore += 1;
          }
        }
      }
      
      // Calculate combined score and confidence
      const totalPatterns = patterns.urlPatterns.length + patterns.snippetPatterns.length;
      const score = urlScore + snippetScore;
      
      if (score > 0) {
        const confidence = Math.min(0.9, score / totalPatterns * 0.9 + 0.1);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type, confidence };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Determine if content is academic
   */
  private isAcademicContent(url: string, snippet: string): { value: boolean, confidence: number } | null {
    // Academic URL patterns
    const academicUrlPatterns = [
      /\.edu\//i,
      /\.ac\.(uk|jp|nz|au|in)\//i,
      /\/doi\//i,
      /\/article\//i,
      /\/abs\//i,
      /\/publication\//i,
      /\/journals?\//i,
      /\/proceedings\//i,
      /\/conference\//i,
      /\/papers?\//i,
      /\/research\//i
    ];
    
    // Academic snippet patterns
    const academicSnippetPatterns = [
      /abstract|methodology|conclusion|references|bibliography/i,
      /doi:|cited by|citations?|et al\./i,
      /journal of|university|professor|researcher|academic|study|published in/i,
      /volume \d+|issue \d+|pp\. \d+(-\d+)?/i
    ];
    
    let urlScore = 0;
    let snippetScore = 0;
    
    // Check URL patterns
    if (url) {
      for (const pattern of academicUrlPatterns) {
        if (pattern.test(url)) {
          urlScore += 1;
        }
      }
    }
    
    // Check snippet patterns
    if (snippet) {
      for (const pattern of academicSnippetPatterns) {
        if (pattern.test(snippet)) {
          snippetScore += 1;
        }
      }
    }
    
    // Calculate combined score and confidence
    const totalPatterns = academicUrlPatterns.length + academicSnippetPatterns.length;
    const score = urlScore + snippetScore;
    
    if (score > 0) {
      const confidence = Math.min(0.9, score / totalPatterns * 0.9 + 0.1);
      const isAcademic = score >= 2; // Require at least 2 matches to classify as academic
      
      return { value: isAcademic, confidence };
    }
    
    return null;
  }

  /**
   * Extract publication date from text
   */
  private extractPublicationDate(snippet: string, title: string): { date: Date, confidence: number } | null {
    const text = `${title} ${snippet}`;
    
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern.regex);
      
      if (match) {
        try {
          let date: Date;
          
          if (match.length === 2) {
            // Year only
            date = new Date(parseInt(match[1]), 0, 1);
          } else if (match.length === 4) {
            if (/^\d{4}$/.test(match[1])) {
              // ISO format: 2023-01-15
              date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
              // Month name format
              const months = {
                january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
                may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8,
                october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
              };
              
              const monthName = match[1].toLowerCase();
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              
              date = new Date(year, months[monthName as keyof typeof months], day);
            }
          } else {
            // Published/Posted format
            const firstPart = parseInt(match[1]);
            const secondPart = parseInt(match[2]);
            const yearPart = parseInt(match[3]);
            
            // Determine if DD/MM/YYYY or MM/DD/YYYY format
            // Assume MM/DD/YYYY if first part <= 12
            if (firstPart <= 12) {
              date = new Date(yearPart, firstPart - 1, secondPart);
            } else {
              date = new Date(yearPart, secondPart - 1, firstPart);
            }
          }
          
          // Validate the date
          if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= new Date().getFullYear()) {
            return { date, confidence: pattern.confidence };
          }
        } catch (error) {
          // Invalid date format, continue to next pattern
        }
      }
    }
    
    return null;
  }

  /**
   * Detect language from text (simplified implementation)
   */
  private detectLanguage(snippet: string, title: string): { language: string, confidence: number } | null {
    const text = `${title} ${snippet}`;
    let bestMatch: { language: string, confidence: number } | null = null;
    
    for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matches = 0;
      
      for (const pattern of patterns) {
        const matchCount = (text.match(pattern) || []).length;
        matches += matchCount;
      }
      
      if (matches > 0) {
        // Calculate confidence based on number of matches
        const confidence = Math.min(0.9, matches / 10 * 0.8 + 0.1);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { language, confidence };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Identify organization type from URL and snippet
   */
  private identifyOrganizationType(url: string, snippet: string): { type: OrganizationType, confidence: number } | null {
    let bestMatch: { type: OrganizationType, confidence: number } | null = null;
    
    for (const [type, patterns] of Object.entries(ORG_TYPE_PATTERNS)) {
      let urlScore = 0;
      let snippetScore = 0;
      
      // Check URL patterns
      if (url && type !== OrganizationType.UNKNOWN) {
        for (const pattern of patterns.urlPatterns) {
          if (pattern.test(url)) {
            urlScore += 1;
          }
        }
      }
      
      // Check snippet patterns
      if (snippet && type !== OrganizationType.UNKNOWN) {
        for (const pattern of patterns.snippetPatterns) {
          if (pattern.test(snippet)) {
            snippetScore += 1;
          }
        }
      }
      
      // Calculate combined score and confidence
      const totalPatterns = patterns.urlPatterns.length + patterns.snippetPatterns.length;
      const score = urlScore + snippetScore;
      
      if (score > 0) {
        const confidence = Math.min(0.9, score / totalPatterns * 0.9 + 0.1);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { type: type as OrganizationType, confidence };
        }
      }
    }
    
    // Default to unknown if no match found
    if (!bestMatch) {
      bestMatch = { type: OrganizationType.UNKNOWN, confidence: 0.1 };
    }
    
    return bestMatch;
  }
} 