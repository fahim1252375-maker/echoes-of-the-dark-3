import { Level3DDefinition, MedalTier, PlatformDef } from './types';

export const TOTAL_CAMPAIGN_FRAGMENTS = 23;

export const LEVEL_MEDAL_THRESHOLDS: Record<number, { gold: number; silver: number; bronze: number }> = {
  1: { gold: 45, silver: 75, bronze: 120 },
  2: { gold: 65, silver: 110, bronze: 170 },
  3: { gold: 90, silver: 150, bronze: 230 },
  4: { gold: 105, silver: 170, bronze: 260 },
  5: { gold: 130, silver: 210, bronze: 320 },
};

export function computeLevelMedal(levelNumber: number, seconds: number | undefined): MedalTier {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const t = LEVEL_MEDAL_THRESHOLDS[levelNumber];
  if (!t) return null;
  if (seconds <= t.gold) return 'gold';
  if (seconds <= t.silver) return 'silver';
  if (seconds <= t.bronze) return 'bronze';
  return 'bronze';
}

export interface ValidationReport {
  valid: boolean;
  levelNumber: number;
  errors: string[];
  reachablePlatformIds: string[];
}

// Engine physics caps:
// GRAVITY = 24, JUMP_VELOCITY = 10.6 -> maxJumpHeight = 2.34
// SPRINT_SPEED = 9.8, airTime ~ 0.90s + coyote 0.12s -> comfortable max edge gap ~5.8 units
const MAX_STEP_UP = 2.15;
const MAX_EDGE_GAP = 5.9;

function getPlatformBounds(p: PlatformDef): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
  topMinY: number;
  topMaxY: number;
} {
  const range = p.kind === 'moving' ? Math.abs(p.moveRange ?? 0) : 0;
  const rx = p.kind === 'moving' && p.moveAxis === 'x' ? range : 0;
  const ry = p.kind === 'moving' && p.moveAxis === 'y' ? range : 0;
  const rz = p.kind === 'moving' && p.moveAxis === 'z' ? range : 0;

  return {
    minX: p.x - p.w * 0.5 - rx,
    maxX: p.x + p.w * 0.5 + rx,
    minZ: p.z - p.d * 0.5 - rz,
    maxZ: p.z + p.d * 0.5 + rz,
    topY: p.y + p.h * 0.5,
    topMinY: p.y + p.h * 0.5 - ry,
    topMaxY: p.y + p.h * 0.5 + ry,
  };
}

function canJumpBetween(a: PlatformDef, b: PlatformDef): boolean {
  const ba = getPlatformBounds(a);
  const bb = getPlatformBounds(b);

  // Check vertical step-up feasibility from a's reachable top up to b's lowest top
  const dy = bb.topMinY - ba.topMaxY;
  if (dy > MAX_STEP_UP) return false;

  // Shortest horizontal gap between platform footprints
  const gapX = Math.max(0, Math.max(bb.minX - ba.maxX, ba.minX - bb.maxX));
  const gapZ = Math.max(0, Math.max(bb.minZ - ba.maxZ, ba.minZ - bb.maxZ));
  const horizGap = Math.hypot(gapX, gapZ);

  // Higher platforms shorten airtime slightly; drop-downs allow slightly wider reach
  const allowedGap = dy > 1.2 ? 4.8 : dy < -0.5 ? MAX_EDGE_GAP + 1.2 : MAX_EDGE_GAP;
  return horizGap <= allowedGap;
}

function pointNearAnyReachablePlatform(
  x: number,
  y: number,
  z: number,
  reachable: PlatformDef[],
  maxHorizDist = 3.2,
  maxVertDist = 3.0
): boolean {
  for (const p of reachable) {
    const b = getPlatformBounds(p);
    const dx = Math.max(0, Math.max(b.minX - x, x - b.maxX));
    const dz = Math.max(0, Math.max(b.minZ - z, z - b.maxZ));
    const horiz = Math.hypot(dx, dz);
    const dy = y - b.topY;
    if (horiz <= maxHorizDist && dy >= -1.2 && dy <= maxVertDist) {
      return true;
    }
  }
  return false;
}

