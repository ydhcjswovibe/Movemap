export function createProjectJsonDownload(plan) {
  const title = String(plan?.title || "").trim() || "movemap-project";

  return {
    blob: new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" }),
    filename: `${title}.json`
  };
}
