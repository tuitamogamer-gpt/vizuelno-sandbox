export const views = ["home", "projects", "guide", "playground", "settings", "editor", "account", "submissions", "teacher"] as const;
export type View = typeof views[number];
export type StudioLocation = { view: View; projectId: string | null; step: number };
export const defaultLocation: StudioLocation = { view: "home", projectId: null, step: 0 };
export function parseLocation(search: string): StudioLocation {
  const params = new URLSearchParams(search);
  const view = views.includes(params.get("view") as View) ? params.get("view") as View : "home";
  const id = params.get("project");
  const projectId = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  const rawStep = Number(params.get("step") || 1);
  const step = Number.isInteger(rawStep) && rawStep >= 1 && rawStep <= 7 ? rawStep - 1 : 0;
  return { view, projectId, step };
}
export function studioUrl(location: StudioLocation) {
  const params = new URLSearchParams();
  if (location.view !== "home") params.set("view", location.view);
  if (location.view === "editor" && location.projectId) { params.set("project", location.projectId); params.set("step", String(location.step + 1)); }
  return `/studio${params.size ? `?${params}` : ""}`;
}
export function resolveLocation(location: StudioLocation, projectIds: string[]): StudioLocation {
  if (location.view === "editor" && (!location.projectId || !projectIds.includes(location.projectId))) return { view: "projects", projectId: null, step: 0 };
  return location;
}
