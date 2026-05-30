import assert from "node:assert/strict";
import test from "node:test";

import {
  canWorkspaceMember,
  createFakeFormationProposalProvider,
  createFormationProposalAdapter,
  reconcileBillingWebhook
} from "./providerAdapters.mjs";

test("formation proposal adapter validates provider output through the existing validator", async () => {
  const section = { id: "f1", positions: { a1: { x: 10, y: 10 } } };
  const performers = [{ id: "a1" }];
  const provider = createFakeFormationProposalProvider({ positions: { a1: { x: 20, y: 30 } } });
  const adapter = createFormationProposalAdapter(provider);

  const result = await adapter.preview({ section, performers });

  assert.equal(result.ok, true);
  assert.deepEqual(result.section.positions.a1, { x: 20, y: 30 });
});

test("billing webhook reconciliation keeps provider state provider-neutral", () => {
  assert.deepEqual(reconcileBillingWebhook({}, { provider: "stripe", status: "trialing", createdAt: "now" }), {
    provider: "stripe",
    state: "trialing",
    active: true,
    pastDue: false,
    updatedAt: "now"
  });
});

test("workspace member role enforcement is local and explicit", () => {
  assert.equal(canWorkspaceMember({ role: "viewer" }, "edit"), false);
  assert.equal(canWorkspaceMember({ role: "editor" }, "edit"), true);
  assert.equal(canWorkspaceMember({ role: "admin" }, "admin"), true);
});
