const RELEASE_LEVELS = Object.freeze({
  patch: 1,
  minor: 2,
  major: 3,
  breaking: 3,
});

const RELEASE_TYPES = Object.freeze({
  1: "patch",
  2: "minor",
  3: "major",
});

const RELEASE_MARKER_PATTERN = /\[(patch|minor|major|breaking)\]/gi;
const SEMANTIC_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function getCommitMessage(commit) {
  if (typeof commit.message === "string" && commit.message.trim()) {
    return commit.message.trim();
  }

  return [commit.subject, commit.body]
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n")
    .trim();
}

export function findReleaseType(commits) {
  let highestLevel = 0;

  for (const commit of commits) {
    const message = getCommitMessage(commit);
    for (const match of message.matchAll(RELEASE_MARKER_PATTERN)) {
      highestLevel = Math.max(highestLevel, RELEASE_LEVELS[match[1].toLowerCase()]);
    }
  }

  return RELEASE_TYPES[highestLevel] ?? null;
}

// Any change under packs/ releases. Markers only raise the bump above patch.
export function resolveReleaseType(commits, fallback = "patch") {
  return findReleaseType(commits) ?? fallback;
}

export function incrementVersion(currentVersion, releaseType) {
  const match = SEMANTIC_VERSION_PATTERN.exec(currentVersion);
  if (!match) {
    throw new Error(`Invalid semantic version: ${currentVersion}`);
  }

  let [major, minor, patch] = match.slice(1).map(Number);
  if (releaseType === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === "minor") {
    minor += 1;
    patch = 0;
  } else if (releaseType === "patch") {
    patch += 1;
  } else {
    throw new Error(`Invalid release type: ${releaseType}`);
  }

  return `${major}.${minor}.${patch}`;
}

export function formatReleaseNotes(commits) {
  if (commits.length === 0) {
    return "No commits were included in this release.";
  }

  const entries = commits.map((commit) => {
    const message = getCommitMessage(commit);
    const [subject = "Untitled commit", ...bodyLines] = message.split(/\r?\n/);
    const shortHash = typeof commit.hash === "string" ? commit.hash.slice(0, 7) : "";
    const heading = shortHash ? `- ${subject} (${shortHash})` : `- ${subject}`;
    const body = bodyLines.join("\n").trim();

    if (!body) return heading;

    const indentedBody = body
      .split(/\r?\n/)
      .map((line) => `  ${line}`)
      .join("\n");
    return `${heading}\n${indentedBody}`;
  });

  return `## Changes\n\n${entries.join("\n")}`;
}

export async function analyzeCommits(_pluginConfig, context) {
  return findReleaseType(context.commits ?? []);
}

export async function generateNotes(_pluginConfig, context) {
  return formatReleaseNotes(context.commits ?? []);
}
