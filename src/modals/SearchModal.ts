import { Modal, TFile } from "obsidian";
import type MeilisearchPlugin from "../../main";
import { SearchController } from "../search/SearchController";
import { BasicSearchUI } from "../search/BasicSearchUI";
import { MeilisearchService } from "../services/meilisearch";
import type { Modifier } from "obsidian";

export class SearchModal extends Modal {
    private searchController: SearchController;

    constructor(plugin: MeilisearchPlugin, meilisearchService: MeilisearchService) {
        super(plugin.app);

        const searchUI = new BasicSearchUI();
        this.searchController = new SearchController(plugin, meilisearchService, searchUI);

        this.searchController.onSubmit((path: string, modifiers: Modifier[]) => {
            this.handleResultSelected(path, modifiers);
        });

        this.searchController.onCancel(() => {
            this.close();
        });
    }

    onOpen(): void {
        super.onOpen();
        this.modalEl.addClass("meilisearch-search-modal"); // custom class for styling
        this.titleEl.remove(); // remove the default title
        this.searchController.create(this.contentEl, this.scope); // create the search UI
    }

    onClose(): void {
        this.searchController.destroy();
        this.contentEl.empty();
    }

    private handleResultSelected(path: string, modifiers: Modifier[]): void {
        // Open the file in the current leaf or a new leaf if modifier is pressed
        const file = this.app.vault.getAbstractFileByPath(path);

        if (file && file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf(modifiers.includes("Mod"));
            leaf.openFile(file);
        }

        this.close();
    }
}
