import { App } from 'obsidian';
import { MeilisearchService } from './meilisearch';
import { parseDocument } from './parser';
import { DocumentData, FileMetadata, IndexingProgress } from '../types';
import { generateHash } from '../utils/hash';
import { showNotice, showSuccess, showError } from '../utils/notifications';
import { METADATA_FILENAME } from '../settings';

export class IndexingService {
  private app: App;
  private meilisearchService: MeilisearchService;
  private fileMetadata: Map<string, FileMetadata> = new Map();
  private progressCallback?: (progress: IndexingProgress) => void;

  constructor(app: App, meilisearchService: MeilisearchService, progressCallback?: (progress: IndexingProgress) => void) {
    this.app = app;
    this.meilisearchService = meilisearchService;
    this.progressCallback = progressCallback;
  }

  /**
   * Load file metadata from disk
   */
  async loadMetadata(): Promise<void> {
    try {
      const adapter = this.app.vault.adapter;
      if (await adapter.exists(METADATA_FILENAME)) {
        const metadataContent = await adapter.read(METADATA_FILENAME);
        const metadataArray: FileMetadata[] = JSON.parse(metadataContent);
        
        this.fileMetadata = new Map();
        metadataArray.forEach(metadata => {
          this.fileMetadata.set(metadata.path, metadata);
        });
        
        console.log(`Loaded metadata for ${this.fileMetadata.size} files`);
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
      showError(`Failed to load metadata: ${error.message}`);
    }
  }

  /**
   * Save file metadata to disk
   */
  async saveMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.fileMetadata.values());
      const metadataContent = JSON.stringify(metadataArray, null, 2);
      
      const adapter = this.app.vault.adapter;
      await adapter.write(METADATA_FILENAME, metadataContent);
      
      console.log(`Saved metadata for ${metadataArray.length} files`);
    } catch (error) {
      console.error('Failed to save metadata:', error);
      showError(`Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Perform incremental indexing - only index new or modified files
   */
  async incrementalIndex(): Promise<void> {
    if (!this.meilisearchService.isInitialized()) {
      showError('Meilisearch is not initialized');
      return;
    }

    this.updateProgress({ total: 0, processed: 0, status: 'indexing' });
    showNotice('Starting incremental indexing...');

    try {
      const files = this.app.vault.getMarkdownFiles();
      this.updateProgress({ total: files.length, processed: 0, status: 'indexing' });

      const documentsToAdd: DocumentData[] = [];
      const documentsToUpdate: DocumentData[] = [];
      const filesToDelete: string[] = [];
      let processed = 0;

      for (const file of files) {
        this.updateProgress({ 
          total: files.length, 
          processed, 
          currentFile: file.path,
          status: 'indexing'
        });

        const content = await this.app.vault.cachedRead(file);
        const currentHash = generateHash(content);
        const existingMetadata = this.fileMetadata.get(file.path);

        if (!existingMetadata) {
          // New file
          const document = parseDocument(file, content);
          documentsToAdd.push(document);
          this.fileMetadata.set(file.path, {
            path: file.path,
            hash: currentHash,
            meilisearchId: document.id,
            indexedAt: Date.now(),
          });
        } else if (existingMetadata.hash !== currentHash) {
          // Modified file
          const document = parseDocument(file, content);
          documentsToUpdate.push(document);
          this.fileMetadata.set(file.path, {
            path: file.path,
            hash: currentHash,
            meilisearchId: document.id,
            indexedAt: Date.now(),
          });
        }

        processed++;
      }

      // Check for deleted files
      for (const [path, metadata] of this.fileMetadata) {
        const fileExists = files.some(f => f.path === path);
        if (!fileExists) {
          filesToDelete.push(metadata.meilisearchId);
          this.fileMetadata.delete(path);
        }
      }

      // Processes
      if (filesToDelete.length > 0) {
        showNotice(`Removing ${filesToDelete.length} deleted files from index...`);
        await this.meilisearchService.deleteDocuments(filesToDelete);
      }

      if (documentsToAdd.length > 0) {
        showNotice(`Adding ${documentsToAdd.length} new files to index...`);
        await this.meilisearchService.indexDocuments(documentsToAdd);
      }

      if (documentsToUpdate.length > 0) {
        showNotice(`Updating ${documentsToUpdate.length} modified files in index...`);
        await this.meilisearchService.indexDocuments(documentsToUpdate);
      }

      await this.saveMetadata();

      this.updateProgress({ 
        total: files.length, 
        processed: files.length, 
        status: 'idle'
      });

      showSuccess(`Indexing completed: ${documentsToAdd.length} added, ${documentsToUpdate.length} updated, ${filesToDelete.length} removed`);
    } catch (error) {
      console.error('Incremental indexing failed:', error);
      this.updateProgress({ 
        total: 0, 
        processed: 0, 
        status: 'error',
        error: error.message
      });
      showError(`Incremental indexing failed: ${error.message}`);
    }
  }

  /**
   * Perform full indexing - re-index all files
   */
  async fullIndex(): Promise<void> {
    if (!this.meilisearchService.isInitialized()) {
      showError('Meilisearch is not initialized');
      return;
    }

    this.updateProgress({ total: 0, processed: 0, status: 'indexing' });
    showNotice('Starting full indexing...');

    try {
      // Clear the existing index and metadata
      await this.meilisearchService.clearIndex();
      this.fileMetadata.clear();

      const files = this.app.vault.getMarkdownFiles();
      this.updateProgress({ total: files.length, processed: 0, status: 'indexing' });

      const documents: DocumentData[] = [];
      let processed = 0;

      for (const file of files) {
        this.updateProgress({ 
          total: files.length, 
          processed, 
          currentFile: file.path,
          status: 'indexing'
        });

        const content = await this.app.vault.cachedRead(file);
        const document = parseDocument(file, content);
        documents.push(document);

        // Update metadata
        this.fileMetadata.set(file.path, {
          path: file.path,
          hash: document.hash,
          meilisearchId: document.id,
          indexedAt: Date.now(),
        });

        processed++;
      }

      // Index all documents
      if (documents.length > 0) {
        showNotice(`Indexing ${documents.length} files...`);
        await this.meilisearchService.indexDocuments(documents);
      }

      await this.saveMetadata();

      this.updateProgress({ 
        total: files.length, 
        processed: files.length, 
        status: 'idle'
      });

      showSuccess(`Full indexing completed: ${documents.length} files indexed`);
    } catch (error) {
      console.error('Full indexing failed:', error);
      this.updateProgress({ 
        total: 0, 
        processed: 0, 
        status: 'error',
        error: error.message
      });
      showError(`Full indexing failed: ${error.message}`);
    }
  }

  /**
   * Update progress and notify callback if provided
   */
  private updateProgress(progress: IndexingProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}