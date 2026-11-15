import { Types } from 'mongoose';
import { GameProgress, ICheckpoint, IGameProgress } from '../models/GameProgress';
import { Achievement, AchievementId } from '../models/Achievement';

export const VALID_FRAGMENT_IDS = new Set([
  'l1_f1',
  'l1_f2',
  'l1_f3',
  'l2_f1',
  'l2_f2',
  'l2_f3',
  'l2_f4',
  'l3_f1',
  'l3_f2',
  'l3_f3',
  'l3_f4',
  'l3_f5',
  'l4_f1',
  'l4_f2',
  'l4_f3',
  'l4_f4',
  'l4_f5',
  'l5_f1',
  'l5_f2',
  'l5_f3',
  'l5_f4',
  'l5_f5',
  'l5_f6',
]);

export const GOLD_MEDAL_THRESHOLDS: Record<number, number> = {
  1: 45,
  2: 65,
  3: 90,
  4: 105,
  5: 130,
};

export const ACHIEVEMENT_CATALOG: Record<
  AchievementId,
  { id: AchievementId; title: string; description: string }
> = {
  FIRST_ECHO: {
    id: 'FIRST_ECHO',
    title: 'First Echo',
    description: 'Activate your first sonar pulse from the Echo Core.',
  },
  EXPLORER: {
    id: 'EXPLORER',
    title: 'Explorer',
    description: 'Discover secret paths across the underground chambers.',
  },
  CRYSTAL_SEEKER: {
    id: 'CRYSTAL_SEEKER',
    title: 'Crystal Seeker',
    description: 'Collect 10 Echo Fragments across the underground.',
  },
  TEMPLE_MASTER: {
    id: 'TEMPLE_MASTER',
    title: 'Temple Master',
    description: 'Complete Level 02 — The Lost Temple.',
  },
  BEYOND_THE_DARK: {
    id: 'BEYOND_THE_DARK',
    title: 'Beyond the Dark',
    description: 'Complete all five levels of Echoes of the Dark.',
  },
  RESONANCE_MASTER: {
    id: 'RESONANCE_MASTER',
    title: 'Resonance Master',
    description: 'Unlock 3 Resonance Doors using Glyph Pads.',
  },
  GHOST_STEP: {
    id: 'GHOST_STEP',
    title: 'Ghost Step',
    description: 'Complete a stage without alerting any sound-sensitive drones.',
  },
  SPEED_DEMON: {
    id: 'SPEED_DEMON',
    title: 'Speed Demon',
    description: 'Earn a Gold Medal time on any campaign stage.',
  },
  COMPLETIONIST: {
    id: 'COMPLETIONIST',
    title: 'Completionist',
    description: 'Clear all 5 stages and recover all 23 Echo Fragments.',
  },
};

export function sanitizeFragmentList(fragments: unknown): string[] {
  if (!Array.isArray(fragments)) return [];
  const valid = new Set<string>();
  for (const id of fragments) {
    if (typeof id === 'string' && VALID_FRAGMENT_IDS.has(id)) {
      valid.add(id);
    }
  }
  return Array.from(valid);
}

export function sanitizeLevelArray(levels: unknown): number[] {
  if (!Array.isArray(levels)) return [];
  const valid = new Set<number>();
  for (const lvl of levels) {
    if (typeof lvl === 'number' && Number.isInteger(lvl) && lvl >= 1 && lvl <= 5) {
      valid.add(lvl);
    }
  }
  return Array.from(valid).sort((a, b) => a - b);
}

export function calculateAuthoritativeScore(
  completedLevels: number[],
  collectedFragments: string[],
  bestCompletionTimes: Map<string, number>
): number {
  let score = completedLevels.length * 1000 + collectedFragments.length * 250;
  for (const lvl of completedLevels) {
    const t = bestCompletionTimes.get(String(lvl));
    if (typeof t === 'number' && t >= 5) {
      score += Math.max(0, Math.round(600 - Math.min(600, t)));
    }
  }
  return score;
}

