import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";

const execFileAsync = promisify(execFile);
const SEMANTIC_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const NULLBYTE_BEHAVIOR_PACK_ID = "8e584b65-0fec-485a-85df-29fdc902081c";
const NULLBYTE_RESOURCE_PACK_ID = "e41e77fd-03bf-4cb1-9437-2418792fe66d";
const REQUIRED_RELEASE_DOCUMENTS = [
  "README.md",
  "index.html",
  "LICENSE",
  "CHANGELOG.md",
  "INSTALLATION.md",
  "THIRD_PARTY_REQUIREMENTS.md",
];

function getRepositoryRoot() {
  return fileURLToPath(new URL("../../../", import.meta.url));
}

function parseVersion(version) {
  const match = SEMANTIC_VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return match.slice(1).map(Number);
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)
    .replace(/\[\n\s+(-?\d+),\n\s+(-?\d+),\n\s+(-?\d+)\n\s+\]/g, "[$1, $2, $3]")
    .replace(/\[\n\s+\"([^\"]+)\"\n\s+\]/g, '["$1"]')}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function replaceVersionLabel(filePath, pattern, replacement, label) {
  const source = await readFile(filePath, "utf8");
  if (!pattern.test(source)) {
    throw new Error(`${label} was not found in ${filePath}`);
  }
  pattern.lastIndex = 0;
  await writeFile(filePath, source.replace(pattern, replacement));
}

export async function synchronizeVersions(repositoryRoot, version) {
  const versionParts = parseVersion(version);
  const packsDirectory = path.join(repositoryRoot, "packs");
  const packagePath = path.join(packsDirectory, "package.json");
  const packageLockPath = path.join(packsDirectory, "package-lock.json");
  const behaviorManifestPath = path.join(packsDirectory, "behavior_pack", "manifest.json");
  const resourceManifestPath = path.join(packsDirectory, "resource_pack", "manifest.json");
  const mainSourcePath = path.join(packsDirectory, "src", "main.ts");
  const playerGuidePath = path.join(repositoryRoot, "index.html");

  const packageJson = await readJson(packagePath);
  packageJson.version = version;
  await writeFile(packagePath, formatJson(packageJson));

  const packageLock = await readJson(packageLockPath);
  packageLock.version = version;
  if (!packageLock.packages?.[""]) {
    throw new Error("Package lock does not contain the root package metadata.");
  }
  packageLock.packages[""].version = version;
  await writeFile(packageLockPath, formatJson(packageLock));

  const behaviorManifest = await readJson(behaviorManifestPath);
  behaviorManifest.header.name = `NullByte Behavior v${version}`;
  behaviorManifest.header.description = `HEXCORE Evaluation Platform v${version} (Behavior Pack)`;
  behaviorManifest.header.version = versionParts;
  for (const module of behaviorManifest.modules) {
    module.version = versionParts;
  }
  const resourceDependency = behaviorManifest.dependencies.find(
    (dependency) => dependency.uuid?.toLowerCase() === NULLBYTE_RESOURCE_PACK_ID,
  );
  if (!resourceDependency) {
    throw new Error("Behavior manifest does not reference the NullByte resource pack.");
  }
  resourceDependency.version = versionParts;
  await writeFile(behaviorManifestPath, formatJson(behaviorManifest));

  const resourceManifest = await readJson(resourceManifestPath);
  resourceManifest.header.name = `NullByte Resources v${version}`;
  resourceManifest.header.description = `HEXCORE Evaluation Platform v${version} (Resource Pack)`;
  resourceManifest.header.version = versionParts;
  for (const module of resourceManifest.modules) {
    module.version = versionParts;
  }
  await writeFile(resourceManifestPath, formatJson(resourceManifest));

  await replaceVersionLabel(
    mainSourcePath,
    /HEXCORE TERMINAL v\d+\.\d+\.\d+/g,
    `HEXCORE TERMINAL v${version}`,
    "Terminal version",
  );
  await replaceVersionLabel(
    playerGuidePath,
    /HEXCORE PORTABLE TERMINAL v\d+\.\d+\.\d+/g,
    `HEXCORE PORTABLE TERMINAL v${version}`,
    "Player guide version",
  );
}

export async function selectWorldFile(repositoryRoot) {
  const worldDirectory = path.join(repositoryRoot, "release-inputs", "world");
  const entries = await readdir(worldDirectory, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isFile() && /^NullByte .+\.mcworld$/i.test(entry.name))
    .map((entry) => path.join(worldDirectory, entry.name));

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one NullByte *.mcworld file in ${worldDirectory}; found ${matches.length}.`,
    );
  }

  return matches[0];
}

function updatePackReference(archive, entryName, packId, versionParts) {
  const entry = archive.getEntry(entryName);
  if (!entry) {
    throw new Error(`World archive is missing ${entryName}.`);
  }

  const references = JSON.parse(entry.getData().toString("utf8"));
  if (!Array.isArray(references)) {
    throw new Error(`${entryName} must contain a JSON array.`);
  }

  const existingReference = references.find(
    (reference) => reference.pack_id?.toLowerCase() === packId,
  );
  if (existingReference) {
    existingReference.version = versionParts;
  } else {
    references.push({ pack_id: packId, version: versionParts });
  }

  archive.updateFile(entryName, Buffer.from(formatJson(references), "utf8"));
}

export async function patchWorldArchive(sourcePath, destinationPath, version) {
  const versionParts = parseVersion(version);
  const archive = new AdmZip(sourcePath);
  updatePackReference(
    archive,
    "world_behavior_packs.json",
    NULLBYTE_BEHAVIOR_PACK_ID,
    versionParts,
  );
  updatePackReference(
    archive,
    "world_resource_packs.json",
    NULLBYTE_RESOURCE_PACK_ID,
    versionParts,
  );
  archive.writeZip(destinationPath);
}

function createMcaddon(packsDirectory, destinationPath) {
  const archive = new AdmZip();
  archive.addLocalFolder(path.join(packsDirectory, "behavior_pack"), "behavior_pack");
  archive.addLocalFolder(path.join(packsDirectory, "resource_pack"), "resource_pack");
  archive.writeZip(destinationPath);
}

function createReleaseZip(repositoryRoot, mcaddonPath, worldPath, destinationPath) {
  const archive = new AdmZip();
  for (const documentName of REQUIRED_RELEASE_DOCUMENTS) {
    archive.addLocalFile(path.join(repositoryRoot, documentName));
  }
  archive.addLocalFile(mcaddonPath);
  archive.addLocalFile(worldPath);
  archive.writeZip(destinationPath);
}

export async function createReleaseArtifacts(repositoryRoot, version) {
  parseVersion(version);
  const packsDirectory = path.join(repositoryRoot, "packs");
  const outputDirectory = path.join(repositoryRoot, "release-output");
  const sourceWorldPath = await selectWorldFile(repositoryRoot);
  const mcaddonPath = path.join(outputDirectory, `NullByte-v${version}.mcaddon`);
  const packagedWorldPath = path.join(outputDirectory, `NullByte-v${version}.mcworld`);
  const releaseZipPath = path.join(outputDirectory, `NullByte-v${version}.zip`);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  createMcaddon(packsDirectory, mcaddonPath);
  await patchWorldArchive(sourceWorldPath, packagedWorldPath, version);
  createReleaseZip(repositoryRoot, mcaddonPath, packagedWorldPath, releaseZipPath);

  return { mcaddonPath, packagedWorldPath, releaseZipPath };
}

async function runBuild(repositoryRoot) {
  const packsDirectory = path.join(repositoryRoot, "packs");
  const { stdout, stderr } = await execFileAsync("npm", ["run", "build"], {
    cwd: packsDirectory,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

export async function prepareRelease(repositoryRoot, version) {
  await synchronizeVersions(repositoryRoot, version);
  await runBuild(repositoryRoot);
  return createReleaseArtifacts(repositoryRoot, version);
}

export async function prepare(_pluginConfig, context) {
  await prepareRelease(getRepositoryRoot(), context.nextRelease.version);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!version) {
    throw new Error("Usage: node prepare-release.mjs <version>");
  }
  const artifacts = await prepareRelease(getRepositoryRoot(), version);
  console.log(`Prepared release archive: ${artifacts.releaseZipPath}`);
}
