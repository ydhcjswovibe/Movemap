export function requireSupabaseConfig(config) {
  if (!config?.url || !config?.key) throw new Error("Supabase 환경변수가 없습니다.");
  return config;
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
  const endpoint = cloudProjectId
    ? `${url}/rest/v1/choreo_projects?id=eq.${encodeURIComponent(cloudProjectId)}`
    : `${url}/rest/v1/choreo_projects`;
  const response = await fetchImpl(endpoint, {
    method: cloudProjectId ? "PATCH" : "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      title: nextPlan.title,
      plan: nextPlan,
      updated_at: savedAt
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
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
  const { url, key } = requireSupabaseConfig(config);
  const response = await fetchImpl(`${url}/rest/v1/choreo_projects?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data[0]) throw new Error("공유 프로젝트를 찾을 수 없습니다.");
  return data[0].plan;
}
