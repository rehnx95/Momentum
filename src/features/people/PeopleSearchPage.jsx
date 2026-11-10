import AppHeader from "../../shared/components/AppHeader";
import { Search, ChevronRight, Users } from "lucide-react";

export default function PeopleSearchPage({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelectProfile,
  onBack,
  context,
}) {
  const { headerProps } = context;
    return (
      <div className="profile-shell min-h-screen bg-[#000000] text-[#EDEDED] font-sans transition-colors duration-300">
        <AppHeader active="people" {...headerProps} />

        <main className="app-page">
          <div className="app-page-narrow">
          <h1 className="page-title mb-1">Find people</h1>
          <p className="mb-6 text-sm text-[#A1A1A1]">
            Search a username to see their streaks, sheet progress and activity.
          </p>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#A1A1A1]"
            />
            <input
              id="people-search"
              aria-label="Search by username"
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onQueryChange("");
                if (event.key === "Enter" && results[0])
                  onSelectProfile(results[0].username);
              }}
              placeholder="Search by username"
              aria-autocomplete="list"
              aria-controls="people-search-results"
              className="h-12 w-full rounded-xl border border-[#383838] bg-[#0A0A0A] pl-11 pr-4 text-sm text-[#EDEDED] placeholder-[#A1A1A1] outline-none transition-colors focus:border-[#EDEDED] focus:outline-none"
            />
            {query.trim().length >= 3 && (
              <div
                id="people-search-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#383838] bg-[#0A0A0A] shadow-2xl"
              >
                {loading ? (
                  <p className="px-4 py-3 text-sm text-[#A1A1A1]">
                    Searching people…
                  </p>
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
                      className="flex w-full items-center gap-3 border-b border-[#262626] px-4 py-3 text-left last:border-0 hover:bg-[#1F1F1F]"
                    >
                      <span className="people-result-avatar">
                        {(result.name || result.username)
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#EDEDED]">
                          {result.name || result.username}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[#A1A1A1]">
                          @{result.username}
                        </span>
                      </span>
                      <ChevronRight
                        size={17}
                        className="text-[#A1A1A1]"
                        aria-hidden="true"
                      />
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-[#A1A1A1]">
                    No users found. Try a different username.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-[#A1A1A1]">3 characters minimum.</p>
          {query.trim().length < 3 && (
            <div className="empty-state">
              <Users size={22} />
              <strong>Start typing a username</strong>
              <span>
                Profiles show streaks, per-sheet progress, a yearly heatmap and
                recent solves.
              </span>
            </div>
          )}
          </div>
        </main>
      </div>
    );
  }
