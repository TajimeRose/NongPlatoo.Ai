/**
 * Resolve API base URL with safe fallbacks.
 * Priority:
 * 1. VITE_API_BASE (explicit override)
 * 2. window.location.origin (same-origin backend)
 * 3. empty string → relative path
 */
export const getApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_BASE?.toString().trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};
