import { acceptFormationProposal } from "./formationProposal.mjs";
import { normalizeBillingState, TEAM_ROLES } from "./planCapabilities.mjs";

export function createFormationProposalAdapter(provider) {
  return {
    async preview(context = {}) {
      const proposal = await provider.preview(context);
      return acceptFormationProposal(context.section, proposal, context.performers, { requireAllPerformers: true });
    }
  };
}

export function createFakeFormationProposalProvider(preview) {
  return {
    async preview() {
      return preview;
    }
  };
}

export function reconcileBillingWebhook(currentState = {}, event = {}) {
  const normalized = normalizeBillingState({
    provider: event.provider || currentState.provider,
    status: event.status || event.type || currentState.state
  });
  return {
    ...currentState,
    provider: normalized.provider,
    state: normalized.state,
    active: normalized.active,
    pastDue: normalized.pastDue,
    updatedAt: event.createdAt || currentState.updatedAt || ""
  };
}

export function normalizeWorkspaceMember(member = {}) {
  const role = Object.values(TEAM_ROLES).includes(member.role) ? member.role : TEAM_ROLES.viewer;
  return {
    userId: String(member.userId || ""),
    role,
    invitedAt: member.invitedAt || ""
  };
}

export function canWorkspaceMember(member = {}, action = "view") {
  const role = normalizeWorkspaceMember(member).role;
  if (action === "admin") return role === TEAM_ROLES.owner || role === TEAM_ROLES.admin;
  if (action === "edit") return role === TEAM_ROLES.owner || role === TEAM_ROLES.admin || role === TEAM_ROLES.editor;
  return Boolean(role);
}
