export interface MeilisearchSettings {
  host: string;
  apiKey: string;
  indexName: string;
  autoIndexOnStartup: boolean;
}

export interface DocumentData {
  id: string;
  name: string;
  path: string;
  frontmatter: Record<string, any>;
  content: string;
  hash: string;
}

export interface FileMetadata {
  path: string;
  hash: string;
  meilisearchId: string;
  indexedAt: number;
}

export interface IndexingProgress {
  total: number;
  processed: number;
  currentFile?: string;
  status: 'idle' | 'indexing' | 'searching' | 'error';
  error?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  _rankingScore?: number;
  _formatted?: {
    name?: string;
    content?: string;
    frontmatter?: Record<string, any>;
  };
}