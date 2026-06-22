import assert from "node:assert/strict";
import test from "node:test";
import { getTutorDocumentAccess } from "./tutor-document-access";

const document = { ownerUserId: "tutor-owner" };

test("document access distinguishes authentication, existence, and role authorization", () => {
  assert.equal(getTutorDocumentAccess(null, document), "UNAUTHENTICATED");
  assert.equal(getTutorDocumentAccess({ id: "admin", role: "ADMIN" }, document), "ALLOWED");
  assert.equal(getTutorDocumentAccess({ id: "tutor-owner", role: "TUTOR" }, document), "ALLOWED");
  assert.equal(getTutorDocumentAccess({ id: "other", role: "TUTOR" }, document), "FORBIDDEN");
  assert.equal(getTutorDocumentAccess({ id: "parent", role: "PARENT" }, document), "FORBIDDEN");
  assert.equal(getTutorDocumentAccess({ id: "admin", role: "ADMIN" }, null), "NOT_FOUND");
});
