import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LINK_TYPES,
  authorizeShareRoute,
  canUseEditLink,
  createEditLinkToken,
  linkModeFromLocation,
  linkModeFromPathname,
  normalizeProjectShareLinks,
  projectWithShareLinkEnabled,
  projectWithShareLink
} from "./shareLinks.mjs";

const appSource = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("existing share routes resolve to readonly View Links", () => {
  assert.deepEqual(linkModeFromPathname("/share/project-1"), {
    projectId: "project-1",
    linkType: LINK_TYPES.view,
    editToken: "",
    readonly: true
  });
});

test("legacy suffixed V2 share routes no longer resolve as public links", () => {
  assert.deepEqual(linkModeFromLocation({ pathname: "/share/project-1/v2", search: "" }), {
    projectId: "",
    linkType: "",
    editToken: "",
    readonly: false
  });
  assert.deepEqual(linkModeFromLocation({ pathname: "/edit/project-1/v2", search: "?token=abc" }), {
    projectId: "",
    linkType: "",
    editToken: "",
    readonly: false
  });
});

test("edit routes require token validation before becoming editable", () => {
  assert.deepEqual(linkModeFromLocation({ pathname: "/edit/project-1", search: "?token=abc" }), {
    projectId: "project-1",
    linkType: LINK_TYPES.edit,
    editToken: "abc",
    readonly: true
  });
});

test("project share metadata serializes view and edit link ids", () => {
  const withView = projectWithShareLink({ title: "Show" }, { linkType: "view", projectId: "view-id" });
  const withEdit = projectWithShareLink(withView, { linkType: "edit", projectId: "edit-id", token: "secret" });

  assert.deepEqual(normalizeProjectShareLinks(withEdit.shareLinks), {
    view: { projectId: "view-id", token: "", enabled: true },
    edit: { projectId: "edit-id", token: "secret", enabled: true }
  });
});

test("edit links only authorize with the stored token", () => {
  const token = createEditLinkToken();
  const plan = projectWithShareLink({ title: "Show" }, { linkType: "edit", projectId: "edit-id", token });

  assert.equal(canUseEditLink(plan.shareLinks, token), true);
  assert.equal(canUseEditLink(plan.shareLinks, token, "edit-id"), true);
  assert.equal(canUseEditLink(plan.shareLinks, token, "other-id"), false);
  assert.equal(canUseEditLink(plan.shareLinks, ""), false);
  assert.equal(canUseEditLink(plan.shareLinks, "wrong"), false);
});

test("view and edit links can be disabled without losing their ids", () => {
  const plan = projectWithShareLink(
    projectWithShareLink({ title: "Links" }, { linkType: "view", projectId: "project-1" }),
    { linkType: "edit", projectId: "project-1", token: "secret" }
  );
  const disabledView = projectWithShareLinkEnabled(plan, "view", false);
  const disabledEdit = projectWithShareLinkEnabled(plan, "edit", false);

  assert.equal(disabledView.shareLinks.view.projectId, "project-1");
  assert.equal(disabledView.shareLinks.view.enabled, false);
  assert.equal(canUseEditLink(disabledEdit.shareLinks, "secret", "project-1"), false);
});

test("route authorization reports disabled view and invalid edit fallbacks", () => {
  const plan = projectWithShareLink(
    projectWithShareLink({ title: "Links" }, { linkType: "view", projectId: "project-1" }),
    { linkType: "edit", projectId: "project-1", token: "secret" }
  );

  assert.deepEqual(authorizeShareRoute({ shareLinks: plan.shareLinks, linkType: "edit", token: "secret", projectId: "project-1" }), {
    editable: true,
    readonly: true,
    reason: ""
  });
  assert.equal(authorizeShareRoute({ shareLinks: plan.shareLinks, linkType: "edit", token: "wrong", projectId: "project-1" }).reason, "invalid-edit-link");
  assert.equal(authorizeShareRoute({ shareLinks: projectWithShareLinkEnabled(plan, "view", false).shareLinks, linkType: "view", projectId: "project-1" }).reason, "disabled-view-link");
  assert.equal(authorizeShareRoute({ shareLinks: projectWithShareLinkEnabled(plan, "view", false).shareLinks, linkType: "edit", token: "wrong", projectId: "project-1" }).reason, "disabled-view-link");
});

test("app owner copy distinguishes View Links from Edit Links", () => {
  assert.match(appSource, /View Link|보기 링크/);
  assert.match(appSource, /Edit Link|편집 링크/);
  assert.match(appSource, /createEditShareUrl/);
  assert.match(appSource, /authorizeShareRoute/);
});
