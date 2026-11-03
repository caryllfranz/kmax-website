import test from "node:test";
import assert from "node:assert/strict";
import { isActiveStatus, membershipStatus, termFor, timeLeft } from "../components/admin/members-term.ts";

function member(latest, history = []) {
  return { id: "test", name: "Sample", mobile: "00000000000", ...latest, history };
}

test("a future renewal does not hide the current term's expiry or plan", () => {
  const person = member(
    { startsOn: "2027-02-01", endsOn: "2027-04-30", planName: "Quarterly" },
    [{ startsOn: "2027-01-01", endsOn: "2027-01-31", planName: "Monthly" }],
  );
  assert.equal(termFor(person, "2027-01-31").planName, "Monthly");
  assert.equal(termFor(person, "2027-02-01").planName, "Quarterly");
  assert.deepEqual(membershipStatus("2027-01-01", "2027-01-31", "2027-01-31"), { category: "expiring", label: "Expires today" });
});

test("overlapping current terms show the earliest expiry without changing history", () => {
  const person = member(
    { startsOn: "2027-01-01", endsOn: "2027-03-31", planName: "Quarterly" },
    [{ startsOn: "2027-01-02", endsOn: "2027-01-31", planName: "Monthly" }],
  );
  assert.equal(termFor(person, "2027-01-15").planName, "Monthly");
  assert.equal(person.history[0].planName, "Monthly");
});

test("without a current term select the nearest future start before the latest expired term", () => {
  const person = member(
    { startsOn: "2027-01-01", endsOn: "2027-01-31", planName: "Old" },
    [{ startsOn: "2027-03-01", endsOn: "2027-03-31", planName: "Future" },
      { startsOn: "2027-02-10", endsOn: "2027-02-28", planName: "Next" }],
  );
  assert.equal(termFor(person, "2027-02-01").planName, "Next");
  assert.equal(membershipStatus("2027-02-10", "2027-02-28", "2027-02-01").category, "upcoming");
  assert.equal(termFor(person, "2027-04-01").planName, "Future");
  assert.equal(membershipStatus("2027-03-01", "2027-03-31", "2027-04-01").category, "expired");
});

test("expiry reminder uses inclusive dates and the seven-day visual threshold", () => {
  assert.deepEqual(membershipStatus("2027-02-01", "2027-02-08", "2027-02-01"), { category: "expiring", label: "Expires in 7 days" });
  assert.deepEqual(membershipStatus("2027-02-01", "2027-02-09", "2027-02-01"), { category: "current", label: "Active" });
  assert.equal(membershipStatus("2027-02-01", "2027-02-02", "2027-02-01").label, "Expires in 1 day");
  assert.equal(timeLeft("2027-02-01", "2027-02-01"), "Today");
  assert.equal(timeLeft("2027-01-31", "2027-02-01"), "1 day ago");
  assert.equal(timeLeft("2027-01-30", "2027-02-01"), "2 days ago");
  assert.equal(timeLeft("2028-03-01", "2028-02-28"), "2 days");
});

test("active includes expiring terms, but excludes expired and upcoming terms", () => {
  assert.equal(isActiveStatus("current"), true);
  assert.equal(isActiveStatus("expiring"), true);
  assert.equal(isActiveStatus("expired"), false);
  assert.equal(isActiveStatus("upcoming"), false);
});
