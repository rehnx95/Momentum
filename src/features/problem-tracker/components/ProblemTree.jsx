import { SkipForward } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#262626]" aria-label={`${pct}% complete`}>
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

export function ProblemRow({ prob, state, onToggle, onSkip }) {
  const isDone = state === "done";
  const isSkip = state === "skipped";

  return (
    <div
      className={`problem-row group flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors duration-200 ${isSkip ? "opacity-50 bg-[#0A0A0A]/40" : "hover:bg-[#1F1F1F]"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(prob.id)}
        role="checkbox"
        aria-checked={isDone}
        aria-label={
          isDone
            ? `Mark ${prob.title} as not done`
            : `Mark ${prob.title} as done`
        }
        className={`w-[22px] h-[22px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isDone ? "bg-[#EDEDED] border-[#EDEDED]" : "border-[#EDEDED]/60 bg-transparent hover:border-[#EDEDED]"}`}
      >
        {isDone && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="text-black"
          >
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
        className="flex-1 text-left text-[15px] leading-snug text-[#EDEDED] hover:text-white transition-colors duration-200"
      >
        {prob.title}
      </button>

      <button
        onClick={() => onSkip(prob.id)}
        aria-label={isSkip ? `Unskip ${prob.title}` : `Skip ${prob.title}`}
        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md transition-colors duration-200 ${isSkip ? "text-muted bg-[#1F1F1F]" : "text-[#A1A1A1] hover:text-[#EDEDED] hover:bg-[#1F1F1F]"}`}
      >
        <SkipForward size={13} />
        <span>Skip</span>
      </button>
    </div>
  );
}

export function SubSectionRow({
  sub,
  stepId,
  expanded,
  onToggle,
  progressState,
  onToggleProb,
  onSkipProb,
  hideSkipped,
  filter,
}) {
  const done = sub.problems.filter(
    (p) => progressState(p.id) === "done",
  ).length;
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
    <div className="ml-4 pl-3 border-l border-[#262626]">
      <button
        onClick={() => onToggle(sub.id)}
        className="w-full flex items-center gap-2 py-2 text-sm group text-left hover:text-[#EDEDED] transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium text-[#EDEDED]">{sub.title}</span>
        <div className="flex-1 mx-2">
          <ProgressBar done={done} total={total} />
        </div>
        <span className="text-xs text-[#A1A1A1] tabular-nums">
          {done}/{total}
        </span>
      </button>

      {expanded && (
        <div className="surface-card mt-2 mb-3 bg-[#0A0A0A] rounded-xl border border-[#262626] p-2">
          {visible.length > 0 ? (
            visible.map((p) => (
              <ProblemRow
                key={p.id}
                prob={p}
                state={progressState(p.id)}
                onToggle={onToggleProb}
                onSkip={onSkipProb}
              />
            ))
          ) : (
            <div className="py-4 text-center text-xs text-[#A1A1A1]">
              No problems match the filter
            </div>
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
}) {
  const done = step.subsections.reduce(
    (sum, s) =>
      sum + s.problems.filter((p) => progressState(p.id) === "done").length,
    0,
  );
  const total = step.subsections.reduce((sum, s) => sum + s.problems.length, 0);
  const expanded = expandedSteps.has(step.id);

  return (
    <div className="surface-card mb-3 overflow-hidden rounded-xl border border-[#262626] bg-[#0A0A0A]">
      <button
        onClick={() => onToggleStep(step.id)}
        aria-expanded={expanded}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#1F1F1F] md:grid-cols-[1.5rem_minmax(0,1fr)_14rem_3.5rem]"
      >
        <span className="flex h-6 w-6 items-center justify-center">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <h2 className="min-w-0 text-[17px] font-semibold leading-snug text-[#EDEDED]">
          {step.title}
        </h2>
        <div className="hidden md:block">
          <ProgressBar done={done} total={total} />
        </div>
        <span className="text-right text-sm tabular-nums text-[#A1A1A1]">
          {done}/{total}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {step.subsections.map((sub) => (
            <SubSectionRow
              key={sub.id}
              sub={sub}
              stepId={step.id}
              expanded={expandedSubs.has(sub.id)}
              onToggle={() => onToggleSub(sub.id)}
              progressState={progressState}
              onToggleProb={onToggleProb}
              onSkipProb={onSkipProb}
              hideSkipped={hideSkipped}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
