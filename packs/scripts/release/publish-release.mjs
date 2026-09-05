import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  formatReleaseNotes,
  incrementVersion,
  resolveReleaseType,
} from "./release-policy.mjs";
import { prepareRelease } from "./prepare-release.mjs";

const execFileAsync = promisify(execFile);
const RELEASE_TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function getRepositoryRoot() {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

async function runCommand(command, args, options = {}) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (stderr) process.stderr.write(stderr);
  return stdout;
}

export function parseGitLog(output) {
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash = "", subject = "", body = ""] = record.split("\x1f");
      return {
        hash: hash.trim(),
        subject: subject.trim(),
        body: body.trim(),
        message: [subject.trim(), body.trim()].filter(Boolean).join("\n\n"),
      };
    });
}

export function prependChangelogRelease(changelog, version, releaseNotes) {
  const section = `## ${version}\n\n${releaseNotes.replace(/^## Changes\n\n/, "")}\n`;
  const firstReleaseIndex = changelog.search(/\n## \d+\.\d+\.\d+/);

  if (firstReleaseIndex === -1) {
    return `${changelog.trimEnd()}\n\n${section}`;
  }

  return `${changelog.slice(0, firstReleaseIndex).trimEnd()}\n\n${section}\n${changelog
    .slice(firstReleaseIndex + 1)
    .trimStart()}`;
}

async function getLatestReleaseTag(repositoryRoot) {
  const tag = (
    await runCommand(
      "git",
      ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"],
      { cwd: repositoryRoot },
    )
  ).trim();

  if (!RELEASE_TAG_PATTERN.test(tag)) {
    throw new Error(`Latest release tag is not semantic: ${tag}`);
  }
  return tag;
}

async function getCommitsSinceTag(repositoryRoot, tag) {
  const output = await runCommand(
    "git",
    ["log", `${tag}..HEAD`, "--format=%H%x1f%s%x1f%b%x1e"],
    { cwd: repositoryRoot },
  );
  return parseGitLog(output);
}

async function readCurrentVersion(repositoryRoot) {
  const packagePath = path.join(repositoryRoot, "packs", "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  return packageJson.version;
}

async function updateChangelog(repositoryRoot, version, releaseNotes) {
  const changelogPath = path.join(repositoryRoot, "CHANGELOG.md");
  const changelog = await readFile(changelogPath, "utf8");
  await writeFile(
    changelogPath,
    prependChangelogRelease(changelog, version, releaseNotes),
  );
}

async function commitAndTagRelease(repositoryRoot, version) {
  const files = [
    "CHANGELOG.md",
    "index.html",
    "packs/package.json",
    "packs/package-lock.json",
    "packs/behavior_pack/manifest.json",
    "packs/resource_pack/manifest.json",
    "packs/src/main.ts",
  ];
  await runCommand("git", ["add", "--", ...files], { cwd: repositoryRoot });
  await runCommand(
    "git",
    ["commit", "-m", `chore(release): ${version} [skip ci]`],
    { cwd: repositoryRoot },
  );
  const tag = `v${version}`;
  await runCommand("git", ["tag", "--annotate", tag, "--message", `NullByte ${tag}`], {
    cwd: repositoryRoot,
  });
  await runCommand(
    "git",
    ["push", "--atomic", "origin", "HEAD:main", `refs/tags/${tag}`],
    { cwd: repositoryRoot },
  );
  return tag;
}

async function publishGitHubRelease(repositoryRoot, tag, version, releaseNotes, releaseZipPath) {
  const notesPath = path.join(repositoryRoot, "release-output", "release-notes.md");
  await writeFile(notesPath, `${releaseNotes.trim()}\n`);
  await runCommand(
    "gh",
    [
      "release",
      "create",
      tag,
      releaseZipPath,
      "--title",
      `NullByte v${version}`,
      "--notes-file",
      notesPath,
      "--verify-tag",
    ],
    { cwd: repositoryRoot },
  );
}

export async function publishRelease(repositoryRoot = getRepositoryRoot()) {
  const latestTag = await getLatestReleaseTag(repositoryRoot);
  const currentVersion = await readCurrentVersion(repositoryRoot);
  const taggedVersion = latestTag.slice(1);
  if (currentVersion !== taggedVersion) {
    throw new Error(
      `Source version ${currentVersion} does not match latest tag ${latestTag}.`,
    );
  }

  const commits = await getCommitsSinceTag(repositoryRoot, latestTag);
  if (commits.length === 0) {
    console.log("No commits since the latest tag; no release published.");
    return null;
  }

  const releaseType = resolveReleaseType(commits);
  const nextVersion = incrementVersion(currentVersion, releaseType);
  const releaseNotes = formatReleaseNotes(commits);
  await updateChangelog(repositoryRoot, nextVersion, releaseNotes);
  const artifacts = await prepareRelease(repositoryRoot, nextVersion);
  const tag = await commitAndTagRelease(repositoryRoot, nextVersion);
  await publishGitHubRelease(
    repositoryRoot,
    tag,
    nextVersion,
    releaseNotes,
    artifacts.releaseZipPath,
  );
  console.log(`Published NullByte ${tag}.`);
  return { tag, version: nextVersion, ...artifacts };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await publishRelease();
}
