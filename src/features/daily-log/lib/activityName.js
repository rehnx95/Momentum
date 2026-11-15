function sheetIdFor(activity) {
  const explicitId = activity?.sheetId ?? activity?.sheet_id;
  if (explicitId != null && String(explicitId).trim()) return String(explicitId).trim();

  const id = String(activity?.id || "");
  return id.startsWith("sheet:") ? id.slice("sheet:".length) : "";
}

export function normalizeActivityName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function isSheetActivity(activity) {
  return Boolean(sheetIdFor(activity));
}

export function findSheetByTitle(name, sheets = []) {
  const normalizedName = normalizeActivityName(name);
  if (!normalizedName) return undefined;
  return sheets.find((sheet) => normalizeActivityName(sheet.title) === normalizedName);
}

export function getActivityDisplayName(activity, sheets = []) {
  const name = String(activity?.name || "").trim();
  if (!isSheetActivity(activity)) return name;

  const sheetId = sheetIdFor(activity);
  const matchingSheet = sheets.find((sheet) => String(sheet.id) === sheetId);
  return String(matchingSheet?.title || findSheetByTitle(name, sheets)?.title || name).trim();
}
