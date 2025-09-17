import { Meilisearch, Index, SearchResponse } from "meilisearch";
import { MeilisearchSettings, DocumentData } from "../types";
import { showError } from "../utils/notifications";

interface SearchOptions {
    limit?: number;
    attributesToHighlight?: string[];
    attributesToCrop?: string[];
    cropLength?: number;
    showRankingScore?: boolean;
    hybrid?: {
        embedder: string;
        semanticRatio: number;
    };
    [key: string]: unknown;
}

export class MeilisearchService {
    private client: Meilisearch | null = null;
    private index: Index | null = null;
    private settings: MeilisearchSettings;

    constructor(settings: MeilisearchSettings) {
        this.settings = settings;
    }

    /**
     * Initialize the Meilisearch client and connect to the server
     */
    async initialize(): Promise<boolean> {
        try {
            this.client = new Meilisearch({
                host: this.settings.host,
                apiKey: this.settings.apiKey || undefined,
            });

            this.index = this.client.index(this.settings.indexName);

            // Check if index exists, if not create it
            try {
                await this.index.getStats();
            } catch {
                try {
                    await this.client.createIndex(this.settings.indexName, { primaryKey: "id" });
                } catch (error) {
                    console.error("Failed to create Meilisearch index:", error);
                    throw error;
                }
            }

            await this.configureSearchableAttributes();
            await this.configureEmbedders();

            return true;
        } catch (error) {
            console.error("Failed to initialize Meilisearch:", error);
            showError(`Failed to connect to Meilisearch: ${error.message}`);
            return false;
        }
    }

    /**
     * Configure searchable attributes for the index
     */
    private async configureSearchableAttributes(): Promise<void> {
        if (!this.index) return;

        try {
            await this.index.updateSearchableAttributes(["name", "content", "frontmatter"]);
            await this.index.updateFilterableAttributes(["path"]);
        } catch (error) {
            console.error("Failed to configure searchable attributes:", error);
        }
    }

    /**
     * Configure embedders for semantic search
     */
    private async configureEmbedders(): Promise<void> {
        if (!this.index) return;

        try {
            if (this.settings.enableHybridSearch) {
                // Configure HuggingFace embedder
                const embedders = {
                    default: {
                        source: "huggingFace" as const,
                        model: "Lajavaness/bilingual-embedding-small", //"intfloat/multilingual-e5-small",
                        documentTemplate: `{{doc.name}}
{{doc.content}}`,
                    },
                };

                await this.index.updateEmbedders(embedders);
            } else {
                // Remove embedders if hybrid search is disabled
                await this.index.resetEmbedders();
            }
        } catch (error) {
            console.error("Failed to configure embedders:", error);
            // Don't throw error here as embedders are optional
        }
    }

    /**
     * Add or update documents in the index
     * @param documents Array of documents to index
     */
    async indexDocuments(documents: DocumentData[]): Promise<void> {
        if (!this.index) {
            throw new Error("Meilisearch index not initialized");
        }

        try {
            const update = await this.index.addDocuments(documents);
            await this.waitForTask(update.taskUid);
        } catch (error) {
            console.error("Failed to index documents:", error);
            throw error;
        }
    }

    /**
     * Delete documents from the index
     * @param documentIds Array of document IDs to delete
     */
    async deleteDocuments(documentIds: string[]): Promise<void> {
        if (!this.index) {
            throw new Error("Meilisearch index not initialized");
        }

        try {
            const update = await this.index.deleteDocuments(documentIds);
            await this.waitForTask(update.taskUid);
        } catch (error) {
            console.error("Failed to delete documents:", error);
            throw error;
        }
    }

    /**
     * Search for documents in the index
     * @param query The search query
     * @param options Additional search options
     */
    async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
        if (!this.index) {
            throw new Error("Meilisearch index not initialized");
        }

        try {
            const searchParams: SearchOptions = {
                limit: 20,
                attributesToHighlight: ["name", "content"],
                attributesToRetrieve: ["id", "name", "path", "content", "frontmatter"],
                ...options,
            };

            // Add hybrid search parameters if enabled
            if (this.settings.enableHybridSearch) {
                searchParams.hybrid = {
                    embedder: "default",
                    semanticRatio: this.settings.semanticRatio,
                    ...options.hybrid,
                };
            }

            const result = await this.index.search(query, searchParams);
            return result;
        } catch (error) {
            console.error("Search failed:", error);
            throw error;
        }
    }

    /**
     * Clear all documents from the index
     */
    async clearIndex(): Promise<void> {
        if (!this.index) {
            throw new Error("Meilisearch index not initialized");
        }

        try {
            const update = await this.index.deleteAllDocuments();
            await this.waitForTask(update.taskUid);
        } catch (error) {
            console.error("Failed to clear index:", error);
            throw error;
        }
    }

    /**
     * Wait for a Meilisearch task to complete
     * @param taskUid The task UID to wait for
     */
    private async waitForTask(taskUid: number): Promise<void> {
        if (!this.client) return;

        const maxAttempts = 600; // 60 attempts * 1 second = 1 minute max
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const task = await this.client.tasks.getTask(taskUid);

                if (task.status === "succeeded") {
                    return;
                } else if (task.status === "failed") {
                    console.error(`Task ${taskUid} failed:`, task.error);
                    throw new Error(`Task failed: ${task.error?.message || "Unknown error"}`);
                }

                // Task is still processing, wait and try again
                await new Promise((resolve) => setTimeout(resolve, 1000));
                attempts++;
            } catch (error) {
                console.error(`Error checking task ${taskUid}:`, error);
                attempts++;
            }
        }

        throw new Error(`Task ${taskUid} did not complete within ${maxAttempts} seconds`);
    }

    /**
     * Update settings
     * @param settings New settings to use
     */
    updateSettings(settings: MeilisearchSettings): void {
        this.settings = settings;
    }

    /**
     * Get the current index
     */
    getIndex(): Index | null {
        return this.index;
    }

    /**
     * Check if the client is initialized
     */
    isInitialized(): boolean {
        return this.client !== null && this.index !== null;
    }
}
