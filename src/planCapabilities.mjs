export const PLAN_TYPES = Object.freeze({
  guest: "guest",
  free: "free",
  pro: "pro",
  team: "team"
});

export const FREE_CLOUD_PROJECT_LIMIT = 3;

const FREE_LIMITS = Object.freeze({
  cloudProjects: FREE_CLOUD_PROJECT_LIMIT,
  audioFilesPerProject: 1,
  viewLinks: 1,
  editLinks: 1
});

const UNLIMITED_LIMITS = Object.freeze({
  cloudProjects: Infinity,
  audioFilesPerProject: Infinity,
  viewLinks: Infinity,
  editLinks: Infinity
});

export function planCapabilities(planType = PLAN_TYPES.guest) {
  const type = Object.values(PLAN_TYPES).includes(planType) ? planType : PLAN_TYPES.guest;
  if (type === PLAN_TYPES.guest) {
    return {
      type,
      demoOnly: true,
      billingRequired: false,
      teamWorkspace: false,
      limits: {
        cloudProjects: 0,
        audioFilesPerProject: 0,
        viewLinks: 0,
        editLinks: 0
      }
    };
  }
  return {
    type,
    demoOnly: false,
    billingRequired: false,
    teamWorkspace: type === PLAN_TYPES.team,
    limits: type === PLAN_TYPES.free ? FREE_LIMITS : UNLIMITED_LIMITS
  };
}

export function canOwnCloudProject(capabilities) {
  return Boolean(capabilities && !capabilities.demoOnly && capabilities.limits?.cloudProjects > 0);
}

export function canCreateLink(capabilities, linkType, existingCount = 0) {
  if (!canOwnCloudProject(capabilities)) return false;
  const limitKey = linkType === "edit" ? "editLinks" : "viewLinks";
  return existingCount < (capabilities.limits?.[limitKey] || 0);
}
