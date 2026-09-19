export const GAME_CONFIG = {
  objectives: {
    noise: "RELEASE_VALUE",
    alarms: "RELEASE_VALUE",
    locked: "RELEASE_VALUE",
    perm: "RELEASE_VALUE",
    startTick: "RELEASE_VALUE",
    patchReady: "RELEASE_VALUE",
    fwall: "RELEASE_VALUE",
    ids: "RELEASE_VALUE", // unused since the End redesign (IDS puzzle removed); registered but unread, prune later
    enc: "RELEASE_VALUE",
    victory: "RELEASE_VALUE",
    knock: "RELEASE_VALUE",
    p01: "RELEASE_VALUE",
    p02: "RELEASE_VALUE",
    p03: "RELEASE_VALUE",
    p04: "RELEASE_VALUE",
    p05: "RELEASE_VALUE", // unused since the End redesign (Firewall Console removed); registered but unread, prune later
    p06: "RELEASE_VALUE", // unused since the End redesign (Key Assembly removed); registered but unread, prune later
    p07: "RELEASE_VALUE",
  },
  globalParticipant: "RELEASE_VALUE",
  boundary: {
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    spawnX: 0,
    spawnY: 0,
    spawnZ: 0,
  },
  login: {
    username: "RELEASE_VALUE",
    password: "RELEASE_VALUE",
  },
  portKnockSequence: ["RELEASE_VALUE", "RELEASE_VALUE", "RELEASE_VALUE"],
} as const;
