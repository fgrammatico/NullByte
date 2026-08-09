import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(packsDirectory, "..");

const privateFiles = [
  {
    source: resolve(repositoryDirectory, "release-inputs/runtime/game-config.ts"),
    destination: resolve(packsDirectory, "src/game-config.ts"),
  },
  {
    source: resolve(
      repositoryDirectory,
      "release-inputs/runtime/dialogue/compromised-sysadmin.json",
    ),
    destination: resolve(
      packsDirectory,
      "behavior_pack/dialogue/private-compromised-sysadmin.json",
    ),
  },
  {
    source: resolve(
      repositoryDirectory,
      "release-inputs/runtime/dialogue/lobby-hr-bot.json",
    ),
    destination: resolve(
      packsDirectory,
      "behavior_pack/dialogue/private-lobby-hr-bot.json",
    ),
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
