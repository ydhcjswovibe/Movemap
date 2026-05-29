export function normalizeShareOrigin(origin) {
  return typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : "";
}

export function createShareUrl(projectId, { publicShareOrigin = "", currentOrigin = "" } = {}) {
  const origin = normalizeShareOrigin(publicShareOrigin) || normalizeShareOrigin(currentOrigin);
  if (!origin) throw new Error("공유 링크 origin이 없습니다.");
  return `${origin}/share/${projectId}`;
}

export function createEditShareUrl(projectId, { publicShareOrigin = "", currentOrigin = "", editToken = "" } = {}) {
  const origin = normalizeShareOrigin(publicShareOrigin) || normalizeShareOrigin(currentOrigin);
  if (!origin) throw new Error("공유 링크 origin이 없습니다.");
  const token = typeof editToken === "string" ? editToken.trim() : "";
  return token ? `${origin}/edit/${projectId}?token=${encodeURIComponent(token)}` : `${origin}/edit/${projectId}`;
}
