import {
  CheckpointSplit,
  DebugStats,
  GameState,
  HudSnapshot,
  Level3DDefinition,
  MedalTier,
} from './types';
import { CHARGE_HOLD_MAX, HINT_COOLDOWN_SECONDS, RuntimeLevelEntities } from './engineTypes';

export function buildHudSnapshot(params: {
  gameState: GameState;
  currentLevel: Level3DDefinition;
  entities: RuntimeLevelEntities;
  persistentFragmentsCount: number;
  echoEnergy: number;
  sonarCooldownRatio: number;
  sonarReady: boolean;
  isChargingPulse: boolean;
  chargeHoldTime: number;
  isCrouching: boolean;
  soundAlertCount: number;
  doorsOpenedThisLevel: number;
  checkpointReached: boolean;
  levelElapsed: number;
  pulsesThisLevel: number;
  hintsUsed: number;
  hintCooldown: number;
  hintAutoPrompt: boolean;
  hintLoading: boolean;
  interactPrompt: string | null;
  loreMessage: string | null;
  loreSource: 'gemini' | 'fallback' | null;
  pointerLocked: boolean;
  isOffline: boolean;
  webglError: string | null;
  lastCompletedLevelTime: number | null;
  lastMedal: MedalTier;
  lastServerScore: number | null;
  newlyUnlockedAchievements: string[];
  lastTrialScore: number | null;
  ghostDeltaSeconds: number | null;
  activeGhostOwner: string | null;
  activeGhostTargetTime: number | null;
  checkpointSplits: CheckpointSplit[];
  soundSubtitle: string | null;
  gamepadActive: boolean;
  photoMode: boolean;
  tutorialStep: number | null;
  debugStats: DebugStats | null;
  performanceToast: string | null;
  engineReady: boolean;
  judgeMode: boolean;
  flythroughTimer: number;
  adaptiveAssistActive: boolean;
  deathsInSection: number;
  wardenActive: boolean;
  wardenStuns: number;
  wardenMaxStuns: number;
  wardenStunned: boolean;
}): HudSnapshot {
  const levelCollected = params.entities.fragments.filter((f) => f.collected).length;
  const mechActivated = params.entities.mechanisms.filter((m) => m.activated).length;

  return {
    gameState: params.gameState,
    levelNumber: params.currentLevel.levelNumber,
    levelName: params.currentLevel.name,
    levelSubtitle: params.currentLevel.subtitle,
    objective: params.currentLevel.objective,
    echoEnergy: Math.round(params.echoEnergy),
    sonarCooldownRatio: params.sonarCooldownRatio,
    sonarReady: params.sonarReady,
    chargeRatio: params.isChargingPulse
      ? Math.min(1, params.chargeHoldTime / CHARGE_HOLD_MAX)
      : 0,
    isCrouching: params.isCrouching,
    soundAlertCount: params.soundAlertCount,
    doorsOpenedThisLevel: params.doorsOpenedThisLevel,
    levelFragmentsCollected: levelCollected,
    levelFragmentsTotal: params.entities.fragments.length,
    totalFragmentsCollected: params.persistentFragmentsCount,
    mechanismsActivated: mechActivated,
    mechanismsRequired: params.entities.exitObj ? params.entities.exitObj.required : 0,
    checkpointReached: params.checkpointReached,
    elapsedSeconds: params.levelElapsed,
    pulsesThisLevel: params.pulsesThisLevel,
    hintsUsed: params.hintsUsed,
    hintCooldownRatio: Math.min(1, Math.max(0, params.hintCooldown / HINT_COOLDOWN_SECONDS)),
    hintAutoPrompt: params.hintAutoPrompt,
    hintLoading: params.hintLoading,
    interactPrompt: params.interactPrompt,
    loreMessage: params.loreMessage,
    loreSource: params.loreSource,
    pointerLocked: params.pointerLocked,
    isOffline: params.isOffline,
    webglError: params.webglError,
    lastCompletedLevelTime: params.lastCompletedLevelTime,
    lastMedal: params.lastMedal,
    lastServerScore: params.lastServerScore,
    newlyUnlockedAchievements: params.newlyUnlockedAchievements,
    isTrial: Boolean(params.currentLevel.isTrial),
    trialMeta: params.currentLevel.trialMeta ?? null,
    lastTrialScore: params.lastTrialScore,
    ghostDeltaSeconds: params.ghostDeltaSeconds,
    ghostOwnerName: params.activeGhostOwner,
    ghostTargetTime: params.activeGhostTargetTime,
    checkpointSplits: [...params.checkpointSplits],
    soundSubtitle: params.soundSubtitle,
    gamepadActive: params.gamepadActive,
    photoMode: params.photoMode,
    tutorialStep: params.tutorialStep,
    debugStats: params.debugStats,
    performanceToast: params.performanceToast,
    engineReady: params.engineReady,
    judgeMode: params.judgeMode,
    showcaseFlythroughRemaining:
      params.flythroughTimer > 0 ? Math.ceil(params.flythroughTimer) : null,
    adaptiveAssistActive: params.adaptiveAssistActive,
    deathsInSection: params.deathsInSection,
    wardenActive: params.wardenActive,
    wardenStuns: params.wardenStuns,
    wardenMaxStuns: params.wardenMaxStuns,
    wardenStunned: params.wardenStunned,
  };
}
