import { DocumentData } from "../types";
import { generateHash } from "../utils/hash";
import { TFile, parseYaml } from "obsidian";

/**
 * Parse a markdown file to extract name, frontmatter, and content
 * @param file The TFile object
 * @param content The file content
 * @returns DocumentData object with parsed information
 */
export function parseDocument(file: TFile, content: string): DocumentData {
    const name = file.basename;
    const path = file.path;

    let frontmatter: Record<string, unknown> = {};
    let contentWithoutFrontmatter = content;

    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match && match.length === 3) {
        const frontmatterContent = match[1];
        contentWithoutFrontmatter = match[2];

        try {
            frontmatter = parseYaml(frontmatterContent);
        } catch (error) {
            console.error("Error parsing frontmatter:", error);
            frontmatter = {};
        }
    }

    const hash = generateHash(content);

    // Sanitize path to create a valid ID (alphanumeric, hyphens, underscores)
    const sanitizedId = path.replace(/[^a-zA-Z0-9-_]/g, "_");

    return {
        id: sanitizedId,
        name,
        path,
        frontmatter,
        content: contentWithoutFrontmatter,
        hash,
    };
}