export function validateLevelReachability(level: Level3DDefinition): ValidationReport {
  const errors: string[] = [];
  if (level.platforms.length === 0) {
    return { valid: false, levelNumber: level.levelNumber, errors: ['No platforms defined'], reachablePlatformIds: [] };
  }

  // Find starting platform under spawn
  const startPlats = level.platforms.filter((p) => {
    const b = getPlatformBounds(p);
    return (
      level.spawn.x >= b.minX - 0.6 &&
      level.spawn.x <= b.maxX + 0.6 &&
      level.spawn.z >= b.minZ - 0.6 &&
      level.spawn.z <= b.maxZ + 0.6 &&
      Math.abs(level.spawn.y - b.topY) <= 1.2
    );
  });

  if (startPlats.length === 0) {
    errors.push(`Spawn (${level.spawn.x}, ${level.spawn.y}, ${level.spawn.z}) is not grounded on any platform`);
  }

  const visited = new Set<string>(startPlats.map((p) => p.id));
  const queue: PlatformDef[] = [...startPlats];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const next of level.platforms) {
      if (visited.has(next.id)) continue;
      if (canJumpBetween(curr, next)) {
        visited.add(next.id);
        queue.push(next);
      }
    }
  }

  const reachablePlatforms = level.platforms.filter((p) => visited.has(p.id));

  if (!pointNearAnyReachablePlatform(level.exit.x, level.exit.y, level.exit.z, reachablePlatforms, 2.5, 2.5)) {
    errors.push(`Exit at (${level.exit.x}, ${level.exit.y}, ${level.exit.z}) is unreachable from spawn`);
  }

  for (const m of level.mechanisms) {
    if (!pointNearAnyReachablePlatform(m.x, m.y, m.z, reachablePlatforms, 2.2, 2.2)) {
      errors.push(`Mechanism ${m.id} is unreachable`);
    }
  }

  for (const cp of level.checkpoints) {
    if (!pointNearAnyReachablePlatform(cp.x, cp.y, cp.z, reachablePlatforms, 2.2, 2.2)) {
      errors.push(`Checkpoint ${cp.id} is unreachable`);
    }
  }

  for (const f of level.fragments) {
    if (!pointNearAnyReachablePlatform(f.x, f.y, f.z, reachablePlatforms, 3.0, 3.0)) {
      errors.push(`Fragment ${f.id} is unreachable`);
    }
  }

  for (const pad of level.glyphPads ?? []) {
    if (!pointNearAnyReachablePlatform(pad.x, pad.y, pad.z, reachablePlatforms, 2.0, 2.0)) {
      errors.push(`GlyphPad ${pad.id} is unreachable`);
    }
  }

  if (level.bossWarden) {
    const bw = level.bossWarden;
    if (
      !pointNearAnyReachablePlatform(
        bw.arenaCenterX,
        level.exit.y,
        bw.arenaCenterZ,
        reachablePlatforms,
        2.5,
        2.5
      )
    ) {
      errors.push(`Boss Warden arena at (${bw.arenaCenterX}, ${bw.arenaCenterZ}) is unreachable`);
    }
    const arenaMirrors = (level.mirrorCrystals ?? []).filter((mc) =>
      pointNearAnyReachablePlatform(mc.x, level.exit.y, mc.z, reachablePlatforms, 2.5, 2.5)
    );
    if (arenaMirrors.length === 0) {
      errors.push('Boss Warden arena requires at least one reachable Mirror Crystal');
    }
  }

  return {
    valid: errors.length === 0,
    levelNumber: level.levelNumber,
    errors,
    reachablePlatformIds: Array.from(visited),
  };
}
