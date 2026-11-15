import { GameSettings, GhostReplayRecord, ProgressData } from '../game/types';
import { loadLocalBestGhost, saveLocalBestGhostIfFaster } from '../game/ghostReplay';
import { apiRequest, getStoredToken } from './api';

const GUEST_PROGRESS_KEY = 'echoes3d_guest_progress_v1';
const SETTINGS_KEY = 'echoes3d_settings_v1';

export const DEFAULT_PROGRESS: ProgressData = {
  currentLevel: 1,
  completedLevels: [],
  collectedFragments: [],
  totalScore: 0,
  totalPlaytime: 0,
  bestCompletionTimes: {},
  checkpoint: null,
  pulsesEmitted: 0,
  secretsDiscovered: [],
  doorsOpenedCount: 0,
  noAlertCompletedLevels: [],
};

export const DEFAULT_KEY_BINDINGS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  pulse: 'KeyE',
  interact: 'KeyF',
  crouch: 'KeyC',
  hint: 'KeyH',
  restart: 'KeyR',
  photo: 'KeyP',
} as const;

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code.startsWith('Arrow')) return code.slice(5);
  return code;
}

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  masterVolume: 0.75,
  musicVolume: 0.65,
  sfxVolume: 0.85,
  mouseSensitivity: 1.0,
  reducedShake: false,
  quality: 'HIGH',
  touchControls:
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches),
  aiNarration: true,
  narrationVoice: false,
  narrationVoiceName: '',
  narrationRate: 1.0,
  narrationLanguage: 'en',
  adaptiveAssist: true,
  showGhost: true,
  speedrunMode: false,
  colorblindMode: 'none',
  highContrastSonar: false,
  hudScale: 1.0,
  soundSubtitles: true,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
  tutorialCompleted: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      const lang =
        parsed.narrationLanguage === 'bn' || parsed.narrationLanguage === 'zh'
          ? parsed.narrationLanguage
          : 'en';
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        narrationLanguage: lang,
        narrationRate:
          typeof parsed.narrationRate === 'number'
            ? Math.min(1.5, Math.max(0.7, parsed.narrationRate))
            : DEFAULT_SETTINGS.narrationRate,
        hudScale:
          typeof parsed.hudScale === 'number'
            ? Math.min(1.4, Math.max(0.8, parsed.hudScale))
            : DEFAULT_SETTINGS.hudScale,
        keyBindings: {
          ...DEFAULT_KEY_BINDINGS,
          ...(parsed.keyBindings ?? {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadGuestProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (raw) {
      return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PROGRESS };
}

export function saveGuestProgress(progress: ProgressData): void {
  try {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
  } catch {
    // ignore
  }
}

export function hasSubstantialGuestProgress(p: ProgressData): boolean {
  return (
    p.completedLevels.length > 0 ||
    p.collectedFragments.length > 0 ||
    p.pulsesEmitted > 0 ||
    p.checkpoint !== null
  );
}

export async function syncCheckpointToServer(payload: {
  level: number;
  checkpoint: { level: number; x: number; y: number; z: number } | null;
  collectedFragments: string[];
  pulsesDelta: number;
  secretsDiscovered: number[];
  doorsOpenedDelta?: number;
}): Promise<{ progress: ProgressData; newlyUnlockedAchievements: string[] }> {
  if (!getStoredToken()) {
    throw new Error('No auth token');
  }
  return apiRequest('/api/progress/save', {
    method: 'POST',
    body: JSON.stringify({
      currentLevel: payload.level,
      checkpoint: payload.checkpoint,
      collectedFragments: payload.collectedFragments,
      pulsesEmittedDelta: payload.pulsesDelta,
      secretsDiscovered: payload.secretsDiscovered,
      doorsOpenedDelta: payload.doorsOpenedDelta ?? 0,
    }),
  });
}

export async function submitLevelCompleteToServer(payload: {
  level: number;
  completionTimeSeconds: number;
  collectedFragments: string[];
  pulsesDelta: number;
  secretsDiscovered: number[];
  doorsOpenedDelta?: number;
  noAlertClear?: boolean;
  hintsUsed?: number;
}): Promise<{ progress: ProgressData; newlyUnlockedAchievements: string[] }> {
  if (!getStoredToken()) {
    throw new Error('No auth token');
  }
  return apiRequest('/api/progress/complete-level', {
    method: 'POST',
    body: JSON.stringify({
      level: payload.level,
      completionTimeSeconds: payload.completionTimeSeconds,
      collectedFragments: payload.collectedFragments,
      pulsesEmittedDelta: payload.pulsesDelta,
      secretsDiscovered: payload.secretsDiscovered,
      doorsOpenedDelta: payload.doorsOpenedDelta ?? 0,
      noAlertClear: Boolean(payload.noAlertClear),
      hintsUsedDelta: payload.hintsUsed ?? 0,
    }),
  });
}

export async function migrateGuestProgressToAccount(
  guest: ProgressData
): Promise<{ progress: ProgressData; newlyUnlockedAchievements: string[] }> {
  // 1. Merge overall fragments, completed levels, pulses, secrets
  const merged = await apiRequest<{ progress: ProgressData; newlyUnlockedAchievements: string[] }>(
    '/api/progress/save',
    {
      method: 'POST',
      body: JSON.stringify({
        currentLevel: guest.currentLevel,
        completedLevels: guest.completedLevels,
        collectedFragments: guest.collectedFragments,
        totalPlaytimeDelta: guest.totalPlaytime,
        pulsesEmittedDelta: guest.pulsesEmitted,
        secretsDiscovered: guest.secretsDiscovered,
        doorsOpenedDelta: guest.doorsOpenedCount ?? 0,
        noAlertCompletedLevels: guest.noAlertCompletedLevels ?? [],
        checkpoint: guest.checkpoint,
        mergeMode: true,
      }),
    }
  );
  return merged;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  totalScore: number;
  fragmentsCount: number;
  completedCount: number;
  bestTotalTime: number | null;
  shareCode?: string;
}

export async function fetchLeaderboard(
  category: 'score' | 'time' | 'fragments' | 'daily'
): Promise<{ offline: boolean; entries: LeaderboardEntry[]; dateUtc?: string }> {
  return apiRequest(`/api/leaderboard?category=${category}`, {}, false);
}

export async function submitTrialComplete(payload: {
  seed: number;
  difficulty: 'Novice' | 'Explorer' | 'Expert';
  isDaily: boolean;
  completionTimeSeconds: number;
  fragmentsCollected: number;
  pulsesUsed: number;
}): Promise<{ saved: boolean; offline?: boolean; score: number; shareCode: string }> {
  const mult = payload.difficulty === 'Expert' ? 1.5 : payload.difficulty === 'Explorer' ? 1.2 : 1.0;
  const localScore = Math.round(
    (1500 +
      payload.fragmentsCollected * 250 +
      Math.max(0, Math.round(500 - Math.min(500, payload.completionTimeSeconds)))) *
      mult
  );
  try {
    return await apiRequest(
      '/api/trial/complete',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      Boolean(getStoredToken())
    );
  } catch {
    return {
      saved: false,
      offline: true,
      score: localScore,
      shareCode: '',
    };
  }
}

export async function submitGhostReplay(record: GhostReplayRecord): Promise<void> {
  saveLocalBestGhostIfFaster(record);
  if (!getStoredToken()) return;
  try {
    await apiRequest('/api/progress/ghost', {
      method: 'POST',
      body: JSON.stringify({
        levelNumber: record.levelNumber,
        timeSeconds: record.timeSeconds,
        data: record.data,
      }),
    });
  } catch {
    // Local PB ghost still saved cleanly
  }
}

export async function fetchBestGhostForLevel(
  levelNumber: number
): Promise<GhostReplayRecord | null> {
  const local = loadLocalBestGhost(levelNumber);
  try {
    const res = await apiRequest<{ offline: boolean; ghost: GhostReplayRecord | null }>(
      `/api/leaderboard/ghost?level=${levelNumber}`,
      {},
      false
    );
    if (res.ghost && (!local || res.ghost.timeSeconds <= local.timeSeconds)) {
      return res.ghost;
    }
  } catch {
    // Fall back to local PB ghost
  }
  return local;
}

export interface WorldStats {
  offline: boolean;
  totalExplorers: number;
  totalFragmentsCollected: number;
  totalCampaignClears: number;
  totalTrialRuns: number;
  totalPulsesEmitted: number;
}

export async function fetchWorldStats(): Promise<WorldStats> {
  return apiRequest<WorldStats>('/api/stats', {}, false);
}

export async function checkApiHealth(): Promise<{ status: string; database: 'connected' | 'disconnected' }> {
  return apiRequest('/api/health', {}, false);
}
