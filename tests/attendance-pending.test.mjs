import test from "node:test";
import assert from "node:assert/strict";
import { canAttemptAttendance, parseAttendancePending } from "../components/admin/attendance-pending.ts";

const key = "11111111-1111-4111-8111-111111111111";
const session = "22222222-2222-4222-8222-222222222222";
const attendee = "33333333-3333-4333-8333-333333333333";

test("a lost add payload cannot be retyped or retried after refresh", () => {
  const pending = parseAttendancePending(JSON.stringify({ key, sessionId: session, kind: "add" }));
  assert.equal(canAttemptAttendance(pending, session, "add", undefined, true), false);
  assert.equal(canAttemptAttendance(pending, session, "add", undefined, false), true);
  assert.equal(canAttemptAttendance(pending, session, "remove", attendee, false), false);
});

test("removal retries must use the original class and attendee", () => {
  const pending = parseAttendancePending(JSON.stringify({ key, sessionId: session, kind: "remove", attendanceId: attendee }));
  assert.equal(canAttemptAttendance(pending, session, "remove", attendee, true), true);
  assert.equal(canAttemptAttendance(pending, session, "remove", key, false), false);
  assert.equal(canAttemptAttendance(pending, key, "remove", attendee, false), false);
});

test("storage parsing rejects broken identifiers and discards extra fields", () => {
  assert.throws(() => parseAttendancePending(JSON.stringify({ key: "bad", sessionId: session, kind: "add" })));
  assert.throws(() => parseAttendancePending(JSON.stringify({ key, sessionId: session, kind: "remove" })));
  assert.deepEqual(parseAttendancePending(JSON.stringify({ key, sessionId: session, kind: "add", name: "not retained" })), { key, sessionId: session, kind: "add" });
});
