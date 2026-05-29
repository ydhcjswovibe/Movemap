import assert from "node:assert/strict";
import test from "node:test";

import { loadCloudProject, loadCloudProjectByEditToken, saveCloudProject, saveCloudProjectByEditToken } from "./cloudProject.mjs";

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

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/movemap_projects");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Prefer, "return=representation");
  assert.equal(body.title, "Demo");
  assert.equal(body.plan.title, "Demo");
  assert.equal(typeof body.updated_at, "string");
  assert.equal(result.id, "project-1");
  assert.equal(result.plan.cloudProjectId, "project-1");
});

test("authenticated saves send owner metadata and bearer token", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ id: "project-1" }]
    };
  };

  const result = await saveCloudProject(
    { title: "Owned", sections: [] },
    config,
    fetchImpl,
    { userId: "user-1", accessToken: "access-1", accountPlan: "free" }
  );
  const body = JSON.parse(calls[0].options.body);

  assert.equal(calls[0].options.headers.Authorization, "Bearer access-1");
  assert.equal(body.owner_id, "user-1");
  assert.equal(body.account_plan, "free");
  assert.equal(body.view_enabled, false);
  assert.equal(body.edit_enabled, false);
  assert.equal(body.plan.owner.userId, "user-1");
  assert.equal(result.plan.account.plan, "free");
});

test("share link state is mirrored into database-facing columns", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ id: "project-1" }]
    };
  };

  await saveCloudProject({
    title: "Shared",
    sections: [],
    shareLinks: {
      view: { projectId: "project-1", enabled: true },
      edit: { projectId: "project-1", token: "edit-token", enabled: true }
    }
  }, config, fetchImpl);
  const body = JSON.parse(calls[0].options.body);

  assert.equal(body.view_enabled, true);
  assert.equal(body.edit_enabled, true);
  assert.equal(body.edit_token, "edit-token");
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

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/movemap_projects?id=eq.project-1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(body.plan.cloudProjectId, "project-1");
  assert.equal(typeof body.updated_at, "string");
});

test("creates a Movemap row when an existing cloudProjectId has no matching Movemap project", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => options.method === "PATCH" ? [] : [{ id: "project-2" }]
    };
  };

  const result = await saveCloudProject({ title: "Legacy Demo", cloudProjectId: "legacy-1", sections: [] }, config, fetchImpl);
  const createBody = JSON.parse(calls[1].options.body);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/movemap_projects?id=eq.legacy-1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[1].url, "https://example.supabase.co/rest/v1/movemap_projects");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(createBody.plan.cloudProjectId, undefined);
  assert.equal(result.id, "project-2");
  assert.equal(result.plan.cloudProjectId, "project-2");
});

test("loads a cloud project by id from the Movemap table", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => [{ plan: { title: "Shared" } }]
    };
  };

  const plan = await loadCloudProject("project-1", config, fetchImpl);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/movemap_projects?id=eq.project-1&select=*");
  assert.equal(calls[0].options.headers.apikey, "anon-key");
  assert.deepEqual(plan, { title: "Shared" });
});

test("falls back to the legacy choreo table when a shared project is not in Movemap", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => url.includes("movemap_projects") ? [] : [{ plan: { title: "Legacy Shared" } }]
    };
  };

  const plan = await loadCloudProject("project-1", config, fetchImpl);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/movemap_projects?id=eq.project-1&select=*");
  assert.equal(calls[1].url, "https://example.supabase.co/rest/v1/choreo_projects?id=eq.project-1&select=*");
  assert.deepEqual(plan, { title: "Legacy Shared" });
});

test("loads an edit-link project through token-gated RPC", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({ plan: { title: "Editable" } })
    };
  };

  const plan = await loadCloudProjectByEditToken("project-1", "token-1", config, fetchImpl);
  const body = JSON.parse(calls[0].options.body);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/get_project_by_edit_token");
  assert.deepEqual(body, { p_project_id: "project-1", p_token: "token-1" });
  assert.deepEqual(plan, { title: "Editable" });
});

test("saves anonymous edit-link changes through token-gated RPC", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({ id: "project-1", plan: { title: "Updated", cloudProjectId: "project-1" } })
    };
  };

  const saved = await saveCloudProjectByEditToken({ title: "Updated", cloudProjectId: "project-1" }, "token-1", config, fetchImpl);
  const body = JSON.parse(calls[0].options.body);

  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/update_project_by_edit_token");
  assert.equal(body.p_project_id, "project-1");
  assert.equal(body.p_token, "token-1");
  assert.equal(body.p_new_plan.title, "Updated");
  assert.equal(saved.id, "project-1");
});
