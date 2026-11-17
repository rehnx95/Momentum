import { useEffect, useMemo, useRef, useState } from "react";
import { readUserDataCache, writeUserDataCache } from "../../../shared/lib/userDataCache";
import { supabase } from "../../../shared/lib/supabase";
import { countSheetProblems, parseSheet, sampleSheetTemplate } from "../utils/parseSheet";
import { getUploadedSheetTitle } from "../utils/sheetTitle";
import { bootstrapBuiltInSheets, loadBuiltInSheet } from "../data/bootstrapBuiltInSheets";

export default function useSheetLibrary(user, askConfirmation) {
  const [cachedSheets] = useState(() => readUserDataCache(user.id, "sheets"));
  const [customSheetsLoading, setCustomSheetsLoading] = useState(
    () => !Array.isArray(cachedSheets),
  );
  const [customSheets, setCustomSheets] = useState(() =>
    Array.isArray(cachedSheets)
      ? cachedSheets.map((sheet) => ({
          ...sheet,
          title: getUploadedSheetTitle(sheet.sourceName) || sheet.title,
        }))
      : [],
  );
  const [uploadingSheet, setUploadingSheet] = useState(false);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const [restoringDsaSheet, setRestoringDsaSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const uploadSheetInput = useRef(null);
  const savedSheetIdRef = useRef(null);
  try {
    savedSheetIdRef.current = localStorage.getItem("momentum:learning-active-sheet");
  } catch {
    savedSheetIdRef.current = null;
  }
  const [selectedSheetId, setSelectedSheetId] = useState(() => savedSheetIdRef.current || "");

  const availableSheets = useMemo(
    () => [...customSheets].sort((a, b) => a.title.localeCompare(b.title)),
    [customSheets],
  );
  const selectedSheet =
    availableSheets.find((sheet) => sheet.id === selectedSheetId) || availableSheets[0];
  const data = useMemo(() => {
    if (!selectedSheet) return { steps: [] };
    const problemIdPrefix = `${selectedSheet.id}::`;
    return {
      steps: selectedSheet.sheet.steps.map((step) => ({
        ...step,
        id: `${selectedSheet.id}::${step.id}`,
        subsections: step.subsections.map((subsection) => ({
          ...subsection,
          id: `${selectedSheet.id}::${subsection.id}`,
          problems: subsection.problems.map((problem) => ({
            ...problem,
            id: `${problemIdPrefix}${problem.id}`,
          })),
        })),
      })),
    };
  }, [selectedSheet]);

  useEffect(() => {
    if (!sheetError) return undefined;
    const timer = window.setTimeout(() => setSheetError(""), 3000);
    return () => window.clearTimeout(timer);
  }, [sheetError]);

  useEffect(() => {
    if (!customSheetsLoading) {
      writeUserDataCache(user.id, "sheets", customSheets);
    }
  }, [customSheets, customSheetsLoading, user.id]);

  useEffect(() => {
    let active = true;
    const loadSheets = async () => {
      try {
        const defaultSheetId = await bootstrapBuiltInSheets(user.id, () => active);
        if (!active) return;

        const { data: savedSheets, error } = await supabase
          .from("user_sheets")
          .select("id, title, source_name, sheet_data, created_at, builtin_template_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!active) return;
        const loadedSheets = savedSheets.map((row) => ({
          id: `custom-${row.id}`,
          customId: row.id,
          builtinTemplateId: row.builtin_template_id,
          title: getUploadedSheetTitle(row.source_name) || row.title,
          sourceName: row.source_name,
          sheet: row.sheet_data,
          problemCount: countSheetProblems(row.sheet_data),
        }));
        setCustomSheets(loadedSheets);
        const savedSheetId = savedSheetIdRef.current;
        const savedSheet = loadedSheets.find(
          (sheet) => sheet.id === savedSheetId || sheet.builtinTemplateId === savedSheetId,
        );
        const defaultSheet =
          loadedSheets.find((sheet) => sheet.builtinTemplateId === defaultSheetId) ||
          loadedSheets[0];
        setSelectedSheetId((savedSheet || defaultSheet)?.id || "");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load sheets:", error);
        setSheetError(
          "Could not load your sheets. Apply the latest Supabase sheet migration and try again.",
        );
      } finally {
        if (active) setCustomSheetsLoading(false);
      }
    };
    void loadSheets();
    return () => {
      active = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (selectedSheet) {
      try {
        localStorage.setItem("momentum:learning-active-sheet", selectedSheet.id);
      } catch {
        // ignore quota errors
      }
    }
  }, [selectedSheet]);

  const handleUploadSheet = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSheetError("");
    setUploadingSheet(true);
    try {
      if (!file.name.toLowerCase().endsWith(".txt")) {
        throw new Error("Choose a .txt file to upload.");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("The TXT file must be smaller than 2 MB.");
      }
      const sheetData = parseSheet(await file.text());
      const title = getUploadedSheetTitle(file.name);
      if (!title) {
        throw new Error("The file needs a name to use as its sheet title.");
      }
      if (title.length > 80) {
        throw new Error("Sheet names must be 80 characters or fewer.");
      }

      const { data: savedSheet, error } = await supabase
        .from("user_sheets")
        .insert({
          user_id: user.id,
          title,
          source_name: file.name,
          sheet_data: sheetData,
        })
        .select("id, title, source_name, sheet_data")
        .single();
      if (error) throw error;

      const nextSheet = {
        id: `custom-${savedSheet.id}`,
        customId: savedSheet.id,
        title: savedSheet.title,
        sourceName: savedSheet.source_name,
        sheet: savedSheet.sheet_data,
        problemCount: countSheetProblems(savedSheet.sheet_data),
      };
      setCustomSheets((current) => [...current, nextSheet]);
      setSelectedSheetId(nextSheet.id);
      localStorage.setItem("momentum:learning-active-sheet", nextSheet.id);
    } catch (error) {
      console.error("Failed to upload sheet:", error);
      setSheetError(error.message || "Could not upload this sheet. Please try again.");
    } finally {
      setUploadingSheet(false);
    }
  };

  const handleRemoveSheet = async (sheet, resetProgress) => {
    if (!sheet.customId) return;
    const confirmed = await askConfirmation(
      `Permanently delete "${sheet.title}" and all of its saved progress? This cannot be undone.`,
      "Delete this sheet?",
    );
    if (!confirmed) return;

    setSheetError("");
    setDeletingSheetId(sheet.id);
    try {
      const { data: removed, error } = await supabase.rpc("delete_user_sheet", {
        requested_sheet_id: sheet.customId,
      });
      if (error) throw error;
      if (!removed) throw new Error("This sheet could not be found.");

      const problemIds = sheet.sheet.steps.flatMap((step) =>
        step.subsections.flatMap((subsection) =>
          subsection.problems.flatMap((problem) => {
            const ids = [`${sheet.id}::${problem.id}`];
            if (sheet.builtinTemplateId) {
              ids.push(
                sheet.builtinTemplateId === "dsa"
                  ? problem.id
                  : `${sheet.builtinTemplateId}::${problem.id}`,
              );
            }
            return ids;
          }),
        ),
      );
      await resetProgress(problemIds, { persist: false });
      setCustomSheets((current) => current.filter((customSheet) => customSheet.id !== sheet.id));

      if (selectedSheetId === sheet.id) {
        const nextSheet = availableSheets.find((availableSheet) => availableSheet.id !== sheet.id);
        setSelectedSheetId(nextSheet?.id || "");
        if (nextSheet) {
          localStorage.setItem("momentum:learning-active-sheet", nextSheet.id);
        } else {
          localStorage.removeItem("momentum:learning-active-sheet");
        }
      }
    } catch (error) {
      console.error("Failed to permanently delete sheet:", error);
      setSheetError(error.message || "Could not remove this sheet. Please try again.");
    } finally {
      setDeletingSheetId(null);
    }
  };

  const restoreDsaSheet = async (resetProgress) => {
    if (customSheetsLoading) {
      throw new Error("Wait for your sheets to finish loading before restoring DSA.");
    }
    if (typeof resetProgress !== "function") {
      throw new Error("Progress reset is unavailable. Please reload and try again.");
    }

    setRestoringDsaSheet(true);
    try {
      const template = await loadBuiltInSheet("dsa");
      const { data: restored, error } = await supabase.rpc("restore_builtin_dsa_sheet", {
        requested_sheet: {
          id: template.id,
          title: template.title,
          sheet_data: template.sheet,
        },
      });
      if (error) throw error;
      if (!restored || typeof restored.id !== "string") {
        throw new Error("The restored DSA sheet could not be loaded.");
      }

      const nextSheet = {
        id: `custom-${restored.id}`,
        customId: restored.id,
        builtinTemplateId: "dsa",
        title: template.title,
        sourceName: "builtin:dsa",
        sheet: template.sheet,
        problemCount: countSheetProblems(template.sheet),
      };
      const problemIds = template.sheet.steps.flatMap((step) =>
        step.subsections.flatMap((subsection) =>
          subsection.problems.flatMap((problem) => [problem.id, `${nextSheet.id}::${problem.id}`]),
        ),
      );
      await resetProgress(problemIds, { persist: false });
      setCustomSheets((current) => [
        ...current.filter((sheet) => sheet.builtinTemplateId !== "dsa"),
        nextSheet,
      ]);
      setSelectedSheetId(nextSheet.id);
    } catch (error) {
      console.error("Failed to restore DSA sheet:", error);
      throw error;
    } finally {
      setRestoringDsaSheet(false);
    }
  };

  const downloadSampleFormat = () => {
    const url = URL.createObjectURL(
      new Blob([sampleSheetTemplate], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample-sheet.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    availableSheets,
    selectedSheet,
    selectedSheetId,
    setSelectedSheetId,
    customSheetsLoading,
    uploadingSheet,
    deletingSheetId,
    restoringDsaSheet,
    sheetError,
    setSheetError,
    uploadSheetInput,
    data,
    handleUploadSheet,
    handleRemoveSheet,
    restoreDsaSheet,
    downloadSampleFormat,
  };
}
