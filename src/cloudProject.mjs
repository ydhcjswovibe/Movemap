export function requireSupabaseConfig(config) {
  if (!config?.url || !config?.key) throw new Error("Supabase 환경변수가 없습니다.");
  return config;
}

const MOVEMAP_PROJECTS_TABLE = "movemap_projects";
const LEGACY_PROJECTS_TABLE = "choreo_projects";

function tableEndpoint(url, table, cloudProjectId = "") {
  return cloudProjectId
    ? `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(cloudProjectId)}`
    : `${url}/rest/v1/${table}`;
}

function authHeaders({ key, accessToken = "" }, extraHeaders = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken || key}`,
    ...extraHeaders
  };
}

function linkState(plan, linkType) {
  const link = plan?.shareLinks?.[linkType] || {};
  return {
    enabled: link.enabled !== false && Boolean(link.projectId),
    token: typeof link.token === "string" ? link.token : ""
  };
}

async function fetchProjectFromTable(id, table, { url, key }, fetchImpl) {
  const response = await fetchImpl(`${tableEndpoint(url, table, id)}&select=*`, {
    headers: authHeaders({ key })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data[0]?.plan || null;
}

function cloudProjectBody(bodyPlan, savedAt, auth = {}) {
  const view = linkState(bodyPlan, "view");
  const edit = linkState(bodyPlan, "edit");
  return {
    title: bodyPlan.title,
    plan: bodyPlan,
    updated_at: savedAt,
    ...(auth.userId ? { owner_id: auth.userId } : {}),
    account_plan: auth.accountPlan || bodyPlan.account?.plan || "free",
    view_enabled: view.enabled,
    edit_enabled: edit.enabled,
    edit_token: edit.token || null
  };
}

async function rpcProject(url, name, body, { key, accessToken = "" }, fetchImpl) {
  const response = await fetchImpl(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: authHeaders({ key, accessToken }, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function saveCloudProject(plan, config, fetchImpl = fetch, auth = {}) {
  const { url, key } = requireSupabaseConfig(config);
  const savedAt = new Date().toISOString();
  const cloudProjectId = plan.cloudProjectId || "";
  const nextPlan = {
    ...plan,
    account: { plan: auth.accountPlan || plan.account?.plan || "free" },
    ...(auth.userId ? { owner: { ...plan.owner, userId: auth.userId } } : {}),
    updatedAt: savedAt,
    ...(cloudProjectId ? { cloudProjectId } : {})
  };
  const saveToMovemap = async ({ method, projectId = "", bodyPlan }) => fetchImpl(tableEndpoint(url, MOVEMAP_PROJECTS_TABLE, projectId), {
    method,
    headers: authHeaders({ key, accessToken: auth.accessToken }, {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(cloudProjectBody(bodyPlan, savedAt, auth))
  });

  let response = await saveToMovemap({
    method: cloudProjectId ? "PATCH" : "POST",
    projectId: cloudProjectId,
    bodyPlan: nextPlan
  });
  if (!response.ok) throw new Error(await response.text());
  let data = await response.json();

  if (cloudProjectId && !data[0]) {
    const { cloudProjectId: _legacyProjectId, ...planForNewMovemapRow } = nextPlan;
    response = await saveToMovemap({
      method: "POST",
      bodyPlan: planForNewMovemapRow
    });
    if (!response.ok) throw new Error(await response.text());
    data = await response.json();
  }

  const id = data[0]?.id || cloudProjectId;
  if (!id) throw new Error("클라우드 저장 ID를 받지 못했습니다.");
  return {
    id,
    savedAt,
    plan: {
      ...nextPlan,
      cloudProjectId: id
    }
  };
}

export async function loadCloudProject(id, config, fetchImpl = fetch) {
  const supabase = requireSupabaseConfig(config);
  const project = await fetchProjectFromTable(id, MOVEMAP_PROJECTS_TABLE, supabase, fetchImpl)
    || await fetchProjectFromTable(id, LEGACY_PROJECTS_TABLE, supabase, fetchImpl);
  if (!project) throw new Error("공유 프로젝트를 찾을 수 없습니다.");
  return project;
}

export async function loadCloudProjectByEditToken(id, token, config, fetchImpl = fetch) {
  const { url, key } = requireSupabaseConfig(config);
  const row = await rpcProject(url, "get_project_by_edit_token", {
    p_project_id: id,
    p_token: token
  }, { key }, fetchImpl);
  if (!row?.plan) throw new Error("편집 링크 프로젝트를 찾을 수 없습니다.");
  return row.plan;
}

export async function saveCloudProjectByEditToken(plan, token, config, fetchImpl = fetch) {
  const { url, key } = requireSupabaseConfig(config);
  const savedAt = new Date().toISOString();
  const nextPlan = {
    ...plan,
    updatedAt: savedAt
  };
  const row = await rpcProject(url, "update_project_by_edit_token", {
    p_project_id: nextPlan.cloudProjectId,
    p_token: token,
    p_new_plan: nextPlan
  }, { key }, fetchImpl);
  const id = row?.id || nextPlan.cloudProjectId;
  if (!id) throw new Error("편집 링크 저장 ID를 받지 못했습니다.");
  return {
    id,
    savedAt,
    plan: {
      ...(row?.plan || nextPlan),
      cloudProjectId: id
    }
  };
}
