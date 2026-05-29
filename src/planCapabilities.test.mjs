import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAN_TYPES,
  FREE_CLOUD_PROJECT_LIMIT,
  planCapabilities,
  canCreateLink,
  canOwnCloudProject
} from "./planCapabilities.mjs";

test("guest is demo-only and cannot own cloud projects or links", () => {
  const guest = planCapabilities(PLAN_TYPES.guest);

  assert.equal(guest.demoOnly, true);
  assert.equal(canOwnCloudProject(guest), false);
  assert.equal(canCreateLink(guest, "view", 0), false);
});

test("free plan centralizes MVP limits for projects, audio, and links", () => {
  const free = planCapabilities("free");

  assert.equal(free.limits.cloudProjects, FREE_CLOUD_PROJECT_LIMIT);
  assert.equal(free.limits.audioFilesPerProject, 1);
  assert.equal(free.limits.viewLinks, 1);
  assert.equal(free.limits.editLinks, 1);
  assert.equal(canCreateLink(free, "view", 0), true);
  assert.equal(canCreateLink(free, "view", 1), false);
});

test("pro and team can be represented without billing", () => {
  assert.equal(planCapabilities("pro").billingRequired, false);
  assert.equal(planCapabilities("team").teamWorkspace, true);
});
