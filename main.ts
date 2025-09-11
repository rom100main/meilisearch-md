import { App, Plugin, TFile } from 'obsidian';
import { MeilisearchService } from './src/services/meilisearch';
import { IndexingService } from './src/services/indexing';
import { SearchModal } from './src/modals/search-modal';
import { MeilisearchSettingTab } from './src/settings/ui';
import { MeilisearchSettings, IndexingProgress } from './src/types';
import { DEFAULT_SETTINGS } from './src/settings';
import { showNotice, showError, showSuccess } from './src/utils/notifications';

export default class MeilisearchPlugin extends Plugin {
  settings: MeilisearchSettings;
  meilisearchService: MeilisearchService;
  indexingService: IndexingService;
  indexingProgress: IndexingProgress = {
    total: 0,
    processed: 0,
    status: 'idle',
  };

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.meilisearchService = new MeilisearchService(
      this.settings,
      (progress: IndexingProgress) => {
        this.indexingProgress = progress;
      }
    );

    this.indexingService = new IndexingService(
      this.app,
      this.meilisearchService,
      (progress: IndexingProgress) => {
        this.indexingProgress = progress;
      }
    );

    // Initialize Meilisearch connection
    await this.initializeMeilisearch();

    // Register commands
    this.addCommands();

    // Register settings tab
    this.addSettingTab(new MeilisearchSettingTab(this.app, this));

    // Auto-index on startup if enabled
    if (this.settings.autoIndexOnStartup) {
      await this.autoIndex();
    }

    // Register file event handlers for real-time indexing
    this.registerFileHandlers();
  }

  onunload() {
    // Cleanup will be handled automatically by Obsidian
    console.log('Meilisearch plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update Meilisearch service with new settings
    if (this.meilisearchService) {
      this.meilisearchService.updateSettings(this.settings);
    }
  }

  /**
   * Initialize Meilisearch connection
   */
  private async initializeMeilisearch(): Promise<void> {
    try {
      const success = await this.meilisearchService.initialize();
      if (!success) {
        showError('Failed to initialize Meilisearch. Check your settings.');
      }
    } catch (error) {
      console.error('Failed to initialize Meilisearch:', error);
      showError(`Failed to initialize Meilisearch: ${error.message}`);
    }
  }

  /**
   * Register plugin commands
   */
  private addCommands(): void {
    // Search command
    this.addCommand({
      id: 'meilisearch-search',
      name: 'Search with Meilisearch',
      callback: () => {
        this.openSearchModal();
      },
    });

    // Force re-index command
    this.addCommand({
      id: 'meilisearch-force-reindex',
      name: 'Force re-index with Meilisearch',
      callback: async () => {
        try {
          await this.forceReindex();
        } catch (error) {
          showError(`Force re-index failed: ${error.message}`);
        }
      },
    });

    // Test connection command
    this.addCommand({
      id: 'meilisearch-test-connection',
      name: 'Test Meilisearch connection',
      callback: async () => {
        try {
          const success = await this.testConnection();
          if (success) {
            showSuccess('Connection to Meilisearch successful!');
          } else {
            showError('Failed to connect to Meilisearch. Check your settings.');
          }
        } catch (error) {
          showError(`Connection test failed: ${error.message}`);
        }
      },
    });
  }

  /**
   * Register file event handlers for real-time indexing
   */
  private registerFileHandlers(): void {
    // Handle file creation
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === 'md') {
          // Add a small delay to ensure the file is fully written
          setTimeout(async () => {
            try {
              const content = await this.app.vault.read(file);
              await this.indexFile(file, content);
            } catch (error) {
              console.error('Failed to index new file:', error);
            }
          }, 500);
        }
      })
    );

    // Handle file modification
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === 'md') {
          try {
            const content = await this.app.vault.read(file);
            await this.indexFile(file, content);
          } catch (error) {
            console.error('Failed to index modified file:', error);
          }
        }
      })
    );

    // Handle file deletion
    this.registerEvent(
      this.app.vault.on('delete', async (file) => {
        if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === 'md') {
          try {
            await this.removeFromIndex(file);
          } catch (error) {
            console.error('Failed to remove file from index:', error);
          }
        }
      })
    );
  }

  /**
   * Auto-index on startup
   */
  private async autoIndex(): Promise<void> {
    try {
      // Load metadata first
      await this.indexingService.loadMetadata();
      
      // Perform incremental indexing
      await this.indexingService.incrementalIndex();
    } catch (error) {
      console.error('Auto-indexing failed:', error);
      showError(`Auto-indexing failed: ${error.message}`);
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(file: any, content: string): Promise<void> {
    try {
      // Parse the document
      const { parseDocument } = await import('./src/services/parser');
      const document = parseDocument(file, content);
      
      // Index the document
      await this.meilisearchService.indexDocuments([document]);
      
      console.log(`Indexed file: ${file.path}`);
    } catch (error) {
      console.error(`Failed to index file ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Remove a file from the index
   */
  private async removeFromIndex(file: any): Promise<void> {
    try {
      await this.meilisearchService.deleteDocuments([file.path]);
      console.log(`Removed file from index: ${file.path}`);
    } catch (error) {
      console.error(`Failed to remove file from index ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Open the search modal
   */
  openSearchModal(): void {
    if (!this.meilisearchService.isInitialized()) {
      showError('Meilisearch is not initialized. Check your settings.');
      return;
    }

    new SearchModal(this.app, this.meilisearchService).open();
  }

  /**
   * Force re-index all files
   */
  async forceReindex(): Promise<void> {
    if (!this.meilisearchService.isInitialized()) {
      throw new Error('Meilisearch is not initialized');
    }

    try {
      await this.indexingService.fullIndex();
    } catch (error) {
      console.error('Force re-index failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Meilisearch
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.meilisearchService.initialize();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current indexing status
   */
  getIndexingStatus(): string {
    const { status, total, processed } = this.indexingProgress;
    
    if (status === 'idle') {
      return 'Idle';
    } else if (status === 'indexing') {
      return `Indexing (${processed}/${total})`;
    } else if (status === 'error') {
      return `Error: ${this.indexingProgress.error || 'Unknown error'}`;
    } else {
      return status;
    }
  }
}