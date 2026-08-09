import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import AdmZip from "adm-zip";
import {
  createReleaseArtifacts,
  patchWorldArchive,
  selectWorldFile,
  synchronizeVersions,
} from "../scripts/release/prepare-release.mjs";

const BEHAVIOR_PACK_ID = "8e584b65-0fec-485a-85df-29fdc902081c";
const RESOURCE_PACK_ID = "e41e77fd-03bf-4cb1-9437-2418792fe66d";
const THIRD_PARTY_BEHAVIOR_ID = "9cff8ac5-0cde-4bca-8fec-4eb8078ddab3";
const THIRD_PARTY_RESOURCE_ID = "71a7d53f-3bbc-4d03-8c76-76a9cdb1f1f3";

async function createFixtureRepository() {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "nullbyte-release-"));
  const packsDirectory = path.join(repositoryRoot, "packs");
  await mkdir(path.join(packsDirectory, "behavior_pack", "scripts"), { recursive: true });
  await mkdir(path.join(packsDirectory, "resource_pack", "textures"), { recursive: true });
  await mkdir(path.join(packsDirectory, "src"), { recursive: true });
  await mkdir(path.join(repositoryRoot, "release-inputs", "world"), { recursive: true });

  await writeFile(
    path.join(packsDirectory, "package.json"),
    JSON.stringify({ name: "fixture", version: "0.0.24" }, null, 2),
  );
  await writeFile(
    path.join(packsDirectory, "package-lock.json"),
    JSON.stringify({
      name: "fixture",
      version: "0.0.24",
      lockfileVersion: 3,
      packages: { "": { name: "fixture", version: "0.0.24" } },
    }),
  );
  await writeFile(
    path.join(packsDirectory, "behavior_pack", "manifest.json"),
    JSON.stringify({
      header: {
        name: "NullByte Behavior v0.0.24",
        description: "HEXCORE Evaluation Platform v0.0.24 (Behavior Pack)",
        uuid: BEHAVIOR_PACK_ID,
        version: [0, 0, 24],
      },
      modules: [{ version: [0, 0, 24] }],
      dependencies: [{ uuid: RESOURCE_PACK_ID, version: [0, 0, 24] }],
    }),
  );
  await writeFile(
    path.join(packsDirectory, "resource_pack", "manifest.json"),
    JSON.stringify({
      header: {
        name: "NullByte Resources v0.0.24",
        description: "HEXCORE Evaluation Platform v0.0.24 (Resource Pack)",
        uuid: RESOURCE_PACK_ID,
        version: [0, 0, 24],
      },
      modules: [{ version: [0, 0, 24] }],
    }),
  );
  await writeFile(
    path.join(packsDirectory, "src", "main.ts"),
    'const banner = "HEXCORE TERMINAL v0.0.24";\n',
  );
  await writeFile(
    path.join(repositoryRoot, "index.html"),
    "<title>HEXCORE PORTABLE TERMINAL v0.0.24</title>\n",
  );
  await writeFile(path.join(packsDirectory, "behavior_pack", "scripts", "main.js"), "export {};\n");
  await writeFile(path.join(packsDirectory, "resource_pack", "textures", "placeholder.txt"), "fixture\n");

  for (const documentName of [
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "INSTALLATION.md",
    "THIRD_PARTY_REQUIREMENTS.md",
  ]) {
    await writeFile(path.join(repositoryRoot, documentName), `${documentName}\n`);
  }

  const worldPath = path.join(
    repositoryRoot,
    "release-inputs",
    "world",
    "NullByte Test World.mcworld",
  );
  const worldArchive = new AdmZip();
  worldArchive.addFile(
    "world_behavior_packs.json",
    Buffer.from(JSON.stringify([
      { pack_id: THIRD_PARTY_BEHAVIOR_ID, version: [1, 0, 6] },
    ])),
  );
  worldArchive.addFile(
    "world_resource_packs.json",
    Buffer.from(JSON.stringify([
      { pack_id: THIRD_PARTY_RESOURCE_ID, version: [1, 0, 6] },
    ])),
  );
  worldArchive.addFile("levelname.txt", Buffer.from("NullByte Test World"));
  worldArchive.writeZip(worldPath);

  return { repositoryRoot, worldPath };
}

