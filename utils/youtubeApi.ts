// This file centralizes the logic for ensuring the YouTube IFrame API is ready.
// It prevents race conditions that can occur when multiple components
// try to initialize the API at the same time.

let apiReadyPromise: Promise<void>;

/**
 * Returns a promise that resolves when the YouTube IFrame API is ready.
 * This function can be called multiple times from different components,
 * and it will always return the same promise, ensuring the API is initialized only once.
 */
export function ensureYoutubeApiReady(): Promise<void> {
  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve) => {
      // Case 1: API is already loaded and ready
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Case 2: API is not ready, we need to wait for the global callback
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        // Call the original callback if it existed, just in case
        if (originalCallback) {
          originalCallback();
        }
        // Resolve our promise, allowing all waiting components to proceed
        resolve();
      };
    });
  }
  return apiReadyPromise;
}
