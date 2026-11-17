import AppHeader from "../../shared/components/AppHeader";
import { Search, ChevronRight, Users } from "lucide-react";

export default function PeopleSearchPage({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelectProfile,
  context,
}) {
  const { headerProps } = context;
  return (
    <div className="profile-shell min-h-screen bg-page text-text font-sans transition-colors duration-300">
      <AppHeader active="people" {...headerProps} />

      <main className="app-page">
        <div className="app-page-narrow">
          <h1 className="page-title mb-1">Find people</h1>
          <p className="mb-6 text-sm text-muted">
            Search a username to see their streaks, sheet progress and activity.
          </p>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted"
            />
            <input
              id="people-search"
              aria-label="Search by username"
              autoFocus
              value={query}
              autoComplete="off"
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onQueryChange("");
                if (event.key === "Enter" && results[0]) onSelectProfile(results[0].username);
              }}
              placeholder="Search by username"
              aria-autocomplete="list"
              aria-controls="people-search-results"
              className="h-12 w-full rounded-xl border border-mid bg-panel pl-11 pr-4 text-sm text-text placeholder:text-muted outline-none transition-colors focus:border-accent focus:outline-none"
            />
            {query.trim().length >= 3 && (
              <div
                id="people-search-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-mid bg-panel shadow-2xl"
              >
                {loading ? (
                  <p className="px-4 py-3 text-sm text-muted">Searching people…</p>
                ) : error ? (
                  <p role="alert" className="px-4 py-3 text-sm text-muted">
                    {error}
                  </p>
                ) : results.length ? (
                  results.map((result) => (
                    <button
                      key={result.username}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => onSelectProfile(result.username)}
                      className="flex w-full items-center gap-3 border-b border-subtle px-4 py-3 text-left last:border-0 hover:bg-rowHover"
                    >
                      <span className="people-result-avatar">
                        {(result.name || result.username).charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text">
                          {result.name || result.username}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          @{result.username}
                        </span>
                      </span>
                      <ChevronRight size={17} className="text-muted" aria-hidden="true" />
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">
                    No users found. Try a different username.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">3 characters minimum.</p>
          {query.trim().length < 3 && (
            <div className="empty-state">
              <Users size={22} />
              <strong>Start typing a username</strong>
              <span>
                Profiles show streaks, per-sheet progress, a yearly heatmap and recent solves.
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
