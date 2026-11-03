import test from "node:test";
import assert from "node:assert/strict";
import { fetchGroupClassCounts } from "../components/admin/attendance-counts.ts";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("counts every class including zero in bounded chunks without attendee names", async () => {
  const ids = Array.from({ length: 1201 }, (_, index) => id(index + 1));
  const calls = [];
  const client = { async rpc(name, args) {
    assert.equal(name, "group_class_attendance_counts");
    calls.push(args.p_session_ids);
    return { data: Object.fromEntries(args.p_session_ids.map((entry, index) => [entry, index === 0 ? 0 : 2])), error: null };
  } };
  const counts = await fetchGroupClassCounts(client, [...ids, ids[0]]);
  assert.deepEqual(calls.map((chunk) => chunk.length), [500, 500, 201]);
  assert.equal(Object.keys(counts).length, ids.length);
  assert.equal(counts[ids[0]], 0);
  assert.equal(counts[ids[1]], 2);
});

test("fails closed when a count is unavailable, invalid, or denied", async () => {
  for (const result of [
    { data: {}, error: null },
    { data: { [id(1)]: -1 }, error: null },
    { data: { [id(1)]: 1.5 }, error: null },
    { data: null, error: new Error("denied") },
  ]) await assert.rejects(fetchGroupClassCounts({ rpc: async () => result }, [id(1)]));
  assert.deepEqual(await fetchGroupClassCounts({ rpc() { throw new Error("unnecessary request"); } }, []), {});
});
