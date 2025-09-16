import { Plugin, TFile } from "obsidian";
import { MeilisearchService } from "./src/services/meilisearch";
import { IndexingService } from "./src/services/indexing";
import { SearchModal } from "./src/modals/SearchModal";
import { MeilisearchSettingTab } from "./src/settings/ui";
import { MeilisearchSettings, IndexingProgress } from "./src/types";
import { DEFAULT_SETTINGS } from "./src/settings";
import { showError } from "./src/utils/notifications";

export default class MeilisearchPlugin extends Plugin {
    settings: MeilisearchSettings;
    meilisearchService: MeilisearchService;
    indexingService: IndexingService;
    indexingProgress: IndexingProgress = {
        total: 0,
        processed: 0,
        status: "idle",
    };

    async onload() {
        await this.loadSettings();

        this.meilisearchService = new MeilisearchService(this.settings);
        await this.initializeMeilisearch();

        this.indexingService = new IndexingService(this.app, this.meilisearchService, (progress: IndexingProgress) => {
            this.indexingProgress = progress;
        });

        this.addCommands();

        this.addSettingTab(new MeilisearchSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(async () => {
            await this.indexingService.loadMetadata();

            if (this.settings.autoIndexOnStartup) {
                await this.autoIndex();
            }

            this.registerFileHandlers(); // for real-time indexing
        });
    }

    onunload() {
        // Cleanup if necessary
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

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
                showError("Failed to initialize Meilisearch");
            }
        } catch (error) {
            console.error("Failed to initialize Meilisearch:", error);
            showError(`Failed to initialize Meilisearch: ${error.message}`);
        }
    }

    /**
     * Register plugin commands
     */
    private addCommands(): void {
        this.addCommand({
            id: "meilisearch-search",
            name: "Search",
            callback: () => {
                this.openSearchModal();
            },
        });

        this.addCommand({
            id: "meilisearch-force-reindex",
            name: "Force re-index",
            callback: async () => {
                try {
                    await this.forceReindex();
                } catch (error) {
                    showError(`Force re-index failed: ${error.message}`);
                }
            },
        });

        this.addCommand({
            id: "meilisearch-test-connection",
            name: "Test connection",
            callback: async () => {
                try {
                    const success = await this.testConnection();
                    if (!success) {
                        showError("Failed to connect to Meilisearch");
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
        this.registerEvent(
            this.app.vault.on("create", async (file) => {
                if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === "md") {
                    setTimeout(async () => {
                        // ensure the file is fully written
                        try {
                            const content = await this.app.vault.read(file);
                            await this.indexFile(file, content);
                        } catch (error) {
                            console.error("Failed to index new file:", error);
                        }
                    }, 500);
                }
            }),
        );

        this.registerEvent(
            this.app.vault.on("modify", async (file) => {
                if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === "md") {
                    try {
                        const content = await this.app.vault.read(file);
                        await this.indexFile(file, content);
                    } catch (error) {
                        console.error("Failed to index modified file:", error);
                    }
                }
            }),
        );

        this.registerEvent(
            this.app.vault.on("delete", async (file) => {
                if (this.meilisearchService.isInitialized() && file instanceof TFile && file.extension === "md") {
                    try {
                        await this.removeFromIndex(file);
                    } catch (error) {
                        console.error("Failed to remove file from index:", error);
                    }
                }
            }),
        );
    }

    /**
     * Auto-index on startup
     */
    private async autoIndex(): Promise<void> {
        try {
            await this.indexingService.incrementalIndex();
        } catch (error) {
            console.error("Auto-indexing failed:", error);
            showError(`Auto-indexing failed: ${error.message}`);
        }
    }

    /**
     * Index a single file
     */
    private async indexFile(file: TFile, content: string): Promise<void> {
        try {
            const { parseDocument } = await import("./src/services/parser");
            const document = await parseDocument(file, content);

            await this.meilisearchService.indexDocuments([document]);

            this.indexingService.updateFileMetadata(file.path, {
                path: file.path,
                hash: document.hash,
                meilisearchId: document.id,
                indexedAt: Date.now(),
            });
            await this.indexingService.saveMetadata();
        } catch (error) {
            console.error(`Failed to index file ${file.path}:`, error);
            throw error;
        }
    }

    /**
     * Remove a file from the index
     */
    private async removeFromIndex(file: TFile): Promise<void> {
        try {
            await this.meilisearchService.deleteDocuments([file.path]);

            this.indexingService.removeFileMetadata(file.path);
            await this.indexingService.saveMetadata();
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
            showError("Meilisearch is not initialized");
            return;
        }

        new SearchModal(this, this.meilisearchService).open();
    }

    /**
     * Force re-index all files
     */
    async forceReindex(): Promise<void> {
        if (!this.meilisearchService.isInitialized()) {
            throw new Error("Meilisearch is not initialized");
        }

        try {
            await this.indexingService.fullIndex();
        } catch (error) {
            console.error("Force re-index failed:", error);
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
            console.error("Connection test failed:", error);
            return false;
        }
    }

    /**
     * Get current indexing status
     */
    getIndexingStatus(): string {
        const { status, total, processed } = this.indexingProgress;

        if (status === "idle") {
            return "Idle";
        } else if (status === "indexing") {
            return `Indexing (${processed}/${total})`;
        } else if (status === "error") {
            return `Error: ${this.indexingProgress.error || "Unknown error"}`;
        } else {
            return status;
        }
    }
}
