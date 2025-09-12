import type { Modifier, Scope } from "obsidian";
import type MeilisearchPlugin from "../../main";
import { SearchResult } from "../types";
import { MeilisearchService } from "../services/meilisearch";

export interface SearchUIProps {
    plugin: MeilisearchPlugin;
    targetEl: HTMLElement;
    scope: Scope;
    search: (s: string) => void;
    onSubmit: (path: string, modifiers: Modifier[]) => void;
    onCancel: () => void;
}

export interface SearchUI {
    create(props: SearchUIProps): void;
    onSearchResults(results: SearchResult[]): void;
    destroy(): void;
}

export class SearchController {
    plugin: MeilisearchPlugin;
    meilisearchService: MeilisearchService;
    targetEl?: HTMLElement;
    onSubmitCBs: ((path: string, modifiers: Modifier[]) => void)[];
    onCancelCBs: (() => void)[];
    ui: SearchUI;

    searchQuery: string = "";
    searchTimeout: number | null = null;
    isSearching: boolean = false;

    constructor(plugin: MeilisearchPlugin, meilisearchService: MeilisearchService, ui: SearchUI) {
        this.plugin = plugin;
        this.meilisearchService = meilisearchService;
        this.onSubmitCBs = [];
        this.onCancelCBs = [];
        this.ui = ui;
    }

    onSubmit(cb: (path: string, modifiers: Modifier[]) => void): void {
        this.onSubmitCBs.push(cb);
    }

    onCancel(cb: () => void): void {
        this.onCancelCBs.push(cb);
    }

    create(targetEl: HTMLElement, scope: Scope): void {
        this.targetEl = targetEl;
        this.ui.create({
            plugin: this.plugin,
            targetEl: this.targetEl,
            scope,
            search: (s: string) => this.search(s),
            onSubmit: (path: string, modifiers: Modifier[]) => {
                this.onSubmitCBs.forEach((cb) => cb(path, modifiers));
            },
            onCancel: () => {
                this.onCancelCBs.forEach((cb) => cb());
            },
        });
    }

    search(s: string): void {
        this.searchQuery = s;

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // If query empty, clear results
        if (!s.trim()) {
            this.ui.onSearchResults([]);
            return;
        }

        // Debounce search to avoid too many requests
        this.searchTimeout = window.setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    private async performSearch(): Promise<void> {
        if (!this.meilisearchService.isInitialized() || this.isSearching) {
            return;
        }

        this.isSearching = true;

        try {
            const result = await this.meilisearchService.search(this.searchQuery, {
                limit: 50,
                attributesToHighlight: ["name", "content"],
                attributesToCrop: ["content"],
                cropLength: 100,
                showRankingScore: true,
            });

            // Transform Meilisearch results to our format
            const searchResults: SearchResult[] = result.hits.map((hit: SearchResult) => {
                return {
                    id: hit.id,
                    name: hit.name,
                    path: hit.path,
                    content: hit.content,
                    frontmatter: hit.frontmatter || {},
                    _rankingScore: hit._rankingScore,
                    _formatted: hit._formatted,
                };
            });

            this.ui.onSearchResults(searchResults);
        } catch (error) {
            console.error("Search failed:", error);
            this.ui.onSearchResults([]);
        } finally {
            this.isSearching = false;
        }
    }

    destroy(): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        this.ui.destroy();
        this.targetEl?.empty();
    }
}
