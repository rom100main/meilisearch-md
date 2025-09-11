import { Modal, TFile } from 'obsidian';
import type MeilisearchPlugin from '../../main';
import { SearchController } from '../search/SearchController';
import { BasicSearchUI } from '../search/BasicSearchUI';
import { MeilisearchService } from '../services/meilisearch';
import type { SearchDatum } from '../search/SearchController';
import type { Modifier } from 'obsidian';

export class SearchModal extends Modal {
  private plugin: MeilisearchPlugin;
  private meilisearchService: MeilisearchService;
  private searchController: SearchController;

  constructor(plugin: MeilisearchPlugin, meilisearchService: MeilisearchService) {
    super(plugin.app);
    this.plugin = plugin;
    this.meilisearchService = meilisearchService;

    // Create the search UI and controller
    const searchUI = new BasicSearchUI();
    this.searchController = new SearchController(
      plugin,
      meilisearchService,
      searchUI,
      { data: [] } // Initial empty data
    );

    // Set up callbacks
    this.searchController.onSubmit((data: SearchDatum, modifiers: Modifier[]) => {
      this.handleResultSelected(data, modifiers);
    });

    this.searchController.onCancel(() => {
      this.close();
    });
  }

  onOpen(): void {
    super.onOpen();
    
    // Add custom class for styling
    this.modalEl.addClass('meilisearch-search-modal');
    
    // Remove the default title
    this.titleEl.remove();
    
    // Create the search UI
    this.searchController.create(this.contentEl, this.scope);
  }

  onClose(): void {
    // Clean up the search controller
    this.searchController.destroy();
    
    // Clear the content
    this.contentEl.empty();
  }

  private handleResultSelected(data: SearchDatum, modifiers: Modifier[]): void {
    // Open the file in the current leaf or a new leaf if modifier is pressed
    const file = this.app.vault.getAbstractFileByPath(data.data.path);

    if (file && file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf(modifiers.includes('Mod'));
      leaf.openFile(file);
    }
    
    // Close the modal
    this.close();
  }
}