import { App, FuzzySuggestModal, FuzzyMatch, TFile } from 'obsidian';
import { MeilisearchService } from '../services/meilisearch';
import { SearchResult } from '../types';
import { renderResults } from 'obsidian';
import { showError } from '../utils/notifications';

export class SearchModal extends FuzzySuggestModal<SearchResult> {
  private meilisearchService: MeilisearchService;
  private searchResults: SearchResult[] = [];
  private currentQuery: string = '';

  constructor(app: App, meilisearchService: MeilisearchService) {
    super(app);
    this.meilisearchService = meilisearchService;
    
    // Set modal options
    this.setPlaceholder('Search your vault...');
    this.setInstructions([
      { command: '↑↓', purpose: 'Navigate' },
      { command: '↵', purpose: 'Open file' },
      { command: 'esc', purpose: 'Dismiss' },
    ]);
  }

  /**
   * Get items to search in - we'll override this to use Meilisearch
   */
  getItems(): SearchResult[] {
    return this.searchResults;
  }

  /**
   * Get the text to search against for each item
   */
  getItemText(item: SearchResult): string {
    return `${item.name} ${item.content}`;
  }

  /**
   * Render each suggestion item
   */
  renderSuggestion(match: FuzzyMatch<SearchResult>, el: HTMLElement): void {
    const item = match.item;
    
    // Create container for the suggestion
    const suggestionEl = el.createDiv({ cls: 'meilisearch-suggestion' });
    
    // Create title element
    const titleEl = suggestionEl.createDiv({ cls: 'meilisearch-suggestion-title' });
    if (item._formatted?.name) {
      // Use formatted text with highlights if available
      titleEl.innerHTML = item._formatted.name;
    } else {
      titleEl.setText(item.name);
    }
    
    // Create path element
    const pathEl = suggestionEl.createDiv({ cls: 'meilisearch-suggestion-path' });
    pathEl.setText(item.path);
    
    // Create content preview element
    if (item.content) {
      const contentEl = suggestionEl.createDiv({ cls: 'meilisearch-suggestion-content' });
      
      // Truncate content to a reasonable length
      const maxContentLength = 150;
      let contentPreview = item.content.substring(0, maxContentLength);
      if (item.content.length > maxContentLength) {
        contentPreview += '...';
      }
      
      if (item._formatted?.content) {
        // Use formatted text with highlights if available
        contentEl.innerHTML = contentPreview;
      } else {
        contentEl.setText(contentPreview);
      }
    }
  }

  /**
   * Handle when a suggestion is selected
   */
  onChooseItem(item: SearchResult, evt: MouseEvent | KeyboardEvent): void {
    // Open the file in the current leaf
    const file = this.app.vault.getAbstractFileByPath(item.path);
    
    if (file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf(false);
      leaf.openFile(file);
    } else {
      showError(`File not found: ${item.path}`);
    }
  }

  /**
   * Override the input event to perform Meilisearch search
   */
  onInput(): void {
    const query = this.inputEl.value.trim();
    
    // Only search if we have a query and Meilisearch is initialized
    if (query && this.meilisearchService.isInitialized()) {
      this.performSearch(query);
    } else {
      // Clear results if query is empty
      this.searchResults = [];
    }
  }

  /**
   * Perform search using Meilisearch
   */
  private async performSearch(query: string): Promise<void> {
    try {
      this.currentQuery = query;
      
      // Search with Meilisearch
      const result = await this.meilisearchService.search(query, {
        limit: 50,
        attributesToHighlight: ['name', 'content'],
        attributesToCrop: ['content'],
        cropLength: 100,
      });
      
      // Update search results
      this.searchResults = result.hits as SearchResult[];
    } catch (error) {
      console.error('Search failed:', error);
      showError(`Search failed: ${error.message}`);
      
      // Clear results on error
      this.searchResults = [];
    }
  }

  /**
   * Override onOpen to set initial focus
   */
  onOpen(): void {
    super.onOpen();
    this.inputEl.focus();
  }
}