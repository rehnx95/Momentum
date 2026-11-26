import { ChevronDown, ChevronRight, SkipForward } from "lucide-react";
import Tooltip from "../../../shared/components/Tooltip";
import { getProblemDifficulty } from "../utils/problemDifficulty";

export function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-subtle"
      aria-label={`${pct}% complete`}
    >
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: "var(--text)",
          minWidth: done > 0 ? "2px" : 0,
          borderRadius: pct > 0 && pct < 3 ? "2px" : undefined,
        }}
      />
    </div>
  );
}

const difficultyStyles = {
  Easy: "bg-emerald-500/10 text-emerald-400",
  Medium: "bg-[#FFA116]/10 text-[#FFA116]",
  Hard: "bg-rose-500/10 text-rose-400",
};

function YouTubeIcon() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect x="0.5" y="0.5" width="17" height="12" rx="3.5" fill="#FF0000" />
      <path d="M7.25 3.5v6l5-3-5-3Z" fill="#FFFFFF" />
    </svg>
  );
}

function LeetCodeIcon() {
  return (
    <svg width="13" height="15.3" viewBox="0 0 94 111" aria-hidden="true" focusable="false">
      <path
        fill="#FFA116"
        d="M67.507 83.066a6.367 6.367 0 0 1 9.016.015 6.394 6.394 0 0 1-.015 9.032L65.435 103.17c-10.216 10.2-26.875 10.349-37.263.343-.06-.057-4.685-4.593-19.945-19.556-10.152-9.954-11.163-25.882-1.61-36.11l17.812-19.072c9.481-10.153 26.958-11.263 37.799-2.496l16.177 13.083a6.394 6.394 0 0 1 .956 8.98 6.368 6.368 0 0 1-8.965.958L54.219 36.217c-5.67-4.584-15.587-3.955-20.48 1.284L15.929 56.573c-4.65 4.98-4.141 13.001 1.218 18.256a546172.33 546172.33 0 0 0 19.851 19.465c5.401 5.202 14.134 5.124 19.437-.17l11.073-11.058z"
      />
      <path
        fill="#B3B3B3"
        d="M40.607 72.001c-3.521 0-6.375-2.859-6.375-6.386s2.854-6.386 6.375-6.386h47.018c3.52 0 6.375 2.859 6.375 6.386s-2.854 6.386-6.375 6.386H40.607z"
      />
      <path
        fill="var(--text)"
        d="M49.412 2.023a6.367 6.367 0 0 1 9.011-.3 6.394 6.394 0 0 1 .3 9.027L15.929 56.573c-4.65 4.979-4.141 13 1.218 18.256l19.763 19.38a6.394 6.394 0 0 1 .097 9.031 6.367 6.367 0 0 1-9.016.097L8.227 83.957c-10.152-9.955-11.163-25.883-1.61-36.11L49.413 2.022z"
      />
    </svg>
  );
}

