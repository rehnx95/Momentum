import { supabase } from "../../../shared/lib/supabase";

const sheetModules = import.meta.glob("./*.json", { import: "default" });
const sheetAssets = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
  query: "?url",
});
const BUILTIN_SYNC_VERSION = "sheet-metadata-v2";

function getSheetManifestVersion() {
  let hash = 2166136261;
  const manifest = JSON.stringify({
    syncVersion: BUILTIN_SYNC_VERSION,
    assets: Object.entries(sheetAssets).sort(([first], [second]) => first.localeCompare(second)),
  });
  for (let index = 0; index < manifest.length; index += 1) {
    hash ^= manifest.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getSheetId(filePath) {
  return filePath
    .split("/")
    .pop()
    .replace(/\.json$/i, "");
}

function getSheetTitle(id) {
  return id === "dsa"
    ? "DSA"
    : id.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getDefaultSheetId(sheetIds) {
  return sheetIds.includes("dsa")
    ? "dsa"
    : sheetIds.sort((first, second) =>
        getSheetTitle(first).localeCompare(getSheetTitle(second)),
      )[0];
}

export async function loadBuiltInSheet(id) {
  const loadSheet = sheetModules[`./${id}.json`];
  if (!loadSheet) {
    throw new Error(`The built-in "${id}" sheet could not be found.`);
  }
  const sheet = await loadSheet();
  if (!Array.isArray(sheet?.steps)) {
    throw new Error(`The built-in "${id}" sheet is invalid.`);
  }
  return { id, title: getSheetTitle(id), sheet };
}

export async function bootstrapBuiltInSheets(userId, isActive = () => true) {
  const manifestVersion = getSheetManifestVersion();
  const bootstrapKey = `momentum:builtins:${userId}`;
  let isBootstrapped = false;
  try {
    isBootstrapped = localStorage.getItem(bootstrapKey) === manifestVersion;
  } catch {
    isBootstrapped = false;
  }

  if (isBootstrapped && !import.meta.env.DEV) {
    return getDefaultSheetId(Object.keys(sheetModules).map(getSheetId));
  }

  const sheetEntries = await Promise.all(
    Object.entries(sheetModules).map(async ([filePath, load]) => [filePath, await load()]),
  );
  if (!isActive()) return undefined;
  const builtInSheets = sheetEntries
    .filter(([, sheet]) => Array.isArray(sheet?.steps))
    .map(([filePath, sheet]) => {
      const id = getSheetId(filePath);
      return {
        id,
        title: getSheetTitle(id),
        sheet,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const defaultSheetId = getDefaultSheetId(builtInSheets.map(({ id }) => id));
  if (!isBootstrapped) {
    const requestedSheets = builtInSheets.map((sheet) => ({
      id: sheet.id,
      title: sheet.title,
      sheet_data: sheet.sheet,
    }));
    const { error } = await supabase.rpc("ensure_builtin_sheet_copies", {
      requested_sheets: requestedSheets,
    });
    if (error) throw error;
    const { error: syncError } = await supabase.rpc("sync_builtin_sheet_problem_titles", {
      requested_sheets: requestedSheets,
    });
    if (syncError) throw syncError;
    const { error: linkSyncError } = await supabase.rpc("sync_builtin_sheet_problem_links", {
      requested_sheets: requestedSheets,
    });
    if (linkSyncError) throw linkSyncError;
    try {
      localStorage.setItem(bootstrapKey, manifestVersion);
    } catch (error) {
      console.warn("Could not cache built-in sheet setup locally:", error);
    }
  }
  return defaultSheetId;
}
