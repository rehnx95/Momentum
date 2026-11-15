import { supabase } from "../../../shared/lib/supabase";

const sheetModules = import.meta.glob("./*.json", { import: "default" });
const sheetAssets = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
  query: "?url",
});

function getSheetManifestVersion() {
  let hash = 2166136261;
  const manifest = JSON.stringify(
    Object.entries(sheetAssets).sort(([first], [second]) => first.localeCompare(second)),
  );
  for (let index = 0; index < manifest.length; index += 1) {
    hash ^= manifest.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getSheetId(filePath) {
  return filePath.split("/").pop().replace(/\.json$/i, "");
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
    const { error } = await supabase.rpc("ensure_builtin_sheet_copies", {
      requested_sheets: builtInSheets.map((sheet) => ({
        id: sheet.id,
        title: sheet.title,
        sheet_data: sheet.sheet,
      })),
    });
    if (error) throw error;
    try {
      localStorage.setItem(bootstrapKey, manifestVersion);
    } catch (error) {
      console.warn("Could not cache built-in sheet setup locally:", error);
    }
  }
  return defaultSheetId;
}
