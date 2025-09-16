# Meilisearch MD - Developer Documentation

## Contributing

We welcome contributions to the Meilisearch MD plugin! Here's how you can get involved:

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Project Guidelines

- Use TypeScript with strict type checking
- Follow the existing code style
- Add JSDoc comments for public methods
- Run linter before committing (`npm run lint:fix`)
- Write clear, descriptive commit messages, use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) style

### Testing

Before submitting a pull request, please ensure that:

1. The plugin builds without errors (`npm run build`)
2. You run the linter and fix any issues (`npm run lint`)
3. The plugin loads correctly in Obsidian
4. All functionality works as expected
5. The code follows the [project](CONTRIBUTING.md#project-guidelines) and [Obsidian](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) guidelines

## Development Setup

### Prerequisites

- Node.js
- npm
- Git
- Meilisearch

### Installation

1. Install dependencies:
    ```bash
    npm install
    ```

### Development Workflow

1. Start the development server:

    ```bash
    npm run dev
    ```

2. Make changes to the source code in the `src/` directory.

3. The plugin will be automatically compiled to `main.js`.

4. To test the plugin:
    - Copy `main.js`, `manifest.json`, and `styles.css` to your Obsidian vault's plugins folder: `<Vault>/.obsidian/plugins/meilisearch-md/`
    - Reload Obsidian and enable the plugin in **Settings → Community plugins**

## Project Structure

```
meilisearch-md/
├── src/
│   ├── modals/               # UI modal components
│   │   └── SearchModal.ts
│   ├── search/               # Search functionality
│   │   ├── BasicSearchUI.ts
│   │   └── SearchController.ts
│   ├── services/             # Core services
│   │   ├── indexing.ts       # Indexing service
│   │   ├── meilisearch.ts    # Meilisearch API client
│   │   └── parser.ts         # Document parsing
│   ├── settings/             # Settings UI and defaults
│   │   └── ui.ts
│   ├── types.ts              # TypeScript type definitions
│   └── utils/                # Utility functions
│       ├── hash.ts           # Hash generation
│       └── notifications.ts  # Notification helpers
├── main.ts                   # Plugin entry point
├── manifest.json             # Plugin manifest
├── styles.css                # Plugin styles
└── package.json              # Dependencies and scripts
```

## Architecture

### Core Components

1. **MeilisearchPlugin** (`main.ts`): Main plugin class that handles lifecycle events and registers commands.

2. **MeilisearchService** (`src/services/meilisearch.ts`): Handles communication with the Meilisearch server, including indexing and searching.

3. **IndexingService** (`src/services/indexing.ts`): Manages the indexing process, including incremental and full indexing.

4. **SearchModal** (`src/modals/SearchModal.ts`): Provides the search UI and handles user interactions.

5. **SearchController** and **BasicSearchUI** (`src/search/`): Handle search logic and UI rendering.

### Data Flow

1. **Indexing**:
    - Files are parsed into `DocumentData` objects
    - Documents are sent to Meilisearch for indexing
    - Metadata is stored locally to track indexed files

2. **Searching**:
    - User enters a query in the search modal
    - Query is sent to Meilisearch
    - Results are displayed with scoring
    - User can click on results to open the corresponding notes

3. **Real-time Updates**:
    - File system events are monitored
    - New/modified files are automatically indexed
    - Deleted files are removed from the index