function ResourceLink({ link, title }) {
  const resourceLabel = link.type === "youtube" ? "YouTube" : "LeetCode";
  return (
    <Tooltip label={`Open on ${resourceLabel}`} portal>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title} on ${resourceLabel}`}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-rowHover hover:text-text"
      >
        {link.type === "youtube" ? <YouTubeIcon /> : <LeetCodeIcon />}
      </a>
    </Tooltip>
  );
}

export function ProblemRow({
  prob,
  state,
  onToggle,
  onSkip,
  showBuiltinMetadata = false,
  reserveLeetCodeColumn = false,
}) {
  const isDone = state === "done";
  const isSkip = state === "skipped";
  const links = showBuiltinMetadata
    ? Array.isArray(prob.links)
      ? prob.links
      : prob.link
        ? [prob.link]
        : []
    : [];
  const resourceLinks = links.filter(
    (link) =>
      (link?.type === "youtube" || link?.type === "leetcode") &&
      typeof link.url === "string" &&
      link.url,
  );
  const leetcodeLink = resourceLinks.find((link) => link.type === "leetcode");
  const youtubeLink = resourceLinks.find((link) => link.type === "youtube");
  const difficulty = showBuiltinMetadata ? getProblemDifficulty(prob) : undefined;
  const hasLeetCodeColumn = Boolean(leetcodeLink || reserveLeetCodeColumn);

  return (
    <div
      className={`problem-row group flex items-center gap-3 py-2 pl-3 pr-1 rounded-lg transition-colors duration-200 ${isSkip ? "opacity-50 bg-skippedRow" : "hover:bg-rowHover"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(prob.id)}
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? `Mark ${prob.title} as not done` : `Mark ${prob.title} as done`}
        className={`w-[22px] h-[22px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isDone ? "bg-accent border-accent" : "border-accent/60 bg-transparent hover:border-accent"}`}
      >
        {isDone && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-onAccent">
            <path
              d="M2 7l3.5 3.5L12 4.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <button
        onClick={() => onToggle(prob.id)}
        className="flex-1 text-left text-base leading-snug text-text hover:text-text transition-colors duration-200"
      >
        {prob.title}
      </button>

      <div
        className={`grid flex-shrink-0 items-center gap-x-1 ${
          showBuiltinMetadata
            ? hasLeetCodeColumn
              ? "grid-cols-[auto_1.25rem_1.25rem_1.25rem]"
              : "grid-cols-[auto_1.25rem_1.25rem]"
            : "grid-cols-[1.25rem_1.25rem]"
        }`}
      >
        {difficulty && (
          <button
            type="button"
            onClick={() => onToggle(prob.id)}
            aria-label={`Toggle ${prob.title} completion`}
            className={`justify-self-start rounded-md px-1 py-1 text-xs font-medium ${difficultyStyles[difficulty]}`}
          >
            {difficulty}
          </button>
        )}

        {showBuiltinMetadata ? (
          <>
            {hasLeetCodeColumn &&
              (leetcodeLink ? (
                <ResourceLink link={leetcodeLink} title={prob.title} />
              ) : (
                <span aria-hidden="true" />
              ))}
            {youtubeLink ? (
              <ResourceLink link={youtubeLink} title={prob.title} />
            ) : (
              <span aria-hidden="true" />
            )}
          </>
        ) : (
          <span aria-hidden="true" />
        )}

        <Tooltip label={isSkip ? "Unskip" : "Skip"} portal>
          <button
            onClick={() => onSkip(prob.id)}
            aria-label={isSkip ? `Unskip ${prob.title}` : `Skip ${prob.title}`}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${isSkip ? "text-muted bg-rowHover" : "text-muted hover:text-text hover:bg-rowHover"}`}
          >
            <SkipForward size={16} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export function SubSectionRow({
  sub,
  expanded,
  onToggle,
  progressState,
  onToggleProb,
  onSkipProb,
  hideSkipped,
  filter,
  showBuiltinMetadata = false,
  reserveLeetCodeColumn = false,
}) {
  const done = sub.problems.filter((p) => progressState(p.id) === "done").length;
  const total = sub.problems.length;

  let visible = sub.problems;
  if (hideSkipped) {
    visible = visible.filter((p) => progressState(p.id) !== "skipped");
  }

  if (filter === "done") {
    visible = visible.filter((p) => progressState(p.id) === "done");
  } else if (filter === "skipped") {
    visible = visible.filter((p) => progressState(p.id) === "skipped");
  } else if (filter === "todo") {
    visible = visible.filter((p) => progressState(p.id) === "todo");
  }

  return (
    <div className="ml-4 pl-3 border-l border-subtle">
      <button
        onClick={() => onToggle(sub.id)}
        className="w-full flex items-center gap-2 py-2 text-sm group text-left hover:text-text transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium text-text">{sub.title}</span>
        <div className="flex-1 mx-2">
          <ProgressBar done={done} total={total} />
        </div>
        <span className="text-xs text-muted tabular-nums">
          {done}/{total}
        </span>
      </button>

      {expanded && (
        <div className="surface-card mt-2 mb-2 bg-panel rounded-xl border border-subtle p-2">
          {visible.length > 0 ? (
            visible.map((p) => (
              <ProblemRow
                key={p.id}
                prob={p}
                state={progressState(p.id)}
                onToggle={onToggleProb}
                onSkip={onSkipProb}
                showBuiltinMetadata={showBuiltinMetadata}
                reserveLeetCodeColumn={reserveLeetCodeColumn}
              />
            ))
          ) : (
            <div className="py-4 text-center text-xs text-muted">No problems match the filter</div>
          )}
        </div>
      )}
    </div>
  );
}

export function StepRow({
  step,
  progressState,
  expandedSteps,
  onToggleStep,
  expandedSubs,
  onToggleSub,
  onToggleProb,
  onSkipProb,
  hideSkipped,
  filter,
  showBuiltinMetadata = false,
  reserveLeetCodeColumn = false,
}) {
  const done = step.subsections.reduce(
    (sum, s) => sum + s.problems.filter((p) => progressState(p.id) === "done").length,
    0,
  );
  const total = step.subsections.reduce((sum, s) => sum + s.problems.length, 0);
  const expanded = expandedSteps.has(step.id);

  return (
    <div className="surface-card mb-2 overflow-hidden rounded-xl border border-subtle bg-panel">
      <button
        onClick={() => onToggleStep(step.id)}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-rowHover md:grid-cols-[1.5rem_minmax(0,1fr)_14rem_3.5rem]"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <h2 className="min-w-0 text-lg font-semibold leading-snug text-text">{step.title}</h2>
        <div className="hidden md:block">
          <ProgressBar done={done} total={total} />
        </div>
        <span className="text-right text-sm tabular-nums text-muted">
          {done}/{total}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-2">
          {step.subsections.map((sub) => (
            <SubSectionRow
              key={sub.id}
              sub={sub}
              expanded={expandedSubs.has(sub.id)}
              onToggle={() => onToggleSub(sub.id)}
              progressState={progressState}
              onToggleProb={onToggleProb}
              onSkipProb={onSkipProb}
              hideSkipped={hideSkipped}
              filter={filter}
              showBuiltinMetadata={showBuiltinMetadata}
              reserveLeetCodeColumn={reserveLeetCodeColumn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