function readArchiveJson(archivePath, entryName) {
  const archive = new AdmZip(archivePath);
  const entry = archive.getEntry(entryName);
  assert.ok(entry, `${entryName} must exist`);
  return JSON.parse(entry.getData().toString("utf8"));
}

test("synchronizes every public version source", async () => {
  const { repositoryRoot } = await createFixtureRepository();
  await synchronizeVersions(repositoryRoot, "0.1.0");

  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "packs", "package.json")));
  const packageLock = JSON.parse(
    await readFile(path.join(repositoryRoot, "packs", "package-lock.json")),
  );
  const behaviorManifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "packs", "behavior_pack", "manifest.json")),
  );
  const resourceManifest = JSON.parse(
    await readFile(path.join(repositoryRoot, "packs", "resource_pack", "manifest.json")),
  );
  const mainSource = await readFile(path.join(repositoryRoot, "packs", "src", "main.ts"), "utf8");
  const playerGuide = await readFile(path.join(repositoryRoot, "index.html"), "utf8");

  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageLock.version, "0.1.0");
  assert.equal(packageLock.packages[""].version, "0.1.0");
  assert.deepEqual(behaviorManifest.header.version, [0, 1, 0]);
  assert.deepEqual(behaviorManifest.modules[0].version, [0, 1, 0]);
  assert.deepEqual(behaviorManifest.dependencies[0].version, [0, 1, 0]);
  assert.deepEqual(resourceManifest.header.version, [0, 1, 0]);
  assert.deepEqual(resourceManifest.modules[0].version, [0, 1, 0]);
  assert.match(mainSource, /HEXCORE TERMINAL v0\.1\.0/);
  assert.match(playerGuide, /HEXCORE PORTABLE TERMINAL v0\.1\.0/);
});

test("requires exactly one dated NullByte world", async () => {
  const { repositoryRoot } = await createFixtureRepository();
  assert.match(await selectWorldFile(repositoryRoot), /NullByte Test World\.mcworld$/);

  await writeFile(
    path.join(repositoryRoot, "release-inputs", "world", "NullByte Second World.mcworld"),
    "duplicate",
  );
  await assert.rejects(selectWorldFile(repositoryRoot), /found 2/);
});

test("patches NullByte references and preserves third-party references", async () => {
  const { repositoryRoot, worldPath } = await createFixtureRepository();
  const destinationPath = path.join(repositoryRoot, "patched.mcworld");
  await patchWorldArchive(worldPath, destinationPath, "0.2.0");

  const behaviorReferences = readArchiveJson(destinationPath, "world_behavior_packs.json");
  const resourceReferences = readArchiveJson(destinationPath, "world_resource_packs.json");
  assert.deepEqual(
    behaviorReferences.find((reference) => reference.pack_id === BEHAVIOR_PACK_ID).version,
    [0, 2, 0],
  );
  assert.deepEqual(
    resourceReferences.find((reference) => reference.pack_id === RESOURCE_PACK_ID).version,
    [0, 2, 0],
  );
  assert.ok(behaviorReferences.some((reference) => reference.pack_id === THIRD_PARTY_BEHAVIOR_ID));
  assert.ok(resourceReferences.some((reference) => reference.pack_id === THIRD_PARTY_RESOURCE_ID));
});

test("builds the approved release ZIP layout", async () => {
  const { repositoryRoot } = await createFixtureRepository();
  const artifacts = await createReleaseArtifacts(repositoryRoot, "0.0.24");
  const releaseArchive = new AdmZip(artifacts.releaseZipPath);
  const entryNames = releaseArchive.getEntries().map((entry) => entry.entryName).sort();

  assert.deepEqual(entryNames, [
    "CHANGELOG.md",
    "INSTALLATION.md",
    "LICENSE",
    "NullByte Test World.mcworld",
    "NullByte-v0.0.24.mcaddon",
    "README.md",
    "THIRD_PARTY_REQUIREMENTS.md",
    "index.html",
  ]);

  const mcaddonArchive = new AdmZip(artifacts.mcaddonPath);
  assert.ok(mcaddonArchive.getEntry("behavior_pack/manifest.json"));
  assert.ok(mcaddonArchive.getEntry("resource_pack/manifest.json"));
});
