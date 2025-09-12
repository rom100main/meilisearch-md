import { App, PluginSettingTab, Setting } from 'obsidian';
import MeilisearchPlugin from '../../main';
import { showSuccess, showError } from '../utils/notifications';

export class MeilisearchSettingTab extends PluginSettingTab {
  plugin: MeilisearchPlugin;

  constructor(app: App, plugin: MeilisearchPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Meilisearch Settings' });

    new Setting(containerEl)
      .setName('Meilisearch Host URL')
      .setDesc('The URL of your Meilisearch instance (e.g., http://localhost:7700)')
      .addText(text => text
        .setPlaceholder('http://localhost:7700')
        .setValue(this.plugin.settings.host)
        .onChange(async (value) => {
          this.plugin.settings.host = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Optional API key for secured Meilisearch instances')
      .addText(text => text
        .setPlaceholder('Optional API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Index Name')
      .setDesc('The name of the Meilisearch index to use for your vault')
      .addText(text => text
        .setPlaceholder('obsidian-vault')
        .setValue(this.plugin.settings.indexName)
        .onChange(async (value) => {
          this.plugin.settings.indexName = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto Index on Startup')
      .setDesc('Automatically index new or modified files when the plugin loads')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoIndexOnStartup)
        .onChange(async (value) => {
          this.plugin.settings.autoIndexOnStartup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Test Connection')
      .setDesc('Test the connection to your Meilisearch instance')
      .addButton(button => button
        .setButtonText('Test Connection')
        .setCta()
        .onClick(async () => {
          button.setButtonText('Testing...');
          button.setDisabled(true);
          
          try {
            const success = await this.plugin.testConnection();
            if (success) {
              showSuccess('Connection to Meilisearch successful!');
            } else {
              showError('Failed to connect to Meilisearch. Check your settings.');
            }
          } catch (error) {
            showError(`Connection test failed: ${error.message}`);
          } finally {
            button.setButtonText('Test Connection');
            button.setDisabled(false);
          }
        }));

    new Setting(containerEl)
      .setName('Force Re-index')
      .setDesc('Clear the index and re-index all files in your vault')
      .addButton(button => button
        .setButtonText('Force Re-index')
        .setCta()
        .onClick(async () => {
          button.setButtonText('Indexing...');
          button.setDisabled(true);
          
          try {
            await this.plugin.forceReindex();
            showSuccess('Re-indexing completed successfully!');
          } catch (error) {
            showError(`Re-indexing failed: ${error.message}`);
          } finally {
            button.setButtonText('Force Re-index');
            button.setDisabled(false);
          }
        }));

    new Setting(containerEl)
      .setName('Open Search Modal')
      .setDesc('Open the Meilisearch search modal to test your search')
      .addButton(button => button
        .setButtonText('Open Search')
        .onClick(() => {
          this.plugin.openSearchModal();
        }));
  }
}