export async function getOrCreateProgress(userId: string | Types.ObjectId): Promise<IGameProgress> {
  let progress = await GameProgress.findOne({ userId });
  if (!progress) {
    progress = await GameProgress.create({ userId });
  }
  return progress;
}

function getBestTime(
  times: Map<string, number> | Record<string, number> | undefined,
  level: number
): number | undefined {
  if (!times) return undefined;
  if (times instanceof Map) return times.get(String(level));
  return times[String(level)];
}

export function evaluateAchievementEligibility(
  achievementId: AchievementId,
  progress: IGameProgress
): boolean {
  const completed = Array.isArray(progress.completedLevels) ? progress.completedLevels : [];
  const fragments = Array.isArray(progress.collectedFragments) ? progress.collectedFragments : [];
  const noAlerts = Array.isArray(progress.noAlertCompletedLevels)
    ? progress.noAlertCompletedLevels
    : [];
  const allFiveCleared = [1, 2, 3, 4, 5].every((lvl) => completed.includes(lvl));

  switch (achievementId) {
    case 'FIRST_ECHO':
      return progress.pulsesEmitted >= 1;
    case 'EXPLORER':
      return (progress.secretsDiscovered?.length ?? 0) >= 1;
    case 'CRYSTAL_SEEKER':
      return fragments.length >= 10;
    case 'TEMPLE_MASTER':
      return completed.includes(2);
    case 'BEYOND_THE_DARK':
      return allFiveCleared;
    case 'RESONANCE_MASTER':
      return (progress.doorsOpenedCount ?? 0) >= 3;
    case 'GHOST_STEP':
      return noAlerts.length >= 1;
    case 'SPEED_DEMON':
      return [1, 2, 3, 4, 5].some((lvl) => {
        const t = getBestTime(
          progress.bestCompletionTimes as unknown as Map<string, number> | Record<string, number>,
          lvl
        );
        return typeof t === 'number' && t > 0 && t <= GOLD_MEDAL_THRESHOLDS[lvl];
      });
    case 'COMPLETIONIST':
      return allFiveCleared && fragments.length >= VALID_FRAGMENT_IDS.size;
  }
}

export async function syncEligibleAchievements(
  userId: string | Types.ObjectId,
  progress: IGameProgress
): Promise<AchievementId[]> {
  const newlyUnlocked: AchievementId[] = [];
  const existing = await Achievement.find({ userId }).select('achievementId').lean();
  const existingSet = new Set(existing.map((a) => a.achievementId));

  for (const id of Object.keys(ACHIEVEMENT_CATALOG) as AchievementId[]) {
    if (!existingSet.has(id) && evaluateAchievementEligibility(id, progress)) {
      await Achievement.updateOne(
        { userId, achievementId: id },
        { $setOnInsert: { userId, achievementId: id, unlockedAt: new Date() } },
        { upsert: true }
      );
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

export function serializeProgress(progress: IGameProgress) {
  const timesObj: Record<string, number> = {};
  if (progress.bestCompletionTimes instanceof Map) {
    progress.bestCompletionTimes.forEach((v, k) => {
      timesObj[k] = v;
    });
  }
  return {
    currentLevel: progress.currentLevel,
    completedLevels: progress.completedLevels,
    collectedFragments: progress.collectedFragments,
    totalScore: progress.totalScore,
    totalPlaytime: progress.totalPlaytime,
    bestCompletionTimes: timesObj,
    checkpoint: progress.checkpoint as ICheckpoint | null,
    pulsesEmitted: progress.pulsesEmitted,
    secretsDiscovered: progress.secretsDiscovered,
    doorsOpenedCount: progress.doorsOpenedCount ?? 0,
    noAlertCompletedLevels: progress.noAlertCompletedLevels ?? [],
    updatedAt: progress.updatedAt,
  };
}
