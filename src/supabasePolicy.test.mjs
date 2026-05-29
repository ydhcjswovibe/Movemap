import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FREE_CLOUD_PROJECT_LIMIT } from "./planCapabilities.mjs";

const sql = readFileSync(new URL("../docs/supabase/stage1-auth-ownership.sql", import.meta.url), "utf8");
const verification = readFileSync(new URL("../docs/supabase/stage1-verification.md", import.meta.url), "utf8");
const cloudProjectSource = readFileSync(new URL("./cloudProject.mjs", import.meta.url), "utf8");

test("Stage 1 Supabase SQL defines owner RLS and link RPC contract", () => {
  assert.match(sql, /owner_id uuid references auth\.users\(id\)/);
  assert.match(sql, /create policy "owners can insert projects"/);
  assert.match(sql, /create policy "enabled view links are public"/);
  assert.match(sql, /create or replace function get_project_by_edit_token\(p_project_id uuid, p_token text\)/);
  assert.match(sql, /create or replace function update_project_by_edit_token\(p_project_id uuid, p_token text, p_new_plan jsonb\)/);
  assert.match(sql, /grant execute on function get_project_by_edit_token\(uuid, text\) to anon/);
  assert.match(sql, /grant execute on function update_project_by_edit_token\(uuid, text, jsonb\) to anon/);
});

test("Stage 1 RPC payload names match cloudProject helper requests", () => {
  assert.match(cloudProjectSource, /p_project_id: id/);
  assert.match(cloudProjectSource, /p_token: token/);
  assert.match(cloudProjectSource, /p_new_plan: nextPlan/);
});

test("Stage 1 Free project limit stays aligned across JS and SQL verification docs", () => {
  assert.equal(FREE_CLOUD_PROJECT_LIMIT, 3);
  assert.match(sql, /create or replace function free_cloud_project_limit\(\)/);
  assert.match(sql, /select 3;/);
  assert.match(verification, /Expected: `3`, matching `FREE_CLOUD_PROJECT_LIMIT`/);
});

test("Stage 1 Supabase docs require authenticated upload and public audio read", () => {
  assert.match(sql, /create policy "authenticated audio upload"[\s\S]*to authenticated/);
  assert.match(sql, /create policy "anonymous audio read"[\s\S]*to anon/);
});
