import { MeilisearchSettings } from './types';

export const DEFAULT_SETTINGS: MeilisearchSettings = {
  host: 'http://localhost:7700',
  apiKey: '',
  indexName: 'obsidian-vault',
  autoIndexOnStartup: true,
};

export const METADATA_FILENAME = 'meilisearch-metadata.json';