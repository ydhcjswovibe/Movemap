const SESSION_PREFIX = "owner_";

function cleanSessionId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

export function createOwnerSession({ now = new Date(), randomId = null } = {}) {
  const suffix = typeof randomId === "function"
    ? randomId()
    : globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    sessionId: `${SESSION_PREFIX}${String(suffix).replace(/^owner_/, "")}`,
    createdAt: nowIso(now)
  };
}

export function normalizeOwnerSession(owner = {}) {
  return {
    sessionId: cleanSessionId(owner.sessionId),
    createdAt: typeof owner.createdAt === "string" ? owner.createdAt : ""
  };
}

export function isOwnerSession(plan, sessionId) {
  const owner = normalizeOwnerSession(plan?.owner);
  return Boolean(owner.sessionId && owner.sessionId === cleanSessionId(sessionId));
}

export function ensureOwnerSession(plan, session = createOwnerSession()) {
  const owner = normalizeOwnerSession(plan?.owner);
  const planType = plan?.account?.plan && plan.account.plan !== "guest" ? plan.account.plan : "free";
  if (owner.sessionId) {
    return { plan: { ...plan, owner, account: { plan: planType } }, session: owner, created: false };
  }
  const nextOwner = normalizeOwnerSession(session);
  return {
    plan: {
      ...plan,
      owner: nextOwner,
      account: { plan: planType }
    },
    session: nextOwner,
    created: true
  };
}

export function ownerProjectRegistry(registry = {}, ownerSessionId = "") {
  const sessionId = cleanSessionId(ownerSessionId);
  const projects = Array.isArray(registry[sessionId]?.projects) ? registry[sessionId].projects : [];
  return { sessionId, projects };
}

export function canRegisterOwnerProject(registry = {}, ownerSessionId = "", limit = Infinity) {
  const owner = ownerProjectRegistry(registry, ownerSessionId);
  return Boolean(owner.sessionId && owner.projects.length < limit);
}

export function registerOwnerProject(registry = {}, ownerSessionId = "", projectId = "", limit = Infinity) {
  const owner = ownerProjectRegistry(registry, ownerSessionId);
  const cleanProjectId = typeof projectId === "string" ? projectId.trim() : "";
  if (!owner.sessionId || !cleanProjectId) return { registry, registered: false, reason: "missing-owner-or-project" };
  if (owner.projects.includes(cleanProjectId)) return { registry, registered: true, reason: "already-registered" };
  if (owner.projects.length >= limit) return { registry, registered: false, reason: "limit-reached" };
  return {
    registry: {
      ...registry,
      [owner.sessionId]: {
        ...registry[owner.sessionId],
        projects: [...owner.projects, cleanProjectId]
      }
    },
    registered: true,
    reason: ""
  };
}
