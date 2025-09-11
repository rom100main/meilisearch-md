import { Notice } from 'obsidian';

/**
 * Show a temporary notice to the user
 * @param message The message to display
 * @param duration Duration in milliseconds (default: 3000)
 */
export function showNotice(message: string, duration: number = 3000): void {
  new Notice(message, duration);
}

/**
 * Show an error notice to the user
 * @param message The error message
 * @param duration Duration in milliseconds (default: 5000)
 */
export function showError(message: string, duration: number = 5000): void {
  new Notice(`Error: ${message}`, duration);
}

/**
 * Show a success notice to the user
 * @param message The success message
 * @param duration Duration in milliseconds (default: 3000)
 */
export function showSuccess(message: string, duration: number = 3000): void {
  new Notice(message, duration);
}

/**
 * Show an info notice to the user
 * @param message The info message
 * @param duration Duration in milliseconds (default: 3000)
 */
export function showInfo(message: string, duration: number = 3000): void {
  new Notice(message, duration);
}