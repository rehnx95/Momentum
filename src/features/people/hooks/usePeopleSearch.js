import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";

export default function usePeopleSearch(enabled) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!enabled || normalizedQuery.length < 3) {
      setResults([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("Sign in to search users.");

        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not search users.");
        if (active) setResults(result.results || []);
      } catch (error) {
        if (!active || error.name === "AbortError") return;
        console.error("Failed to search public profiles:", error);
        setError(error.message || "Could not search profiles. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  return {
    clearSearch,
    error,
    loading,
    query,
    results,
    setQuery,
  };
}
