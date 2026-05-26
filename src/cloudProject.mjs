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

async function fetchProjectFromTable(id, table, { url, key }, fetchImpl) {
  const response = await fetchImpl(`${tableEndpoint(url, table, id)}&select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data[0]?.plan || null;
}

export async function saveCloudProject(plan, config, fetchImpl = fetch) {
  const { url, key } = requireSupabaseConfig(config);
  const savedAt = new Date().toISOString();
  const cloudProjectId = plan.cloudProjectId || "";
  const nextPlan = {
    ...plan,
    updatedAt: savedAt,
    ...(cloudProjectId ? { cloudProjectId } : {})
  };
  const saveToMovemap = async ({ method, projectId = "", bodyPlan }) => fetchImpl(tableEndpoint(url, MOVEMAP_PROJECTS_TABLE, projectId), {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      title: bodyPlan.title,
      plan: bodyPlan,
      updated_at: savedAt
    })
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
