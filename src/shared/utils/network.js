export function isNetworkUnavailable(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error?.name === "TypeError" || error?.name === "AbortError") return true;
  return /failed to fetch|network|connection|timed?\s*out/i.test(error?.message || "");
}
