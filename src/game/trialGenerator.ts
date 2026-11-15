import {
  CheckpointDef,
  FragmentDef,
  GlyphPadDef,
  HazardDef,
  Level3DDefinition,
  MechanismDef,
  MirrorCrystalDef,
  PlatformDef,
  ResonanceColor,
  ResonanceDoorDef,
  TrialBlueprint,
  TrialDifficulty,
  TrialModeMeta,
  TrialRoomKind,
} from './types';
import { validateLevelReachability } from './levelValidator';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatShareCode(seed: number, difficulty: TrialDifficulty): string {
  const normalized = (seed >>> 0).toString(36).toUpperCase();
  return `ECHO-${normalized}-${difficulty.toUpperCase()}`;
}

export function parseShareCode(
  input: string
): { seed: number; difficulty: TrialDifficulty } | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;

  const match = /^ECHO-([0-9A-Z]+)-(NOVICE|EXPLORER|EXPERT|N|E|X)$/.exec(trimmed);
  if (match) {
    const parsedSeed = parseInt(match[1], 36);
    if (!Number.isFinite(parsedSeed) || parsedSeed <= 0) return null;
    const dToken = match[2];
    const difficulty: TrialDifficulty =
      dToken === 'NOVICE' || dToken === 'N'
        ? 'Novice'
        : dToken === 'EXPERT' || dToken === 'X'
          ? 'Expert'
          : 'Explorer';
    return { seed: parsedSeed >>> 0, difficulty };
  }

  // Also allow plain numeric seed
  if (/^\d{1,10}$/.test(trimmed)) {
    const num = Number(trimmed) >>> 0;
    if (num > 0) return { seed: num, difficulty: 'Explorer' };
  }
  return null;
}

