import { createHash } from 'crypto';

/**
 * Generate a hash for a string content
 * @param content The content to hash
 * @returns A SHA256 hash string
 */
export function generateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
