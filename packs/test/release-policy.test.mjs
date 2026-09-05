import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCommits,
  findReleaseType,
  formatReleaseNotes,
  incrementVersion,
  resolveReleaseType,
} from "../scripts/release/release-policy.mjs";
import {
  parseGitLog,
  prependChangelogRelease,
} from "../scripts/release/publish-release.mjs";

test("returns no release when commits have no bracket marker", async () => {
  const commits = [{ message: "docs: update player guide" }];
  assert.equal(findReleaseType(commits), null);
  assert.equal(await analyzeCommits({}, { commits }), null);
});

test("defaults to a patch release when no marker is present", () => {
  assert.equal(resolveReleaseType([{ message: "fix: tweak the terminal" }]), "patch");
});

test("a marker still overrides the patch default", () => {
  assert.equal(resolveReleaseType([{ message: "feat: new command [minor]" }]), "minor");
  assert.equal(resolveReleaseType([{ message: "change: rework [breaking]" }]), "major");
});

test("matches release markers without case sensitivity", () => {
  assert.equal(findReleaseType([{ message: "fix: issue [PATCH]" }]), "patch");
  assert.equal(findReleaseType([{ message: "feat: option [Minor]" }]), "minor");
  assert.equal(findReleaseType([{ message: "change [BREAKING]" }]), "major");
});

test("uses the highest marker across commit subjects and bodies", () => {
  const commits = [
    { subject: "fix: first [patch]", body: "Small correction" },
    { subject: "feat: second", body: "Release this as [minor]" },
    { message: "refactor: third\n\nMigration note [major]" },
  ];
  assert.equal(findReleaseType(commits), "major");
});

test("treats breaking as an alias for major", () => {
  assert.equal(findReleaseType([{ message: "change: API [breaking]" }]), "major");
});

test("increments patch, minor, and major versions", () => {
  assert.equal(incrementVersion("0.0.24", "patch"), "0.0.25");
  assert.equal(incrementVersion("0.0.24", "minor"), "0.1.0");
  assert.equal(incrementVersion("0.0.24", "major"), "1.0.0");
});

test("release notes include commit subjects, bodies, and short hashes", () => {
  const notes = formatReleaseNotes([
    {
      message: "chore: add test [minor]\n\nCovers marker precedence.",
      hash: "1234567890abcdef",
    },
  ]);
  assert.match(notes, /chore: add test \[minor\]/);
  assert.match(notes, /Covers marker precedence\./);
  assert.match(notes, /1234567/);
});

test("parses Git subjects and bodies for release analysis", () => {
  const commits = parseGitLog(
    "1234567890abcdef\x1fchore: add test\x1fRelease as [minor]\x1e",
  );
  assert.equal(commits.length, 1);
  assert.equal(commits[0].subject, "chore: add test");
  assert.equal(commits[0].body, "Release as [minor]");
  assert.equal(findReleaseType(commits), "minor");
});

test("prepends generated notes before the previous changelog release", () => {
  const changelog = "# Changelog\n\nRelease history.\n\n## 0.0.24\n\n- Baseline.\n";
  const updated = prependChangelogRelease(
    changelog,
    "0.0.25",
    "## Changes\n\n- fix: correction [patch]",
  );
  assert.ok(updated.indexOf("## 0.0.25") < updated.indexOf("## 0.0.24"));
  assert.match(updated, /fix: correction \[patch\]/);
});
