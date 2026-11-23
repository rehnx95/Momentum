export const BUILT_IN_SHEET_IDS = Object.freeze(["dsa", "backend"]);

export function isBuiltInSheet(sheet) {
  return BUILT_IN_SHEET_IDS.includes(sheet?.builtinTemplateId);
}
