import { Modal, TFile } from 'obsidian';
import type MeilisearchPlugin from '../../main';
import { SearchController } from '../search/SearchController';
import { BasicSearchUI } from '../search/BasicSearchUI';
import { MeilisearchService } from '../services/meilisearch';
import type { SearchDatum } from '../search/SearchController';
import type { Modifier } from 'obsidian';

export class SearchModal extends Modal {
  private searchController: SearchController;

  constructor(plugin: MeilisearchPlugin, meilisearchService: MeilisearchService) {
    super(plugin.app);

    // Create the search UI and controller
    const searchUI = new BasicSearchUI();
    this.searchController = new SearchController(
      plugin,
      meilisearchService,
      searchUI,
      { data: [] }
    );

    this.searchController.onSubmit((data: SearchDatum, modifiers: Modifier[]) => {
      this.handleResultSelected(data, modifiers);
    });

    this.searchController.onCancel(() => {
      this.close();
    });
  }

  onOpen(): void {
    super.onOpen();
    this.modalEl.addClass('meilisearch-search-modal'); // custom class for styling
    this.titleEl.remove(); // remove the default title
    this.searchController.create(this.contentEl, this.scope); // create the search UI
  }

  onClose(): void {
    this.searchController.destroy();
    this.contentEl.empty();
  }

  private handleResultSelected(data: SearchDatum, modifiers: Modifier[]): void {
    // Open the file in the current leaf or a new leaf if modifier is pressed
    const file = this.app.vault.getAbstractFileByPath(data.data.path);

    if (file && file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf(modifiers.includes('Mod'));
      leaf.openFile(file);
    }
    
    this.close();
  }
}