import assert from "node:assert/strict";
import test from "node:test";

import { loadCloudProject, saveCloudProject } from "./cloudProject.mjs";

const config = {
  url: "https://example.supabase.co",
  key: "anon-key"
};

test("creates a cloud project when the plan has no cloudProjectId", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ id: "project-1" }]
    };
  };

  const result = await saveCloudProject({ title: "Demo", sections: [] }, config, fetchImpl);
  const body = JSON.parse(calls[0].options.body);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/choreo_projects");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Prefer, "return=representation");
  assert.equal(body.title, "Demo");
  assert.equal(body.plan.title, "Demo");
  assert.equal(typeof body.updated_at, "string");
  assert.equal(result.id, "project-1");
  assert.equal(result.plan.cloudProjectId, "project-1");
});

test("updates a cloud project when the plan has a cloudProjectId", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ id: "project-1" }]
    };
  };

  await saveCloudProject({ title: "Demo", cloudProjectId: "project-1", sections: [] }, config, fetchImpl);
  const body = JSON.parse(calls[0].options.body);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/choreo_projects?id=eq.project-1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(body.plan.cloudProjectId, "project-1");
  assert.equal(typeof body.updated_at, "string");
});

test("loads a cloud project by id", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ plan: { title: "Shared" } }]
    };
  };

  const plan = await loadCloudProject("project-1", config, fetchImpl);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/choreo_projects?id=eq.project-1&select=*");
  assert.equal(calls[0].options.headers.apikey, "anon-key");
  assert.deepEqual(plan, { title: "Shared" });
});
