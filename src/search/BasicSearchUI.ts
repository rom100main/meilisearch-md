import { MarkdownRenderer, Setting } from 'obsidian';
import type { SearchResultDatum, SearchUIProps } from './SearchController';
import type { SearchUI } from './SearchController';

export class BasicSearchUI implements SearchUI {
  private inputEl?: HTMLInputElement;
  private resultsContainerEl?: HTMLElement;
  private results: SearchResultDatum[] = [];
  private selectedIndex: number = -1;
  private props?: SearchUIProps;

  create(props: SearchUIProps): void {
    this.props = props;
    const { targetEl } = props;

    const inputContainer = targetEl.createDiv({ cls: 'meilisearch-input-container' });
    this.inputEl = inputContainer.createEl('input', {
      type: 'text',
      cls: 'meilisearch-input',
      placeholder: 'Search your vault...',
    });

    this.resultsContainerEl = targetEl.createDiv({ cls: 'meilisearch-results-container' });

    this.setupEventListeners();

    this.inputEl.focus();
  }

  private setupEventListeners(): void {
    if (!this.inputEl || !this.props) return;

    // Input event for search
    this.inputEl.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.props?.search(query);
    });

    // Key events for navigation
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevious();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectCurrent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.props?.onCancel();
      }
    });
  }

  onSearchResults(results: SearchResultDatum[]): void {
    this.results = results;
    this.selectedIndex = -1;
    this.renderResults();
  }

  private getScoreColor(score: number): string {
    // Calculate RGB values for gradient from red (0%) to green (100%)
    // Red: (255, 0, 0) -> Green: (0, 255, 0)
    const red = Math.round(255 * (1 - score));
    const green = Math.round(255 * score);
    return `rgb(${red}, ${green}, 0)`;
  }

  private renderResults(): void {
    if (!this.resultsContainerEl) return;

    this.resultsContainerEl.empty();

    if (this.results.length === 0) {
      this.resultsContainerEl.createDiv({
        cls: 'meilisearch-no-results',
        text: 'No results found',
      });
      return;
    }

    this.results.forEach((result, index) => {
      const resultEl = this.resultsContainerEl!.createDiv({
        cls: 'meilisearch-result' + (index === this.selectedIndex ? ' selected' : ''),
      });

      const headerEl = resultEl.createDiv({ cls: 'meilisearch-result-header' });

      const titleEl = headerEl.createDiv({ cls: 'meilisearch-result-title' });
      titleEl.setText(result.data.name);

      // Create ranking score element if available
      if (result.data._rankingScore !== undefined) {
        const scoreEl = headerEl.createDiv({ cls: 'meilisearch-result-score' });
        const scorePercentage = (result.data._rankingScore * 100).toFixed(2);
        scoreEl.setText(`${scorePercentage}%`);
        
        const scoreColor = this.getScoreColor(result.data._rankingScore);
        scoreEl.style.backgroundColor = scoreColor;
      }

      const pathEl = resultEl.createDiv({ cls: 'meilisearch-result-path' });
      pathEl.setText(result.data.path);

      // Create content preview element
      if (result.data.content) {
        const contentEl = resultEl.createDiv({ cls: 'meilisearch-result-content' });
        
        const maxContentLength = 150;
        let contentPreview = result.data.content.substring(0, maxContentLength);
        if (result.data.content.length > maxContentLength) {
          contentPreview += '...';
        }
        
        contentEl.setText(contentPreview);
      }

      resultEl.addEventListener('click', () => {
        this.selectedIndex = index;
        this.selectCurrent();
      });

      resultEl.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });
    });
  }

  private selectNext(): void {
    if (this.results.length === 0) return;
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
    this.updateSelection();
  }

  private selectPrevious(): void {
    if (this.results.length === 0) return;
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.updateSelection();
  }

  private selectCurrent(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      const result = this.results[this.selectedIndex];
      this.props?.onSubmit(result, []);
    }
  }

  private updateSelection(): void {
    if (!this.resultsContainerEl) return;

    const resultEls = this.resultsContainerEl.querySelectorAll('.meilisearch-result');
    resultEls.forEach((el, index) => {
      if (index === this.selectedIndex) {
        el.addClass('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.removeClass('selected');
      }
    });
  }

  destroy(): void {
    if (this.inputEl) {
      this.inputEl.removeEventListener('input', () => {});
      this.inputEl.removeEventListener('keydown', () => {});
    }
    this.resultsContainerEl?.empty();
  }
}