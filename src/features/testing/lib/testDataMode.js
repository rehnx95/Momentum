export const isTestDataToolsEnabled = Boolean(
  import.meta.env.DEV &&
  import.meta.env.MODE === "test" &&
  import.meta.env.VITE_ENABLE_SAMPLE_DATA_TOOLS === "true",
);
