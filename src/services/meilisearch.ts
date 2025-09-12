import { Meilisearch, Index, SearchResponse } from "meilisearch";
import { MeilisearchSettings, DocumentData } from "../types";
import { showError, showSuccess } from "../utils/notifications";

interface SearchOptions {
    limit?: number;
    attributesToHighlight?: string[];
    attributesToCrop?: string[];
    cropLength?: number;
    showRankingScore?: boolean;
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

            const health = await this.client.health();
            console.log("Meilisearch health status:", health.status);

            this.index = this.client.index(this.settings.indexName);

            // Check if index exists, if not create it
            try {
                await this.index.getStats();
                console.log(`Index '${this.settings.indexName}' exists`);
            } catch {
                console.log(`Index '${this.settings.indexName}' does not exist, creating it...`);
                await this.client.createIndex(this.settings.indexName, { primaryKey: "id" });
                console.log(`Index '${this.settings.indexName}' created`);
            }

            await this.configureSearchableAttributes();

            showSuccess("Connected to Meilisearch successfully");
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
            console.log("Searchable attributes configured");
        } catch (error) {
            console.error("Failed to configure searchable attributes:", error);
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
            console.log(`Documents indexed with task ID: ${update.taskUid}`);
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
            console.log(`Documents deleted with task ID: ${update.taskUid}`);
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
            const searchParams = {
                limit: 20,
                attributesToHighlight: ["name", "content"],
                attributesToRetrieve: ["id", "name", "path", "content", "frontmatter"],
                ...options,
            };

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
            console.log(`Index cleared with task ID: ${update.taskUid}`);

            await this.waitForTask(update.taskUid);

            showSuccess("Index cleared successfully");
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

        const maxAttempts = 60; // 60 attempts * 1 second = 1 minute max
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const task = await this.client.tasks.getTask(taskUid);

                if (task.status === "succeeded") {
                    console.log(`Task ${taskUid} completed successfully`);
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
