import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATE_FILTERS = new Set(["done", "skipped", "todo"]);
const EMPTY_PROGRESS = {};

function safeLocalStorageGet(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function useProblemTree({ data, progress, getState, update, enabled = true }) {
  const [search, setSearch] = useState(() => safeLocalStorageGet("momentum:learning-search", ""));
  const [expandedSteps, setExpandedSteps] = useState(() => {
    try {
      const stored = localStorage.getItem("momentum:learning-expanded-steps");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [expandedSubs, setExpandedSubs] = useState(() => {
    try {
      const stored = localStorage.getItem("momentum:learning-expanded-subs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [hideSkipped, setHideSkipped] = useState(() => {
    try {
      return localStorage.getItem("momentum:learning-hide-skipped") === "true";
    } catch {
      return false;
    }
  });
  const [activeFilter, setActiveFilter] = useState(() =>
    safeLocalStorageGet("momentum:learning-filter", "all"),
  );

  useEffect(() => {
    try {
      localStorage.setItem("momentum:learning-expanded-steps", JSON.stringify([...expandedSteps]));
    } catch {
      // ignore quota errors
    }
  }, [expandedSteps]);
  useEffect(() => {
    try {
      localStorage.setItem("momentum:learning-expanded-subs", JSON.stringify([...expandedSubs]));
    } catch {
      // ignore quota errors
    }
  }, [expandedSubs]);
  useEffect(() => {
    try {
      localStorage.setItem("momentum:learning-hide-skipped", String(hideSkipped));
    } catch {
      // ignore quota errors
    }
  }, [hideSkipped]);
  useEffect(() => {
    try {
      localStorage.setItem("momentum:learning-filter", activeFilter);
    } catch {
      // ignore quota errors
    }
  }, [activeFilter]);
  useEffect(() => {
    try {
      localStorage.setItem("momentum:learning-search", search);
    } catch {
      // ignore quota errors
    }
  }, [search]);

  const sheetProblems = useMemo(
    () =>
      enabled
        ? data.steps.flatMap((step) =>
            step.subsections.flatMap((subsection) => subsection.problems),
          )
        : [],
    [data.steps, enabled],
  );
  const totalProblems = useMemo(
    () =>
      enabled
        ? data.steps.reduce(
            (sum, step) =>
              sum +
              step.subsections.reduce(
                (subsectionTotal, subsection) => subsectionTotal + subsection.problems.length,
                0,
              ),
            0,
          )
        : 0,
    [data.steps, enabled],
  );
  const { doneCount, skippedCount } = useMemo(
    () =>
      sheetProblems.reduce(
        (counts, problem) => {
          if (progress[problem.id] === "done") counts.doneCount += 1;
          else if (progress[problem.id] === "skipped") counts.skippedCount += 1;
          return counts;
        },
        { doneCount: 0, skippedCount: 0 },
      ),
    [progress, sheetProblems],
  );
  const todoCount = totalProblems - doneCount - skippedCount;
  const problemMap = useMemo(
    () => new Map(sheetProblems.map((problem) => [problem.id, problem])),
    [sheetProblems],
  );
  const filterByState = hideSkipped || STATE_FILTERS.has(activeFilter);
  const filterProgress = filterByState ? progress : EMPTY_PROGRESS;

  const progressState = useCallback(
    (id) => {
      const problem = problemMap.get(id);
      if (!problem) return "todo";
      return getState(id);
    },
    [getState, problemMap],
  );
  const progressStateRef = useRef(progressState);
  progressStateRef.current = progressState;

  const handleToggle = useCallback(
    (id) => {
      const current = progressStateRef.current(id);
      update(id, current === "done" ? "todo" : "done");
    },
    [update],
  );
  const handleSkip = useCallback(
    (id) => {
      const current = progressStateRef.current(id);
      update(id, current === "skipped" ? "todo" : "skipped");
    },
    [update],
  );
  const toggleStep = useCallback((id) => {
    setExpandedSteps((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleSub = useCallback((id) => {
    setExpandedSubs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => {
    const allSteps = new Set(data.steps.map((step) => step.id));
    const allSubsections = new Set(
      data.steps.flatMap((step) => step.subsections.map((subsection) => subsection.id)),
    );
    setExpandedSteps(allSteps);
    setExpandedSubs(allSubsections);
  }, [data]);
  const collapseAll = useCallback(() => {
    setExpandedSteps(new Set());
    setExpandedSubs(new Set());
  }, []);

  const filteredSteps = useMemo(() => {
    if (!enabled) return [];
    const query = search.trim().toLowerCase();
    if (!query && !filterByState) return data.steps;

    return data.steps
      .map((step) => {
        const subsections = step.subsections
          .map((subsection) => {
            const problems = subsection.problems.filter((problem) => {
              const state = filterProgress[problem.id] || "todo";
              return (
                (!query || problem.title.toLowerCase().includes(query)) &&
                (!hideSkipped || state !== "skipped") &&
                (activeFilter === "all" ||
                  !["done", "skipped", "todo"].includes(activeFilter) ||
                  state === activeFilter)
              );
            });
            return { ...subsection, problems };
          })
          .filter((subsection) => subsection.problems.length > 0);
        return { ...step, subsections };
      })
      .filter((step) => step.subsections.length > 0);
  }, [activeFilter, data, enabled, filterByState, filterProgress, hideSkipped, search]);

  const chipActive = (type) =>
    (type === "skip-visibility" ? hideSkipped : activeFilter === type)
      ? "tracker-filter-chip-active"
      : "tracker-filter-chip-inactive";

  return {
    search,
    setSearch,
    expandedSteps,
    expandedSubs,
    hideSkipped,
    setHideSkipped,
    activeFilter,
    setActiveFilter,
    totalProblems,
    sheetProblems,
    doneCount,
    skippedCount,
    todoCount,
    progressState,
    handleToggle,
    handleSkip,
    toggleStep,
    toggleSub,
    expandAll,
    collapseAll,
    filteredSteps,
    chipActive,
  };
}
