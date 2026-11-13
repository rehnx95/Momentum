import { useEffect, useMemo, useRef, useState } from "react";
import { getItem, removeItem, setItem } from "../../../shared/lib/safeStorage";
import { readUserDataCache, writeUserDataCache } from "../../../shared/lib/userDataCache";
import { supabase } from "../../../shared/lib/supabase";
import {
  countSheetProblems,
  parseSheet,
  sampleSheetTemplate,
} from "../utils/parseSheet";
import { bootstrapBuiltInSheets } from "../data/bootstrapBuiltInSheets";

export default function useSheetLibrary(user, askConfirmation) {
  const [cachedSheets] = useState(() => readUserDataCache(user.id, "sheets"));
  const [customSheetsLoading, setCustomSheetsLoading] = useState(
    () => !Array.isArray(cachedSheets),
  );
  const [sheetBootstrapComplete, setSheetBootstrapComplete] = useState(false);
  const [customSheets, setCustomSheets] = useState(
    () => (Array.isArray(cachedSheets) ? cachedSheets : []),
  );
  const [uploadingSheet, setUploadingSheet] = useState(false);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const [sheetError, setSheetError] = useState("");
  const uploadSheetInput = useRef(null);
  const savedSheetIdRef = useRef(
    getItem("momentum:learning-active-sheet"),
  );
  const [selectedSheetId, setSelectedSheetId] = useState(
    () => savedSheetIdRef.current || "",
  );

  const availableSheets = useMemo(
    () => [...customSheets].sort((a, b) => a.title.localeCompare(b.title)),
    [customSheets],
  );
  const selectedSheet =
    availableSheets.find((sheet) => sheet.id === selectedSheetId) ||
    availableSheets[0];
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
        const defaultSheetId = await bootstrapBuiltInSheets(
          user.id,
          () => active,
        );
        if (!active) return;
        setSheetBootstrapComplete(true);

        const { data: savedSheets, error } = await supabase
          .from("user_sheets")
          .select(
            "id, title, source_name, sheet_data, created_at, builtin_template_id",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!active) return;
        const loadedSheets = savedSheets.map((row) => ({
          id: `custom-${row.id}`,
          customId: row.id,
          builtinTemplateId: row.builtin_template_id,
          title: row.title,
          sourceName: row.source_name,
          sheet: row.sheet_data,
          problemCount: countSheetProblems(row.sheet_data),
        }));
        setCustomSheets(loadedSheets);
        const savedSheetId = savedSheetIdRef.current;
        const savedSheet = loadedSheets.find(
          (sheet) =>
            sheet.id === savedSheetId ||
            sheet.builtinTemplateId === savedSheetId,
        );
        const defaultSheet =
          loadedSheets.find(
            (sheet) => sheet.builtinTemplateId === defaultSheetId,
          ) || loadedSheets[0];
        setSelectedSheetId((savedSheet || defaultSheet)?.id || "");
      } catch (error) {
        if (!active) return;
        setSheetBootstrapComplete(true);
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
      setItem("momentum:learning-active-sheet", selectedSheet.id);
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
      const fileBaseName = file.name.replace(/\.txt$/i, "").trim();
      const title = fileBaseName
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
        .slice(0, 80);
      if (!title) {
        throw new Error("The file needs a name to use as its sheet title.");
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
      setItem("momentum:learning-active-sheet", nextSheet.id);
    } catch (error) {
      console.error("Failed to upload sheet:", error);
      setSheetError(
        error.message || "Could not upload this sheet. Please try again.",
      );
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
      const { data: removed, error } = await supabase.rpc(
        "delete_user_sheet",
        { requested_sheet_id: sheet.customId },
      );
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
      setCustomSheets((current) =>
        current.filter((customSheet) => customSheet.id !== sheet.id),
      );

      if (selectedSheetId === sheet.id) {
        const nextSheet = availableSheets.find(
          (availableSheet) => availableSheet.id !== sheet.id,
        );
        setSelectedSheetId(nextSheet?.id || "");
        if (nextSheet) {
          setItem("momentum:learning-active-sheet", nextSheet.id);
        } else {
          removeItem("momentum:learning-active-sheet");
        }
      }
    } catch (error) {
      console.error("Failed to permanently delete sheet:", error);
      setSheetError(
        error.message || "Could not remove this sheet. Please try again.",
      );
    } finally {
      setDeletingSheetId(null);
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
    sheetBootstrapComplete,
    customSheetsLoading,
    uploadingSheet,
    deletingSheetId,
    sheetError,
    setSheetError,
    uploadSheetInput,
    data,
    handleUploadSheet,
    handleRemoveSheet,
    downloadSampleFormat,
  };
}
