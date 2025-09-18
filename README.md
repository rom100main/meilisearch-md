# Meilisearch MD

Never lose your notes. Instantly find the information you need with [Meilisearch](https://www.meilisearch.com/)'s intelligent engine that just understands your intent.

## Features

- **Intelligent search**: Advanced full-text search with relevancy algorithms and typo-tolerance capabilities
- **Real-time indexing**: Automatically index new and modified notes as you work
- **Customizable settings**: Configure Meilisearch connection and indexing behavior

## Requirements

- [Obsidian](https://obsidian.md/) v1.9.0 or later
- A running Meilisearch instance (local or remote)

## Run Meilisearch

[Install Meilisearch locally](README.md#local-installation) and run it in background  
or  
Use a [Meilisearch Cloud](https://www.meilisearch.com/pricing) instance

### Local Installation

On Windows, I advice you to download the executable in a dedicated folder and add a shortcut to your startup folder.

On Linux based systems, you can use the following command to download and run Meilisearch:

```bash
curl -L https://install.meilisearch.com | sh
systemctl --user start meilisearch
systemctl --user enable meilisearch # to run it at startup
```

On MacOS, you can use Homebrew:

```bash
brew install meilisearch
brew services start meilisearch # to run it in background and at startup
```

More info on [Meilisearch installation](https://www.meilisearch.com/docs/learn/self_hosted/install_meilisearch_locally).

### Configure Meilisearch

By default, Meilisearch settings work with the Obsidian plugin.

For more configuration options, refer to the [Meilisearch documentation](https://www.meilisearch.com/docs).

## Commands

- **Search**: Open the search modal to find notes sorted by relevance
- **Force re-index**: Re-index all notes in your vault
- **Test connection**: Verify your Meilisearch connection settings

## Settings

- **Host URL**: The URL of your Meilisearch instance
- **API key**: Optional API key for secured Meilisearch instances
- **Index name**: The name of the index in Meilisearch to use for your vault
- **Auto-index on startup**: Automatically index new or modified files when Obsidian starts

## Install the Plugin manually

1. Download the latest release from the [GitHub releases page](https://github.com/rom100main/meilisearch-md/releases)
2. In `.obsidian/plugins/`, create a folder named `meilisearch-md`
3. Copy `main.js`, `manifest.json`, and `styles.css` from the downloaded release to the `meilisearch-md` folder
4. Enable the plugin in Obsidian's settings under "Community plugins"

## Privacy

This plugin processes your note content locally before sending it to your Meilisearch instance. No data is sent to external servers except your configured Meilisearch instance. All indexing and searching happens within your local environment and your Meilisearch server.

## Support

For bug reports and feature requests, please fill an issue at [GitHub repository](https://github.com/rom100main/meilisearch-md/issues).

## Changelog

See [CHANGELOG](CHANGELOG.md) for a list of changes in each version.

## Development

For development information, see [CONTRIBUTING](CONTRIBUTING.md).
