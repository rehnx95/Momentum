import { getItem, setItem } from "../../../shared/lib/safeStorage";
import { supabase } from "../../../shared/lib/supabase";

const sheetModules = import.meta.glob("./*.json", { import: "default" });

function getSheetManifestVersion(sheets) {
  let hash = 2166136261;
  const manifest = JSON.stringify(
    sheets.map(({ id, title, sheet }) => ({ id, title, sheet })),
  );
  for (let index = 0; index < manifest.length; index += 1) {
    hash ^= manifest.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export async function bootstrapBuiltInSheets(userId, isActive = () => true) {
  const sheetEntries = await Promise.all(
    Object.entries(sheetModules).map(async ([filePath, load]) => [
      filePath,
      await load(),
    ]),
  );
  if (!isActive()) return undefined;
  const builtInSheets = sheetEntries
    .filter(([, sheet]) => Array.isArray(sheet?.steps))
    .map(([filePath, sheet]) => {
      const id = filePath.split("/").pop().replace(/\.json$/i, "");
      return {
        id,
        title:
          id === "dsa"
            ? "DSA"
            : id
                .replace(/[_-]+/g, " ")
                .replace(/\b\w/g, (character) => character.toUpperCase()),
        sheet,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const defaultSheetId =
    builtInSheets.find((sheet) => sheet.id === "dsa")?.id ||
    builtInSheets[0]?.id;
  const manifestVersion = getSheetManifestVersion(builtInSheets);
  const bootstrapKey = `momentum:builtins:${userId}`;
  let isBootstrapped = false;
  try {
    isBootstrapped = getItem(bootstrapKey) === manifestVersion;
  } catch {
    isBootstrapped = false;
  }
  if (!isBootstrapped) {
    const { error } = await supabase.rpc("ensure_builtin_sheet_copies", {
      requested_sheets: builtInSheets.map((sheet) => ({
        id: sheet.id,
        title: sheet.title,
        sheet_data: sheet.sheet,
      })),
    });
    if (error) throw error;
    if (!setItem(bootstrapKey, manifestVersion)) {
      console.warn("Could not cache built-in sheet setup locally.");
    }
  }
  return defaultSheetId;
}