export function getDailyUtcTrialInfo(date = new Date()): {
  dateUtc: string;
  seed: number;
  difficulty: TrialDifficulty;
  shareCode: string;
} {
  const dateUtc = date.toISOString().slice(0, 10);
  let h = 2166136261;
  const input = `echoes-daily-${dateUtc}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const seed = (h >>> 0) || 104729;
  const diffs: TrialDifficulty[] = ['Novice', 'Explorer', 'Expert'];
  const difficulty = diffs[seed % diffs.length];
  return {
    dateUtc,
    seed,
    difficulty,
    shareCode: formatShareCode(seed, difficulty),
  };
}

export function generateLocalTrialBlueprint(
  seed: number,
  difficulty: TrialDifficulty
): TrialBlueprint {
  const rng = mulberry32(seed);
  const prefixes = ['The Sunken', 'The Whispering', 'The Resonant', 'The Hollow', 'The Obsidian'];
  const nouns = ['Belfry', 'Vault', 'Cistern', 'Atrium', 'Spire', 'Gallery'];
  const colors: ResonanceColor[] = ['cyan', 'violet', 'amber'];
  const title = `${prefixes[Math.floor(rng() * prefixes.length)]} ${nouns[Math.floor(rng() * nouns.length)]}`;
  const themeColor = colors[Math.floor(rng() * colors.length)];

  const roomCount = difficulty === 'Novice' ? 4 : difficulty === 'Explorer' ? 5 : 6;
  const pool: TrialRoomKind[] =
    difficulty === 'Novice'
      ? ['bridge', 'glyph_gate', 'mirror_vault', 'seal_shrine']
      : difficulty === 'Explorer'
        ? ['bridge', 'glyph_gate', 'mirror_vault', 'crumble_span', 'seal_shrine', 'drone_hall']
        : ['glyph_gate', 'mirror_vault', 'crumble_span', 'drone_hall', 'seal_shrine'];

  const rooms: TrialBlueprint['rooms'] = [];
  for (let i = 0; i < roomCount; i += 1) {
    const kind = i === roomCount - 1 ? 'seal_shrine' : pool[Math.floor(rng() * pool.length)];
    const elevationDelta = rng() < 0.2 ? -1 : rng() < 0.65 ? 1 : 0;
    rooms.push({
      kind,
      elevationDelta,
      hasFragment: i % 2 === 0 || rng() < 0.55,
    });
  }

  return {
    title,
    themeColor,
    ambientPrompt: `${title} answers your Echo Core. Map the unseen bridges and reach the resonant exit.`,
    rooms,
  };
}

function buildAttemptLevel(
  seed: number,
  difficulty: TrialDifficulty,
  blueprint: TrialBlueprint,
  meta: TrialModeMeta,
  guaranteedSafe = false
): Level3DDefinition {
  const rng = mulberry32(seed);
  const platforms: PlatformDef[] = [
    { id: 'tr_start', x: 0, y: 0, z: 0, w: 7, h: 1.5, d: 7, kind: 'solid' },
  ];
  const hazards: HazardDef[] = [];
  const fragments: FragmentDef[] = [];
  const mechanisms: MechanismDef[] = [];
  const checkpoints: CheckpointDef[] = [];
  const glyphPads: GlyphPadDef[] = [];
  const resonanceDoors: ResonanceDoorDef[] = [];
  const mirrorCrystals: MirrorCrystalDef[] = [];

  let curX = 0;
  let curY = 0;
  let curZ = -3.5; // Front edge of start platform
  const colors: ResonanceColor[] = ['cyan', 'violet', 'amber'];
  let fragIdx = 1;
  let mechIdx = 1;
  let doorIdx = 1;

  blueprint.rooms.forEach((room, idx) => {
    const gap = guaranteedSafe
      ? 2.2
      : difficulty === 'Novice'
        ? 2.0 + rng() * 0.9
        : difficulty === 'Explorer'
          ? 2.4 + rng() * 1.1
          : 2.7 + rng() * 1.2;

    const stepY = guaranteedSafe
      ? 0.4
      : Math.max(-1.0, Math.min(1.2, room.elevationDelta * 0.65));
    const latOffset = guaranteedSafe ? 0 : (rng() - 0.5) * 3.0;

    // Room approach stepping stone
    const stepW = difficulty === 'Novice' ? 4.2 : 3.6;
    const stepD = difficulty === 'Novice' ? 4.2 : 3.8;
    const stepCenterZ = curZ - gap - stepD * 0.5;
    const stepX = curX + latOffset * 0.5;
    const stepYVal = Number((curY + stepY * 0.5).toFixed(2));

    const stepKind =
      !guaranteedSafe && room.kind === 'crumble_span'
        ? 'crumbling'
        : !guaranteedSafe && room.kind === 'bridge' && rng() < 0.35
          ? 'moving'
          : 'hidden';

    platforms.push({
      id: `tr_step_${idx}`,
      x: Number(stepX.toFixed(2)),
      y: stepYVal,
      z: Number(stepCenterZ.toFixed(2)),
      w: stepW,
      h: 1.0,
      d: stepD,
      kind: stepKind,
      ...(stepKind === 'moving'
        ? { moveAxis: 'x' as const, moveRange: 1.4, moveSpeed: 1.1, movePhase: idx }
        : {}),
    });

    // Main room arena
    const roomW = room.kind === 'drone_hall' ? 8.2 : 6.4;
    const roomD = room.kind === 'drone_hall' ? 8.6 : 6.8;
    const nextGap = guaranteedSafe ? 2.1 : 2.3 + rng() * 0.8;
    const roomZ = stepCenterZ - stepD * 0.5 - nextGap - roomD * 0.5;
    const roomX = curX + latOffset;
    const roomY = Number((curY + stepY).toFixed(2));
    const topY = roomY + 0.6;

    platforms.push({
      id: `tr_room_${idx}`,
      x: Number(roomX.toFixed(2)),
      y: roomY,
      z: Number(roomZ.toFixed(2)),
      w: roomW,
      h: 1.2,
      d: roomD,
      kind: idx === Math.floor(blueprint.rooms.length / 2) ? 'solid' : room.kind === 'crumble_span' ? 'crumbling' : 'hidden',
    });

    if (idx === Math.floor(blueprint.rooms.length / 2)) {
      checkpoints.push({
        id: `tr_cp_${idx}`,
        x: Number(roomX.toFixed(2)),
        y: topY,
        z: Number(roomZ.toFixed(2)),
      });
    }

    if (room.kind === 'glyph_gate' && doorIdx <= 2) {
      const color = colors[(idx + seed) % colors.length];
      const doorId = `tr_door_${doorIdx}`;
      const gpX = roomX - roomW * 0.28;
      const gpZ = roomZ + roomD * 0.18;
      glyphPads.push({
        id: `tr_pad_${doorIdx}`,
        x: Number(gpX.toFixed(2)),
        y: topY,
        z: Number(gpZ.toFixed(2)),
        color,
        doorId,
      });
      resonanceDoors.push({
        id: doorId,
        x: Number(roomX.toFixed(2)),
        y: Number((topY + 1.8).toFixed(2)),
        z: Number((roomZ - roomD * 0.42).toFixed(2)),
        w: 4.0,
        h: 3.6,
        d: 0.7,
        color,
      });
      doorIdx += 1;
    } else if (room.kind === 'mirror_vault') {
      mirrorCrystals.push({
        id: `tr_mirror_${idx}`,
        x: Number((roomX - 1.8).toFixed(2)),
        y: Number((topY + 1.1).toFixed(2)),
        z: Number(roomZ.toFixed(2)),
        dirX: 0.2,
        dirY: 0,
        dirZ: -1,
        length: 14,
      });
    } else if (room.kind === 'drone_hall' && !guaranteedSafe) {
      const isSound = difficulty !== 'Novice';
      hazards.push({
        id: `tr_drone_${idx}`,
        x: Number(roomX.toFixed(2)),
        y: Number((topY + 1.15).toFixed(2)),
        z: Number(roomZ.toFixed(2)),
        radius: 0.85,
        height: 1.3,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 2.3,
        moveSpeed: difficulty === 'Expert' ? 1.8 : 1.35,
        movePhase: idx,
        soundSensitive: isSound,
      });
    } else if (room.kind === 'seal_shrine' || (idx === blueprint.rooms.length - 1 && mechIdx === 1)) {
      mechanisms.push({
        id: `tr_seal_${mechIdx}`,
        x: Number((roomX + (mechIdx % 2 === 0 ? -1.4 : 1.4)).toFixed(2)),
        y: topY,
        z: Number(roomZ.toFixed(2)),
        label: `Trial Seal ${mechIdx}`,
      });
      mechIdx += 1;
    } else if (!guaranteedSafe && difficulty !== 'Novice' && rng() < 0.55) {
      hazards.push({
        id: `tr_spike_${idx}`,
        x: Number((roomX + (rng() > 0.5 ? 1.6 : -1.6)).toFixed(2)),
        y: Number((topY + 0.45).toFixed(2)),
        z: Number(roomZ.toFixed(2)),
        radius: 0.75,
        height: 0.9,
        kind: 'spikes',
      });
    }

    if (room.hasFragment || fragIdx <= 2) {
      fragments.push({
        id: `trial_f${fragIdx}`,
        x: Number((roomX + (room.kind === 'seal_shrine' ? 0 : 1.2)).toFixed(2)),
        y: Number((topY + 1.25).toFixed(2)),
        z: Number(roomZ.toFixed(2)),
        isSecret: false,
      });
      fragIdx += 1;
    }

    curX = roomX;
    curY = roomY;
    curZ = roomZ - roomD * 0.5;
  });

  // Final Exit Platform
  const exitZ = curZ - 2.4 - 3.5;
  const exitY = Number((curY + 0.4).toFixed(2));
  platforms.push({
    id: 'tr_exit',
    x: Number(curX.toFixed(2)),
    y: exitY,
    z: Number(exitZ.toFixed(2)),
    w: 7,
    h: 1.5,
    d: 7,
    kind: 'solid',
  });

  const ambientHex =
    blueprint.themeColor === 'violet'
      ? 0x160f30
      : blueprint.themeColor === 'amber'
        ? 0x1e1610
        : 0x0b1530;

  return {
    levelNumber: 5,
    id: `trial-${meta.shareCode.toLowerCase()}`,
    name: blueprint.title,
    subtitle: `${difficulty} Echo Trial · ${meta.shareCode}`,
    difficulty: difficulty === 'Novice' ? 'Beginner' : difficulty === 'Explorer' ? 'Intermediate' : 'Expert',
    objective:
      mechanisms.length > 0
        ? `Activate ${mechanisms.length} Trial Seal${mechanisms.length > 1 ? 's' : ''} and reach the exit portal.`
        : 'Navigate the procedural cavern and reach the exit portal.',
    spawn: { x: 0, y: 1.6, z: 0 },
    ambientColor: ambientHex,
    fogDensity: difficulty === 'Expert' ? 0.036 : 0.028,
    platforms,
    hazards,
    fragments,
    mechanisms,
    checkpoints,
    statues: [
      {
        id: 'tr_statue_start',
        x: -2.4,
        y: 0.75,
        z: -1.2,
        rotY: Math.PI / 5,
        inscription: blueprint.ambientPrompt,
      },
    ],
    waterfalls: [],
    glyphPads,
    resonanceDoors,
    mirrorCrystals,
    exit: {
      x: Number(curX.toFixed(2)),
      y: Number((exitY + 0.75).toFixed(2)),
      z: Number(exitZ.toFixed(2)),
      requiredMechanisms: mechanisms.length,
    },
    isTrial: true,
    trialMeta: meta,
  };
}

export function generateValidatedTrialLevel(
  seed: number,
  difficulty: TrialDifficulty,
  blueprint: TrialBlueprint,
  options: { isDaily?: boolean; dateUtc?: string; source?: 'gemini' | 'fallback' } = {}
): Level3DDefinition {
  const normalizedSeed = (Math.abs(Math.floor(seed)) >>> 0) || 1;
  const meta: TrialModeMeta = {
    seed: normalizedSeed,
    difficulty,
    shareCode: formatShareCode(normalizedSeed, difficulty),
    isDaily: Boolean(options.isDaily),
    dateUtc: options.dateUtc,
    blueprintSource: options.source === 'gemini' ? 'gemini' : 'procedural',
    title: blueprint.title,
    ambientWhisper: blueprint.ambientPrompt,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateSeed = (normalizedSeed + attempt * 7919) >>> 0;
    const candidate = buildAttemptLevel(candidateSeed, difficulty, blueprint, meta, false);
    const report = validateLevelReachability(candidate);
    if (report.valid) {
      return candidate;
    }
  }

  return buildAttemptLevel(normalizedSeed, difficulty, blueprint, meta, true);
}
