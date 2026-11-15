import * as THREE from 'three';
import {
  BossWardenDef,
  CheckpointDef,
  ColorblindMode,
  FragmentDef,
  GlyphPadDef,
  HazardDef,
  HudSnapshot,
  MechanismDef,
  MirrorCrystalDef,
  PlatformDef,
  QualityPreset,
  ResonanceColor,
  ResonanceDoorDef,
  StatueDef,
  TrialDifficulty,
} from './types';
import { RevealableEntity } from './echoPulse3d';

export const HINT_COOLDOWN_SECONDS = 60;
export const STUCK_OFFER_SECONDS = 45;

export const GRAVITY = 24.0;
export const JUMP_VELOCITY = 10.6;
export const WALK_SPEED = 6.8;
export const SPRINT_SPEED = 9.8;
export const CROUCH_SPEED = 4.2;
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.75;
export const CHARGE_HOLD_MAX = 1.5;

export const RESONANCE_HEX: Record<ResonanceColor, number> = {
  cyan: 0x43e8ff,
  violet: 0x9b7bff,
  amber: 0xffc857,
};

export const COLORBLIND_SONAR: Record<ColorblindMode, { primary: number; charged: number }> = {
  none: { primary: 0x43e8ff, charged: 0x9b7bff },
  deuteranopia: { primary: 0x33bbee, charged: 0xee7733 },
  protanopia: { primary: 0x44bbff, charged: 0xffaa00 },
  tritanopia: { primary: 0x00d4aa, charged: 0xff6688 },
};

export interface RuntimePlatform {
  def: PlatformDef;
  mesh: THREE.Mesh;
  outline: THREE.LineSegments;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  delta: THREE.Vector3;
  revealEntity: RevealableEntity;
  crumbleState: 'solid' | 'shaking' | 'fallen';
  crumbleTimer: number;
}

export interface RuntimeHazard {
  def: HazardDef;
  group: THREE.Group;
  pos: THREE.Vector3;
  revealEntity: RevealableEntity;
  patrolPos: THREE.Vector3;
  alertTimer: number;
  investigateTarget: THREE.Vector3;
  droneMat?: THREE.MeshStandardMaterial;
}

export interface RuntimeGlyphPad {
  def: GlyphPadDef;
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  activated: boolean;
}

export interface RuntimeResonanceDoor {
  def: ResonanceDoorDef;
  mesh: THREE.Mesh;
  open: boolean;
  openProgress: number;
}

export interface RuntimeMirrorCrystal {
  def: MirrorCrystalDef;
  group: THREE.Group;
  crystal: THREE.Mesh;
  beamMesh: THREE.Mesh;
  beamDir: THREE.Vector3;
  beamTimer: number;
  beamCharged: boolean;
  beamHitWarden: boolean;
}

export interface RuntimeBossWarden {
  def: BossWardenDef;
  group: THREE.Group;
  pos: THREE.Vector3;
  coreMat: THREE.MeshStandardMaterial;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  stuns: number;
  maxStuns: number;
  stunTimer: number;
  alertTimer: number;
  frozenByCrouch: boolean;
  investigateTarget: THREE.Vector3;
  defeated: boolean;
  defeatAnim: number;
}

export interface RuntimeFragment {
  def: FragmentDef;
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  collected: boolean;
}

export interface RuntimeMechanism {
  def: MechanismDef;
  group: THREE.Group;
  orb: THREE.Mesh;
  light: THREE.PointLight;
  activated: boolean;
}

export interface RuntimeCheckpoint {
  def: CheckpointDef;
  group: THREE.Group;
  crystal: THREE.Mesh;
  activated: boolean;
}

export interface RuntimeExit {
  group: THREE.Group;
  portalMesh: THREE.Mesh;
  light: THREE.PointLight;
  unlocked: boolean;
  pos: THREE.Vector3;
  required: number;
}

export interface RuntimeLevelEntities {
  platforms: RuntimePlatform[];
  hazards: RuntimeHazard[];
  glyphPads: RuntimeGlyphPad[];
  resonanceDoors: RuntimeResonanceDoor[];
  mirrorCrystals: RuntimeMirrorCrystal[];
  fragments: RuntimeFragment[];
  mechanisms: RuntimeMechanism[];
  checkpoints: RuntimeCheckpoint[];
  statues: StatueDef[];
  revealables: RevealableEntity[];
  exitObj: RuntimeExit | null;
  bossWarden: RuntimeBossWarden | null;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onCheckpointSave: (payload: {
    level: number;
    checkpoint: { level: number; x: number; y: number; z: number };
    collectedFragments: string[];
    pulsesDelta: number;
    secretsDiscovered: number[];
    doorsOpenedDelta: number;
  }) => void;
  onLevelCompleted: (payload: {
    level: number;
    completionTimeSeconds: number;
    collectedFragments: string[];
    pulsesDelta: number;
    secretsDiscovered: number[];
    doorsOpenedDelta: number;
    noAlertClear: boolean;
    hintsUsed: number;
    ghostData?: string;
  }) => void;
  onTrialCompleted?: (payload: {
    seed: number;
    difficulty: TrialDifficulty;
    isDaily: boolean;
    completionTimeSeconds: number;
    fragmentsCollected: number;
    pulsesUsed: number;
    shareCode: string;
  }) => void;
  onTutorialCompleted?: () => void;
  onQualityAutoDowngrade?: (nextQuality: QualityPreset) => void;
}
