import assert from "node:assert/strict";
import test from "node:test";
import { partnerSetIdForAddedSection } from "./sectionPolicy.mjs";

test("new formations start without an inherited pair relationship", () => {
  assert.equal(partnerSetIdForAddedSection({ partnerSetId: "partners-1" }), "");
});

test("new formations stay unpaired when there is no previous formation", () => {
  assert.equal(partnerSetIdForAddedSection(null), "");
});
