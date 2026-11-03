import test from "node:test";
import assert from "node:assert/strict";
import { scheduleInstants } from "../components/admin/schedule-time.ts";

test("validates Manila start and end times, including overnight sessions", () => {
  assert.deepEqual(scheduleInstants("2026-11-03", "23:00", "2026-11-04", "01:00", true), {
    startsAt: "2026-11-03T15:00:00.000Z", endsAt: "2026-11-03T17:00:00.000Z",
  });
  assert.deepEqual(scheduleInstants("2026-11-03", "09:00", "", "10:30", true), {
    startsAt: "2026-11-03T01:00:00.000Z", endsAt: "2026-11-03T02:30:00.000Z",
  });
  assert.equal(scheduleInstants("2026-11-03", "09:00", "2026-11-03", "09:00", true), null);
  assert.equal(scheduleInstants("2026-11-03", "09:00", "2026-11-03", "08:59", true), null);
  assert.equal(scheduleInstants("2026-02-30", "09:00", "2026-03-01", "10:00", true), null);
  assert.equal(scheduleInstants("2026-11-03", "25:00", "2026-11-03", "26:00", true), null);
});

test("new sessions require an end, while legacy sessions can remain unset", () => {
  assert.equal(scheduleInstants("2026-11-03", "09:00", "", "", true), null);
  assert.equal(scheduleInstants("2026-11-03", "09:00", "2026-11-03", "", false), null);
  assert.deepEqual(scheduleInstants("2026-11-03", "09:00", "", "", false), {
    startsAt: "2026-11-03T01:00:00.000Z", endsAt: null,
  });
});
