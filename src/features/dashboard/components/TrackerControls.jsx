import "./TrackerControls.css";
import { Eye, EyeOff } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
  { value: "todo", label: "To do" },
];

export default function TrackerControls({
  activeFilter,
  chipActive,
  collapseAll,
  expandAll,
  hideSkipped,
  setActiveFilter,
  setHideSkipped,
}) {
  return (
    <div className="tracker-controls">
      <div
        className="tracker-filter-group"
        role="group"
        aria-label="Filter problems"
      >
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveFilter(value)}
            aria-pressed={activeFilter === value}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chipActive(value)}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHideSkipped((hidden) => !hidden)}
          aria-pressed={hideSkipped}
          aria-label={hideSkipped ? "Show skipped problems" : "Hide skipped problems"}
          className={`tracker-skip-toggle flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            hideSkipped
              ? "bg-[#EDEDED] text-black"
              : "bg-[#0A0A0A] text-[#A1A1A1] hover:text-white"
          }`}
        >
          {hideSkipped ? (
            <EyeOff size={15} aria-hidden="true" />
          ) : (
            <Eye size={15} aria-hidden="true" />
          )}
          <span>Skip</span>
        </button>
      </div>
      <span className="tracker-controls-spacer" aria-hidden="true" />
      <div
        className="tracker-bulk-actions flex items-center gap-2 text-xs text-[#A1A1A1]"
        role="group"
        aria-label="Expand or collapse problem groups"
      >
        <button
          type="button"
          onClick={expandAll}
          className="transition-colors hover:text-white"
        >
          Expand all
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={collapseAll}
          className="transition-colors hover:text-white"
        >
          Collapse all
        </button>
      </div>
    </div>
  );
}
