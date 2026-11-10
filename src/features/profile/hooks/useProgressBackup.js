import { useRef } from "react";

function normalizeProblemTitle(title) {
  return String(title).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function useProgressBackup({
  availableSheets,
  progress,
  bulkUpdate,
  showNotice,
  setBackupAction,
}) {
  const importSheetId = useRef(null);
  const importFileInput = useRef(null);

  const exportProgress = (sheet) => {
    const idPrefix = `${sheet.id}::`;
    const allProblems = sheet.sheet.steps.flatMap((step) =>
      step.subsections.flatMap((subsection) => subsection.problems),
    );
    const exportData = {};
    allProblems.forEach((problem) => {
      const id = `${idPrefix}${problem.id}`;
      const state = progress[id];
      if (state === "done" || state === "skipped") {
        exportData[problem.title] = { id, state };
      }
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = sheet.title
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    link.download = `${safeTitle || "sheet"}-progress.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupAction("");
  };

  const importProgress = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const fileContent = loadEvent.target.result;
        const imported = JSON.parse(fileContent);
        if (
          !imported ||
          typeof imported !== "object" ||
          Array.isArray(imported)
        ) {
          showNotice(
            "Invalid backup file format. Choose a progress backup JSON exported from your profile.",
            "Invalid backup",
          );
          return;
        }
        const targetSheetId = importSheetId.current;
        const targetSheet = availableSheets.find(
          (sheet) => sheet.id === targetSheetId,
        );
        if (!targetSheet) {
          showNotice("Select a valid sheet before importing progress.", "Choose a sheet");
          return;
        }
        const idPrefix = `${targetSheet.id}::`;
        const targetProblems = targetSheet.sheet.steps.flatMap((step) =>
          step.subsections.flatMap((subsection) =>
            subsection.problems.map((problem) => ({
              id: `${idPrefix}${problem.id}`,
              localId: String(problem.id),
              normalizedTitle: normalizeProblemTitle(problem.title),
            })),
          ),
        );
        const targetById = new Map(
          targetProblems.map((problem) => [problem.id, problem]),
        );
        const targetByTitle = new Map();
        for (const problem of targetProblems) {
          const matches = targetByTitle.get(problem.normalizedTitle) || [];
          matches.push(problem);
          targetByTitle.set(problem.normalizedTitle, matches);
        }
        const newProgress = {};
        for (const [title, value] of Object.entries(imported)) {
          if (!value || typeof value !== "object") continue;
          const state = value.state;
          if (state !== "done" && state !== "skipped") continue;

          const sourceId = typeof value.id === "string" ? value.id : "";
          const directMatch = targetById.get(sourceId);
          const titleMatches =
            targetByTitle.get(normalizeProblemTitle(title)) || [];
          const sourceLocalId = sourceId.split("::").at(-1);
          const localIdMatch = titleMatches.find(
            (problem) => problem.localId === sourceLocalId,
          );
          const matchedProblem =
            directMatch ||
            localIdMatch ||
            (titleMatches.length === 1 ? titleMatches[0] : null);
          if (matchedProblem) newProgress[matchedProblem.id] = state;
        }
        const importedCount = Object.keys(newProgress).length;
        if (importedCount === 0) {
          showNotice(
            `No matching problem states were found for ${targetSheet.title}. Choose a backup with matching problem names or IDs.`,
            "No matching progress",
          );
          return;
        }
        const saved = await bulkUpdate(newProgress);
        if (!saved) {
          showNotice(
            "The backup was read, but progress could not be saved to your account. Check the sync error and try again.",
            "Could not save backup",
          );
          return;
        }
        showNotice(
          `Successfully imported ${importedCount} problem states into ${targetSheet.title}.`,
          "Import complete",
        );
      } catch (error) {
        console.error("Import error details:", error);
        showNotice(
          `Failed to import backup file: ${error.message}`,
          "Import failed",
        );
      }
    };
    reader.onerror = () =>
      showNotice("Failed to read backup file.", "Import failed");
    reader.readAsText(file);
    event.target.value = "";
    setBackupAction("");
  };

  return { exportProgress, importFileInput, importProgress, importSheetId };
}
