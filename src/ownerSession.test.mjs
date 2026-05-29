import assert from "node:assert/strict";
import test from "node:test";

import {
  canRegisterOwnerProject,
  createOwnerSession,
  ensureOwnerSession,
  isOwnerSession,
  registerOwnerProject
} from "./ownerSession.mjs";

test("creates and preserves MVP owner sessions", () => {
  const session = createOwnerSession({ now: new Date("2026-05-29T00:00:00.000Z"), randomId: () => "fixed" });
  const result = ensureOwnerSession({ title: "Demo", account: { plan: "guest" } }, session);
  const second = ensureOwnerSession(result.plan, createOwnerSession({ randomId: () => "other" }));

  assert.deepEqual(session, { sessionId: "owner_fixed", createdAt: "2026-05-29T00:00:00.000Z" });
  assert.equal(result.plan.account.plan, "free");
  assert.equal(isOwnerSession(result.plan, "owner_fixed"), true);
  assert.equal(second.session.sessionId, "owner_fixed");
  assert.equal(second.created, false);
});

test("local owner registry enforces Free project limits", () => {
  let state = registerOwnerProject({}, "owner_fixed", "p1", 2);
  state = registerOwnerProject(state.registry, "owner_fixed", "p2", 2);
  const blocked = registerOwnerProject(state.registry, "owner_fixed", "p3", 2);

  assert.equal(canRegisterOwnerProject(state.registry, "owner_fixed", 2), false);
  assert.equal(blocked.registered, false);
  assert.equal(blocked.reason, "limit-reached");
});
