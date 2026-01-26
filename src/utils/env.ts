/**
 * Detect if running in Tauri environment
 */
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Get the API base URL for web mode
 */
export const getApiBaseUrl = (): string => {
  if (isTauri) {
    return ''; // Tauri doesn't need base URL
  }
  // In web mode, use the server URL
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};
