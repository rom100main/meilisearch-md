/**
 * Generate a hash for a string content
 * @param content The content to hash
 * @returns A SHA256 hash string
 */
export async function generateHash(content: string): Promise<string> {
    // Encode the content as a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Generate the hash using SubtleCrypto
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert the ArrayBuffer to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
}
