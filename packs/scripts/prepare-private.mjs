import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(packsDirectory, "..");

// NPC dialogue scenes are tracked directly in packs/behavior_pack/dialogue and are not copied here.
const privateFiles = [
  {
    source: resolve(repositoryDirectory, "release-inputs/runtime/game-config.ts"),
    destination: resolve(packsDirectory, "src/game-config.ts"),
  },
];

for (const privateFile of privateFiles) {
  try {
    await access(privateFile.source);
  } catch {
    throw new Error(`Missing private release file: ${privateFile.source}`);
  }

  await mkdir(dirname(privateFile.destination), { recursive: true });
  await copyFile(privateFile.source, privateFile.destination);
}

console.log("Prepared release runtime files.");
