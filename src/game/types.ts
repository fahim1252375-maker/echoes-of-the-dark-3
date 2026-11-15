export type GameState =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'VICTORY';

export type NarrationLanguage = 'en' | 'bn' | 'zh';

export type ModalView =
  | 'NONE'
  | 'SIGN_IN'
  | 'REGISTER'
  | 'DASHBOARD'
  | 'HOW_TO_PLAY'
  | 'SETTINGS'
  | 'LEADERBOARD'
  | 'ABOUT'
  | 'CONTROLS'
  | 'MIGRATE_PROMPT'
  | 'ECHO_TRIALS'
  | 'CODEX';

export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH';

export type AvatarId = 'cyan-seeker' | 'violet-warden' | 'amber-echo' | 'crimson-scout';

export type ResonanceColor = 'cyan' | 'violet' | 'amber';

export type MedalTier = 'gold' | 'silver' | 'bronze' | null;

export type ColorblindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export type KeyBindAction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'jump'
  | 'pulse'
  | 'interact'
  | 'crouch'
  | 'hint'
  | 'restart'
  | 'photo';

export interface DebugStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  entities: number;
  quality: QualityPreset;
  memoryMb: number | null;
}

export type TrialDifficulty = 'Novice' | 'Explorer' | 'Expert';

export type TrialRoomKind =
  | 'bridge'
  | 'glyph_gate'
  | 'mirror_vault'
  | 'drone_hall'
  | 'crumble_span'
  | 'seal_shrine';

export interface TrialRoomBlueprint {
  kind: TrialRoomKind;
  elevationDelta: number;
  hasFragment: boolean;
}

export interface TrialBlueprint {
  title: string;
  themeColor: ResonanceColor;
  ambientPrompt: string;
  rooms: TrialRoomBlueprint[];
}

export interface TrialModeMeta {
  seed: number;
  difficulty: TrialDifficulty;
  shareCode: string;
  isDaily: boolean;
  dateUtc?: string;
  blueprintSource: 'gemini' | 'procedural';
  title: string;
  ambientWhisper: string;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  kind: 'solid' | 'hidden' | 'secret' | 'moving' | 'crumbling';
  moveAxis?: 'x' | 'y' | 'z';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface HazardDef {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  kind: 'spikes' | 'drone';
  moveAxis?: 'x' | 'y' | 'z';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  soundSensitive?: boolean;
}

export interface GlyphPadDef {
  id: string;
  x: number;
  y: number;
  z: number;
  color: ResonanceColor;
  doorId: string;
}

export interface ResonanceDoorDef {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: ResonanceColor;
}

export interface MirrorCrystalDef {
  id: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  length: number;
}

export interface BossWardenDef {
  id: string;
  x: number;
  y: number;
  z: number;
  patrolRadius: number;
  arenaCenterX: number;
  arenaCenterZ: number;
  arenaHalfWidth: number;
  arenaHalfDepth: number;
  maxStuns: number;
}

export interface FragmentDef {
  id: string;
  x: number;
  y: number;
  z: number;
  isSecret?: boolean;
}

export interface MechanismDef {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface StatueDef {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  inscription: string;
}

export interface WaterfallDef {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotY?: number;
}

export interface MedalThresholds {
  gold: number;
  silver: number;
  bronze: number;
}

export interface Level3DDefinition {
  levelNumber: 1 | 2 | 3 | 4 | 5;
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  objective: string;
  spawn: Vec3;
  ambientColor: number;
  fogDensity: number;
  platforms: PlatformDef[];
  hazards: HazardDef[];
  fragments: FragmentDef[];
  mechanisms: MechanismDef[];
  checkpoints: CheckpointDef[];
  statues: StatueDef[];
  waterfalls: WaterfallDef[];
  glyphPads?: GlyphPadDef[];
  resonanceDoors?: ResonanceDoorDef[];
  mirrorCrystals?: MirrorCrystalDef[];
  bossWarden?: BossWardenDef;
  medalThresholds?: MedalThresholds;
  exit: {
    x: number;
    y: number;
    z: number;
    requiredMechanisms: number;
  };
  secretZoneCenter?: Vec3;
  isTrial?: boolean;
  trialMeta?: TrialModeMeta;
}

export interface GhostFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pulsed: boolean;
  crouching: boolean;
}

export interface GhostReplayRecord {
  levelNumber: number;
  username: string;
  timeSeconds: number;
  data: string;
}

export interface CheckpointSplit {
  label: string;
  time: number;
  delta: number | null;
}

export interface GameSettings {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  reducedShake: boolean;
  quality: QualityPreset;
  touchControls: boolean;
  aiNarration: boolean;
  narrationVoice: boolean;
  narrationVoiceName: string;
  narrationRate: number;
  narrationLanguage: NarrationLanguage;
  adaptiveAssist: boolean;
  showGhost: boolean;
  speedrunMode: boolean;
  colorblindMode: ColorblindMode;
  highContrastSonar: boolean;
  hudScale: number;
  soundSubtitles: boolean;
  keyBindings: Record<KeyBindAction, string>;
  tutorialCompleted: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: AvatarId;
  createdAt?: string;
}

export interface ProgressData {
  currentLevel: number;
  completedLevels: number[];
  collectedFragments: string[];
  totalScore: number;
  totalPlaytime: number;
  bestCompletionTimes: Record<string, number>;
  checkpoint: { level: number; x: number; y: number; z: number } | null;
  pulsesEmitted: number;
  secretsDiscovered: number[];
  doorsOpenedCount?: number;
  noAlertCompletedLevels?: number[];
  updatedAt?: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface HudSnapshot {
  gameState: GameState;
  levelNumber: 1 | 2 | 3 | 4 | 5;
  levelName: string;
  levelSubtitle: string;
  objective: string;
  echoEnergy: number; // 0..100
  sonarCooldownRatio: number; // 0 = ready, 1 = cooling down
  sonarReady: boolean;
  chargeRatio: number; // 0..1 while holding [E]
  isCrouching: boolean;
  soundAlertCount: number;
  doorsOpenedThisLevel: number;
  levelFragmentsCollected: number;
  levelFragmentsTotal: number;
  totalFragmentsCollected: number;
  mechanismsActivated: number;
  mechanismsRequired: number;
  checkpointReached: boolean;
  elapsedSeconds: number;
  pulsesThisLevel: number;
  hintsUsed: number;
  hintCooldownRatio: number; // 0 = ready, 1 = cooling down
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
  isTrial: boolean;
  trialMeta: TrialModeMeta | null;
  lastTrialScore: number | null;
  ghostDeltaSeconds: number | null;
  ghostOwnerName: string | null;
  ghostTargetTime: number | null;
  checkpointSplits: CheckpointSplit[];
  soundSubtitle: string | null;
  gamepadActive: boolean;
  photoMode: boolean;
  tutorialStep: number | null;
  debugStats: DebugStats | null;
  performanceToast: string | null;
  engineReady: boolean;
  judgeMode: boolean;
  showcaseFlythroughRemaining: number | null;
  adaptiveAssistActive: boolean;
  deathsInSection: number;
  wardenActive: boolean;
  wardenStuns: number;
  wardenMaxStuns: number;
  wardenStunned: boolean;
}
