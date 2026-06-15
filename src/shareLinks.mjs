export const LINK_TYPES = Object.freeze({
  view: "view",
  edit: "edit"
});

function cleanProjectId(projectId) {
  return typeof projectId === "string" ? decodeURIComponent(projectId.trim()) : "";
}

function cleanToken(token) {
  return typeof token === "string" ? token.trim() : "";
}

export function linkModeFromPathname(pathname = "") {
  return linkModeFromLocation({ pathname, search: "" });
}

export function linkModeFromLocation({ pathname = "", search = "" } = {}) {
  const path = (typeof pathname === "string" ? pathname : "").replace(/\/+$/, "") || "/";
  const [, route = "", rawId = ""] = path.match(/^\/(share|edit)\/([^/?#]+)$/) || [];
  const projectId = cleanProjectId(rawId);
  if (!projectId) return { projectId: "", linkType: "", editToken: "", readonly: false };
  if (route === "edit") {
    const params = new URLSearchParams(typeof search === "string" ? search : "");
    return { projectId, linkType: LINK_TYPES.edit, editToken: cleanToken(params.get("token")), readonly: true };
  }
  return { projectId, linkType: LINK_TYPES.view, editToken: "", readonly: true };
}

export function normalizeProjectShareLinks(shareLinks = {}) {
  return {
    [LINK_TYPES.view]: normalizeLinkRecord(shareLinks[LINK_TYPES.view]),
    [LINK_TYPES.edit]: normalizeLinkRecord(shareLinks[LINK_TYPES.edit])
  };
}

function normalizeLinkRecord(record = {}) {
  return {
    projectId: cleanProjectId(record.projectId),
    token: cleanToken(record.token),
    enabled: record.enabled !== false
  };
}

export function createEditLinkToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function projectWithShareLink(plan, { linkType = LINK_TYPES.view, projectId, token = "" }) {
  const normalizedType = linkType === LINK_TYPES.edit ? LINK_TYPES.edit : LINK_TYPES.view;
  const shareLinks = normalizeProjectShareLinks(plan?.shareLinks);
  return {
    ...plan,
    shareLinks: {
      ...shareLinks,
      [normalizedType]: {
        projectId: cleanProjectId(projectId),
        token: normalizedType === LINK_TYPES.edit ? cleanToken(token) : "",
        enabled: true
      }
    }
  };
}

export function projectWithShareLinkEnabled(plan, linkType = LINK_TYPES.view, enabled = true) {
  const normalizedType = linkType === LINK_TYPES.edit ? LINK_TYPES.edit : LINK_TYPES.view;
  const shareLinks = normalizeProjectShareLinks(plan?.shareLinks);
  return {
    ...plan,
    shareLinks: {
      ...shareLinks,
      [normalizedType]: {
        ...shareLinks[normalizedType],
        enabled: Boolean(enabled)
      }
    }
  };
}

export function canUseViewLink(shareLinks, projectId = "") {
  const viewLink = normalizeProjectShareLinks(shareLinks)[LINK_TYPES.view];
  const requestedProjectId = cleanProjectId(projectId);
  const projectMatches = !requestedProjectId || viewLink.projectId === requestedProjectId;
  return Boolean(projectMatches && viewLink.enabled && viewLink.projectId);
}

export function canUseEditLink(shareLinks, token, projectId = "") {
  const editLink = normalizeProjectShareLinks(shareLinks)[LINK_TYPES.edit];
  const requestedToken = cleanToken(token);
  const requestedProjectId = cleanProjectId(projectId);
  const projectMatches = !requestedProjectId || editLink.projectId === requestedProjectId;
  return Boolean(projectMatches && editLink.enabled && editLink.projectId && editLink.token && editLink.token === requestedToken);
}

export function authorizeShareRoute({ shareLinks, linkType = LINK_TYPES.view, token = "", projectId = "" } = {}) {
  if (linkType === LINK_TYPES.edit) {
    const editable = canUseEditLink(shareLinks, token, projectId);
    const viewable = canUseViewLink(shareLinks, projectId);
    return {
      editable,
      readonly: true,
      reason: editable ? "" : viewable ? "invalid-edit-link" : "disabled-view-link"
    };
  }
  const viewable = canUseViewLink(shareLinks, projectId);
  return {
    editable: false,
    readonly: true,
    reason: viewable ? "" : "disabled-view-link"
  };
}
