import { useCallback, useEffect, useMemo, useState } from "react";

function safeLocalStorageGet(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function useProblemTree({ data, progress, getState, update }) {
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
  const [activeFilter, setActiveFilter] = useState(
    () => safeLocalStorageGet("momentum:learning-filter", "all"),
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        "momentum:learning-expanded-steps",
        JSON.stringify([...expandedSteps]),
      );
    } catch {
      // ignore quota errors
    }
  }, [expandedSteps]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "momentum:learning-expanded-subs",
        JSON.stringify([...expandedSubs]),
      );
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
      data.steps.flatMap((step) =>
        step.subsections.flatMap((subsection) => subsection.problems),
      ),
    [data.steps],
  );
  const totalProblems = useMemo(
    () =>
      data.steps.reduce(
        (sum, step) =>
          sum +
          step.subsections.reduce(
            (subsectionTotal, subsection) =>
              subsectionTotal + subsection.problems.length,
            0,
          ),
        0,
      ),
    [data.steps],
  );
  const doneCount = sheetProblems.filter(
    (problem) => progress[problem.id] === "done",
  ).length;
  const skippedCount = sheetProblems.filter(
    (problem) => progress[problem.id] === "skipped",
  ).length;
  const todoCount = totalProblems - doneCount - skippedCount;
  const problemMap = useMemo(
    () =>
      new Map(
        sheetProblems.map((problem) => [problem.id, problem]),
      ),
    [sheetProblems],
  );

  const progressState = useCallback(
    (id) => {
      const problem = problemMap.get(id);
      if (!problem) return "todo";
      return getState(id, problem.defaultSkip);
    },
    [getState, problemMap],
  );

  const handleToggle = useCallback(
    (id) => {
      const current = progressState(id);
      update(id, current === "done" ? "todo" : "done");
    },
    [progressState, update],
  );
  const handleSkip = useCallback(
    (id) => {
      const current = progressState(id);
      update(id, current === "skipped" ? "todo" : "skipped");
    },
    [progressState, update],
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
      data.steps.flatMap((step) =>
        step.subsections.map((subsection) => subsection.id),
      ),
    );
    setExpandedSteps(allSteps);
    setExpandedSubs(allSubsections);
  }, [data]);
  const collapseAll = useCallback(() => {
    setExpandedSteps(new Set());
    setExpandedSubs(new Set());
  }, []);

  const filteredSteps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.steps
      .map((step) => {
        const subsections = step.subsections
          .map((subsection) => {
            const problems = subsection.problems.filter((problem) => {
              const state = getState(problem.id, problem.defaultSkip);
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
  }, [activeFilter, data, getState, hideSkipped, search]);

  const chipActive = (type) =>
    activeFilter === type
      ? "bg-[#EDEDED] text-black"
      : "bg-[#0A0A0A] text-[#A1A1A1] hover:text-white";

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
