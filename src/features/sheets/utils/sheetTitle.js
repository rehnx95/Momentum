export function getUploadedSheetTitle(sourceName) {
  const fileName = String(sourceName || "").trim();
  if (!fileName || fileName.startsWith("builtin:")) return "";
  return fileName.replace(/\.txt$/i, "").trim();
}
