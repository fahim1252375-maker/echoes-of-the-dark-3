import * as THREE from 'three';
import {
  CheckpointSplit,
  DebugStats,
  GameSettings,
  GameState,
  GhostFrame,
  GhostReplayRecord,
  HudSnapshot,
  Level3DDefinition,
  MedalTier,
  QualityPreset,
} from './types';
import { LEVELS_3D } from './levels3d';
import { computeLevelMedal } from './levelValidator';
import { formatKeyCode } from '../services/progress';
import {
  decodeGhostFrames,
  encodeGhostFrames,
  GHOST_MAX_FRAMES,
  GHOST_SAMPLE_DT,
} from './ghostReplay';
import { Audio3DEngine } from './audio3d';
import {
  createContactShadowTexture,
  createStoneTexture,
  detectSoftwareWebGL,
} from './materials';
import { EnvironmentRig, initSceneLightingAndIBL } from './environment';
import { animateExplorer, createExplorerModel, ExplorerRig } from './player3d';
import { EchoPulse3DSystem } from './echoPulse3d';
import { ThirdPersonCameraController } from './camera3d';
import { fetchAiHint, fetchAiLore, LoreTrigger } from '../services/ai';
import {
  CHARGE_HOLD_MAX,
  COLORBLIND_SONAR,
  EngineCallbacks,
  HINT_COOLDOWN_SECONDS,
  RuntimeLevelEntities,
  RuntimePlatform,
  STUCK_OFFER_SECONDS,
} from './engineTypes';
import { EngineInputController, GamepadPollResult } from './inputController';
import { buildLevelScene, disposeLevelObjects } from './levelLoader';
import {
  animateLevelProps,
  emitSoundNoise,
  updateBossWarden,
  updateMirrorCrystals,
  updateMovingPlatformsAndDrones,
  updateResonanceDoors,
} from './entityUpdater';
import { PhysicsStepState, stepPlayerPhysics } from './collision';
import { buildHudSnapshot } from './hudState';

export type { EngineCallbacks };

const _playerCenter = new THREE.Vector3();

function createEmptyEntities(): RuntimeLevelEntities {
  return {
    platforms: [],
    hazards: [],
    glyphPads: [],
    resonanceDoors: [],
    mirrorCrystals: [],
    fragments: [],
    mechanisms: [],
    checkpoints: [],
    statues: [],
    revealables: [],
    exitObj: null,
    bossWarden: null,
  };
}

export class Game3DEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;

  private audio: Audio3DEngine;
  private input: EngineInputController;
  private sonar!: EchoPulse3DSystem;
  private camCtrl!: ThirdPersonCameraController;
  private explorer!: ExplorerRig;
  private envRig: EnvironmentRig | null = null;
  private lights!: {
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    rimLight: THREE.DirectionalLight;
  };
  private stoneTex!: THREE.CanvasTexture;
  private shadowTex!: THREE.CanvasTexture;

  private levelGroup = new THREE.Group();
  private currentLevel: Level3DDefinition = LEVELS_3D[0];
  private entities: RuntimeLevelEntities = createEmptyEntities();

  private gameState: GameState = 'MENU';
  private settings: GameSettings;
  private callbacks: EngineCallbacks;

  // Player physics state
  private phys: PhysicsStepState = {
    playerPos: new THREE.Vector3(0, 0.1, 14),
    playerVel: new THREE.Vector3(0, 0, 0),
    playerFacingYaw: Math.PI,
    onGround: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    standingPlatform: null,
    footstepTimer: 0,
    isCrouching: false,
  };
  private respawnPos = new THREE.Vector3(0, 0.1, 14);
  private checkpointReached = false;
  private respawnAnim = 0;
  private interactAnim = 0;
  private echoEnergy = 100;
  private chargeHoldTime = 0;
  private isChargingPulse = false;

  // Run stats & progress tracking
  private persistentFragments = new Set<string>();
  private persistentSecrets = new Set<number>();
  private levelElapsed = 0;
  private pulsesThisLevel = 0;
  private unsyncedPulses = 0;
  private doorsOpenedThisLevel = 0;
  private unsyncedDoorsOpened = 0;
  private soundAlertCount = 0;
  private menuPulseTimer = 0.8;
  private worldTime = 0;
  private hudSyncTimer = 0;
  private interactPrompt: string | null = null;
  private loreMessage: string | null = null;
  private loreSource: 'gemini' | 'fallback' | null = null;
  private loreTimer = 0;
  private loreRequestSeq = 0;
  private deathsThisLevel = 0;
  private deathsInSection = 0;
  private adaptiveAssistActive = false;
  private hintsUsed = 0;
  private hintCooldown = 0;
  private stuckTimer = 0;
  private hintAutoPrompt = false;
  private hintLoading = false;
  private isOffline = false;
  private webglError: string | null = null;
  private lastCompletedLevelTime: number | null = null;
  private lastMedal: MedalTier = null;
  private lastServerScore: number | null = null;
  private lastTrialScore: number | null = null;
  private newlyUnlockedAchievements: string[] = [];

  // Ghost replay & Speedrun tracking
  private ghostRecordedFrames: GhostFrame[] = [];
  private ghostSampleAccum = 0;
  private ghostPulsedSinceSample = false;
  private activeGhostFrames: GhostFrame[] = [];
  private activeGhostOwner: string | null = null;
  private activeGhostTargetTime: number | null = null;
  private ghostRig: ExplorerRig | null = null;
  private ghostLastPulseFrame = -1;
  private ghostDeltaSeconds: number | null = null;
  private checkpointSplits: CheckpointSplit[] = [];

  // Accessibility, UX, Photo Mode & Performance state
  private soundSubtitle: string | null = null;
  private soundSubtitleTimer = 0;
  private photoMode = false;
  private tutorialStep: number | null = null;
  private showDebugOverlay = false;
  private debugStats: DebugStats | null = null;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private lowFpsStreak = 0;
  private autoDowngraded = false;
  private performanceToast: string | null = null;
  private performanceToastTimer = 0;
  private adaptiveAudioTimer = 0;
  private engineReady = false;
  private judgeMode = false;
  private flythroughTimer = 0;
  private flythroughPulseTimer = 0;
  private flythroughFocus = new THREE.Vector3(0, 1, -10);

  // Loop & lifecycle
  private frameId = 0;
  private isDestroyed = false;
  private lastNow = performance.now();

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.settings = { ...initialSettings, keyBindings: { ...initialSettings.keyBindings } };
    this.callbacks = callbacks;
    this.audio = new Audio3DEngine(this.settings);
    this.input = new EngineInputController(
      () => this.settings,
      () => this.gameState,
      this.audio
    );

    this.initThree();
    window.addEventListener('resize', this.handleResize);
    this.loadLevel(1, false);
    this.engineReady = true;
    this.emitHud();
    this.startLoop();
  }

  private initThree(): void {
    this.isSoftwareGl = detectSoftwareWebGL();
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl && this.settings.quality !== 'LOW',
        powerPreference: 'high-performance',
      });
    } catch {
      this.webglError = 'WebGL is unavailable in this browser context.';
      this.emitHud();
      return;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.applyQualityToRenderer();

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.add(this.levelGroup);

    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 180);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.stoneTex = createStoneTexture(maxAniso);
    this.shadowTex = createContactShadowTexture();

    this.lights = initSceneLightingAndIBL(this.scene, this.renderer, this.isSoftwareGl);
    this.sonar = new EchoPulse3DSystem(this.scene);
    this.applyAccessibilityPalette();
    this.explorer = createExplorerModel(this.shadowTex);
    this.scene.add(this.explorer.root);

    this.camCtrl = new ThirdPersonCameraController(
      this.renderer.domElement,
      () => this.gameState === 'PLAYING',
      () => this.emitHud()
    );
    this.camCtrl.setSensitivity(this.settings.mouseSensitivity);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.webglError = 'WebGL rendering context was lost. Restoring...';
      this.emitHud();
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.webglError = null;
      this.emitHud();
    });
  }

  private applyQualityToRenderer(): void {
    if (!this.renderer) return;
    const q: QualityPreset = this.settings.quality;
    const dprCap = q === 'LOW' ? 1 : q === 'MEDIUM' ? 1.5 : 2;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, dprCap)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && q !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applyQualityToRenderer();
  };

  private applyAccessibilityPalette(): void {
    const pal = COLORBLIND_SONAR[this.settings.colorblindMode] ?? COLORBLIND_SONAR.none;
    this.sonar?.setPalette(pal.primary, pal.charged, this.settings.highContrastSonar);
  }

  private isAdaptiveAssistEligible(): boolean {
    return (
      this.settings.adaptiveAssist &&
      !this.settings.speedrunMode &&
      !this.currentLevel.trialMeta?.isDaily
    );
  }

  public setVirtualInput(opts: {
    moveX?: number;
    moveY?: number;
    jump?: boolean;
    pulse?: boolean;
    interact?: boolean;
  }): void {
    this.input.setVirtualInput(opts);
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next, keyBindings: { ...next.keyBindings } };
    this.audio.applySettings(this.settings);
    this.camCtrl?.setSensitivity(this.settings.mouseSensitivity);
    this.applyQualityToRenderer();
    this.applyAccessibilityPalette();
    if (!this.isAdaptiveAssistEligible()) {
      this.adaptiveAssistActive = false;
    } else if (this.deathsInSection >= 3) {
      this.adaptiveAssistActive = true;
    }
    if (this.ghostRig) {
      this.ghostRig.root.visible = this.settings.showGhost && this.gameState === 'PLAYING';
    }
    if (this.settings.tutorialCompleted) {
      this.tutorialStep = null;
    }
    this.emitHud();
  }

  public skipTutorial(): void {
    this.tutorialStep = null;
    this.settings.tutorialCompleted = true;
    this.callbacks.onTutorialCompleted?.();
    this.emitHud();
  }

  public togglePhotoMode(forceState?: boolean): void {
    if (this.gameState !== 'PLAYING') return;
    const next = forceState !== undefined ? forceState : !this.photoMode;
    this.photoMode = next;
    if (next) {
      this.camCtrl?.releasePointerLock();
      this.input.clearHeld();
      this.isChargingPulse = false;
      this.chargeHoldTime = 0;
    }
    this.emitHud();
  }

  public async capturePhotoBlob(): Promise<Blob | null> {
    if (!this.renderer || !this.scene || !this.camera) return null;
    this.renderer.render(this.scene, this.camera);
    const glCanvas = this.renderer.domElement;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = glCanvas.width;
    outCanvas.height = glCanvas.height;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(glCanvas, 0, 0);

    const pad = Math.max(16, Math.round(outCanvas.width * 0.02));
    const titleSize = Math.max(14, Math.round(outCanvas.width * 0.014));
    ctx.font = `600 ${titleSize}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(7, 11, 22, 0.65)';
    const label = this.currentLevel.isTrial
      ? `ECHOES OF THE DARK · ${this.currentLevel.trialMeta?.shareCode ?? 'Trial'}`
      : `ECHOES OF THE DARK · Chamber 0${this.currentLevel.levelNumber}: ${this.currentLevel.name}`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(
      outCanvas.width - pad - textWidth - 18,
      outCanvas.height - pad - titleSize - 12,
      textWidth + 24,
      titleSize + 18
    );
    ctx.fillStyle = '#43E8FF';
    ctx.fillText(label, outCanvas.width - pad - 6, outCanvas.height - pad - 6);

    return new Promise((resolve) => outCanvas.toBlob((b) => resolve(b), 'image/png'));
  }

  public syncExternalProgress(
    collectedFragments: string[],
    secretsDiscovered: number[],
    isOffline: boolean
  ): void {
    this.persistentFragments = new Set(collectedFragments);
    this.persistentSecrets = new Set(secretsDiscovered);
    this.isOffline = isOffline;
    for (const f of this.entities.fragments) {
      if (this.persistentFragments.has(f.def.id)) {
        f.collected = true;
        f.mesh.visible = false;
        f.light.visible = false;
      }
    }
    this.emitHud();
  }

  public setServerFeedback(score: number | null, unlocked: string[], offline: boolean): void {
    if (score !== null) this.lastServerScore = score;
    if (unlocked.length > 0) this.newlyUnlockedAchievements = unlocked;
    this.isOffline = offline;
    this.emitHud();
  }

  public setTrialServerFeedback(score: number | null, offline: boolean): void {
    if (score !== null) this.lastTrialScore = score;
    this.isOffline = offline;
    this.emitHud();
  }

  public setJudgeMode(enabled: boolean): void {
    this.judgeMode = enabled;
    if (enabled) {
      this.echoEnergy = 100;
    } else {
      this.flythroughTimer = 0;
    }
    this.updateExitUnlockState();
    this.emitHud();
  }

  public startShowcaseFlythrough(): void {
    if (!this.judgeMode) return;
    if (this.gameState !== 'PLAYING') {
      this.startLevel(this.currentLevel.levelNumber, null);
    }
    this.photoMode = false;
    this.camCtrl?.releasePointerLock();
    this.input.clearHeld();
    this.flythroughTimer = 20.0;
    this.flythroughPulseTimer = 0.15;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let avgY = 1.5;
    if (this.currentLevel.platforms.length > 0) {
      let sumY = 0;
      for (const p of this.currentLevel.platforms) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
        sumY += p.y;
      }
      avgY = sumY / this.currentLevel.platforms.length + 1.5;
      this.flythroughFocus.set((minX + maxX) * 0.5, avgY, (minZ + maxZ) * 0.5);
    } else {
      this.flythroughFocus.set(0, 1.5, -10);
    }
    this.emitHud();
  }

  public stopShowcaseFlythrough(): void {
    if (this.flythroughTimer <= 0) return;
    this.flythroughTimer = 0;
    this.camCtrl?.resetBehindPlayer();
    this.emitHud();
  }

  public startLevel(
    levelNumber: 1 | 2 | 3 | 4 | 5,
    savedCheckpoint?: { x: number; y: number; z: number } | null
  ): void {
    this.audio.unlock();
    this.lastTrialScore = null;
    this.flythroughTimer = 0;
    this.loadLevel(levelNumber, true, savedCheckpoint ?? null);
    this.gameState = 'PLAYING';
    this.emitHud();
    void this.triggerLore('level_start');
  }

  public startTrialLevel(trialLevel: Level3DDefinition): void {
    this.audio.unlock();
    this.lastTrialScore = null;
    this.flythroughTimer = 0;
    this.setActiveGhost(null);
    this.loadLevel(trialLevel.levelNumber, true, null, trialLevel);
    this.gameState = 'PLAYING';
    if (trialLevel.trialMeta?.ambientWhisper && !this.settings.speedrunMode) {
      this.loreMessage = trialLevel.trialMeta.ambientWhisper;
      this.loreSource = trialLevel.trialMeta.blueprintSource === 'gemini' ? 'gemini' : 'fallback';
      this.loreTimer = 7.0;
    }
    this.emitHud();
  }

  public setActiveGhost(ghost: GhostReplayRecord | null): void {
    if (this.ghostRig) {
      this.ghostRig.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
      });
      this.levelGroup.remove(this.ghostRig.root);
      this.ghostRig = null;
    }

    if (!ghost || this.currentLevel.isTrial || !this.scene) {
      this.activeGhostFrames = [];
      this.activeGhostOwner = null;
      this.activeGhostTargetTime = null;
      this.ghostDeltaSeconds = null;
      this.ghostLastPulseFrame = -1;
      this.emitHud();
      return;
    }

    if (ghost.levelNumber !== this.currentLevel.levelNumber) return;

    const frames = decodeGhostFrames(ghost.data);
    if (frames.length < 2) return;

    this.activeGhostFrames = frames;
    this.activeGhostOwner = ghost.username;
    this.activeGhostTargetTime = ghost.timeSeconds;
    this.ghostLastPulseFrame = -1;
    this.ghostDeltaSeconds = 0;

    const rig = createExplorerModel(this.shadowTex);
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0x43e8ff,
      emissive: 0x43e8ff,
      emissiveIntensity: 1.35,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      roughness: 0.25,
      metalness: 0.1,
    });
    rig.echoCoreLight.visible = false;
    rig.echoCoreLight.intensity = 0;
    rig.shadowPlane.visible = false;
    rig.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj !== rig.shadowPlane) {
        if (obj.material && !Array.isArray(obj.material)) {
          obj.material.dispose();
        }
        obj.material = ghostMat.clone();
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    ghostMat.dispose();
    rig.root.position.set(frames[0].x, frames[0].y, frames[0].z);
    rig.root.rotation.y = frames[0].yaw;
    rig.root.visible = this.settings.showGhost && this.gameState === 'PLAYING';
    this.levelGroup.add(rig.root);
    this.ghostRig = rig;
    this.emitHud();
  }

  public pause(): void {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.camCtrl?.releasePointerLock();
      this.input.clearHeld();
      this.isChargingPulse = false;
      this.chargeHoldTime = 0;
      this.emitHud();
    }
  }

  public resume(): void {
    if (this.gameState === 'PAUSED') {
      this.audio.unlock();
      this.gameState = 'PLAYING';
      this.input.clearHeld();
      this.emitHud();
    }
  }

  public returnToMenu(): void {
    this.gameState = 'MENU';
    this.camCtrl?.releasePointerLock();
    this.input.clearHeld();
    this.isChargingPulse = false;
    this.chargeHoldTime = 0;
    this.loadLevel(1, false);
    this.emitHud();
  }

  public restartCheckpoint(): void {
    this.phys.playerPos.copy(this.respawnPos);
    this.phys.playerVel.set(0, 0, 0);
    this.respawnAnim = 0;
    this.phys.standingPlatform = null;
    for (const p of this.entities.platforms) {
      if (p.def.kind === 'crumbling') {
        p.crumbleState = 'solid';
        p.crumbleTimer = 0;
        p.pos.set(p.def.x, p.def.y, p.def.z);
        p.mesh.visible = true;
        p.revealEntity.crumbleShaking = false;
      }
    }
    this.sonar?.emit(this.phys.playerPos, true, 16);
    this.emitHud();
  }

  private loadLevel(
    levelNumber: 1 | 2 | 3 | 4 | 5,
    isPlaying: boolean,
    savedCheckpoint: { x: number; y: number; z: number } | null = null,
    customLevel?: Level3DDefinition
  ): void {
    if (!this.scene) return;
    disposeLevelObjects(this.levelGroup, this.envRig);
    this.entities = createEmptyEntities();
    this.envRig = null;
    this.ghostRig = null;

    const def = customLevel ?? LEVELS_3D.find((l) => l.levelNumber === levelNumber) ?? LEVELS_3D[0];
    this.currentLevel = def;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const built = buildLevelScene({
      scene: this.scene,
      levelGroup: this.levelGroup,
      def,
      maxAnisotropy: maxAniso,
      stoneTex: this.stoneTex,
      lights: this.lights,
      persistentFragments: this.persistentFragments,
    });
    this.entities = built.entities;
    this.envRig = built.envRig;

    const startVec =
      savedCheckpoint && isPlaying
        ? new THREE.Vector3(savedCheckpoint.x, savedCheckpoint.y, savedCheckpoint.z)
        : new THREE.Vector3(def.spawn.x, def.spawn.y, def.spawn.z);
    this.phys.playerPos.copy(startVec);
    this.respawnPos.copy(startVec);
    this.phys.playerVel.set(0, 0, 0);
    this.phys.playerFacingYaw = Math.PI;
    this.phys.onGround = false;
    this.phys.coyoteTimer = 0;
    this.phys.jumpBufferTimer = 0;
    this.phys.standingPlatform = null;
    this.phys.footstepTimer = 0;
    this.phys.isCrouching = false;

    this.explorer.root.position.copy(this.phys.playerPos);
    this.explorer.root.visible = isPlaying;

    this.checkpointReached = Boolean(savedCheckpoint);
    this.echoEnergy = 100;
    this.chargeHoldTime = 0;
    this.isChargingPulse = false;
    this.levelElapsed = 0;
    this.pulsesThisLevel = 0;
    this.unsyncedPulses = 0;
    this.doorsOpenedThisLevel = 0;
    this.unsyncedDoorsOpened = 0;
    this.soundAlertCount = 0;
    this.interactPrompt = null;
    this.loreMessage = null;
    this.loreSource = null;
    this.loreTimer = 0;
    this.loreRequestSeq += 1;
    this.deathsThisLevel = 0;
    this.deathsInSection = 0;
    this.adaptiveAssistActive = false;
    this.hintsUsed = 0;
    this.hintCooldown = 0;
    this.stuckTimer = 0;
    this.hintAutoPrompt = false;
    this.hintLoading = false;
    this.newlyUnlockedAchievements = [];
    this.ghostRecordedFrames = [];
    this.ghostSampleAccum = 0;
    this.ghostPulsedSinceSample = false;
    this.activeGhostFrames = [];
    this.activeGhostOwner = null;
    this.activeGhostTargetTime = null;
    this.ghostLastPulseFrame = -1;
    this.ghostDeltaSeconds = null;
    this.checkpointSplits = [];
    this.photoMode = false;
    this.soundSubtitle = null;
    this.soundSubtitleTimer = 0;
    this.tutorialStep =
      isPlaying && def.levelNumber === 1 && !def.isTrial && !this.settings.tutorialCompleted
        ? 0
        : null;
    this.sonar.reset();
    this.camCtrl.resetBehindPlayer();
    this.audio.setAdaptiveIntensity(def.levelNumber, false);

    if (isPlaying) {
      this.sonar.emit(this.phys.playerPos, true, 16);
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.emitHud();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastNow) / 1000;
      this.lastNow = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      this.input.clearStepEdges();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer?.getContext() as WebGL2RenderingContext | undefined;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private emitSoundSubtitle = (label: string, origin?: THREE.Vector3): void => {
    if (!this.settings.soundSubtitles) return;
    let suffix = '';
    if (origin) {
      const dx = origin.x - this.phys.playerPos.x;
      const dz = origin.z - this.phys.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.8) {
        const fwdX = -Math.sin(this.camCtrl.yaw);
        const fwdZ = -Math.cos(this.camCtrl.yaw);
        const rightX = Math.cos(this.camCtrl.yaw);
        const rightZ = -Math.sin(this.camCtrl.yaw);
        const dotFwd = (dx * fwdX + dz * fwdZ) / dist;
        const dotRight = (dx * rightX + dz * rightZ) / dist;
        if (Math.abs(dotRight) > Math.abs(dotFwd)) {
          suffix = dotRight > 0 ? ' · Right' : ' · Left';
        } else {
          suffix = dotFwd >= 0 ? ' · Ahead' : ' · Behind';
        }
      }
    }
    this.soundSubtitle = `[${label}${suffix}]`;
    this.soundSubtitleTimer = 2.1;
  };

  private trackPerformance(rawDt: number): void {
    this.fpsAccum += rawDt;
    this.fpsFrames += 1;
    if (this.performanceToastTimer > 0) {
      this.performanceToastTimer = Math.max(0, this.performanceToastTimer - rawDt);
      if (this.performanceToastTimer === 0) {
        this.performanceToast = null;
      }
    }

    if (this.fpsAccum >= 1.0) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;

      if (
        !this.isSoftwareGl &&
        !this.autoDowngraded &&
        this.gameState === 'PLAYING' &&
        !this.photoMode &&
        this.currentFps < 45 &&
        this.settings.quality !== 'LOW'
      ) {
        this.lowFpsStreak += 1;
        if (this.lowFpsStreak >= 2) {
          this.lowFpsStreak = 0;
          this.autoDowngraded = true;
          const nextQ: QualityPreset = this.settings.quality === 'HIGH' ? 'MEDIUM' : 'LOW';
          this.settings.quality = nextQ;
          this.applyQualityToRenderer();
          this.performanceToast = `Adjusted graphics to ${nextQ} for smooth performance`;
          this.performanceToastTimer = 4.5;
          this.callbacks.onQualityAutoDowngrade?.(nextQ);
          this.emitHud();
        }
      } else {
        this.lowFpsStreak = 0;
      }

      if (this.showDebugOverlay && this.renderer) {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        this.debugStats = {
          fps: this.currentFps,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          entities:
            this.entities.platforms.length +
            this.entities.hazards.length +
            this.entities.fragments.length +
            this.entities.mirrorCrystals.length,
          quality: this.settings.quality,
          memoryMb: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null,
        };
      }
    }
  }

  private update(dt: number): void {
    this.worldTime += dt;
    this.trackPerformance(dt);
    this.envRig?.update(dt, this.worldTime, this.settings.quality);

    if (this.input.justPressed.has('F3')) {
      this.showDebugOverlay = !this.showDebugOverlay;
      if (!this.showDebugOverlay) {
        this.debugStats = null;
      } else if (this.renderer) {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        this.debugStats = {
          fps: this.currentFps,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          entities:
            this.entities.platforms.length +
            this.entities.hazards.length +
            this.entities.fragments.length +
            this.entities.mirrorCrystals.length,
          quality: this.settings.quality,
          memoryMb: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null,
        };
      }
      this.emitHud();
    }

    const gp: GamepadPollResult = this.input.pollGamepad(dt, this.worldTime, this.camCtrl);

    if (this.input.justPressed.has('Escape') || gp.pausePressed) {
      if (this.flythroughTimer > 0) {
        this.stopShowcaseFlythrough();
        return;
      }
      if (this.photoMode) {
        this.togglePhotoMode(false);
        return;
      }
      if (this.gameState === 'PLAYING') {
        this.pause();
        return;
      } else if (this.gameState === 'PAUSED') {
        this.resume();
        return;
      }
    }

    if (this.gameState === 'PLAYING' && this.input.isActionJustPressed('photo')) {
      this.togglePhotoMode();
      return;
    }

    if (this.gameState === 'MENU' || this.gameState === 'LEVEL_COMPLETE' || this.gameState === 'VICTORY') {
      const orbitAngle = this.worldTime * 0.14;
      this.camera.position.set(Math.sin(orbitAngle) * 18, 7.5, Math.cos(orbitAngle) * 18 - 8);
      this.camera.lookAt(0, 1.2, -10);

      this.menuPulseTimer -= dt;
      if (this.menuPulseTimer <= 0) {
        this.menuPulseTimer = 2.6;
        this.sonar.emit(new THREE.Vector3(0, 0.5, -10), true, 20);
      }
      this.sonar.update(dt, this.camera.position, this.entities.revealables, this.worldTime);
      animateLevelProps(this.entities, dt, this.worldTime);
      return;
    }

    if (this.gameState === 'PAUSED') return;

    if (this.flythroughTimer > 0) {
      const anyMoveKey =
        this.input.isActionJustPressed('forward') ||
        this.input.isActionJustPressed('backward') ||
        this.input.isActionJustPressed('left') ||
        this.input.isActionJustPressed('right') ||
        this.input.isActionJustPressed('jump');
      if (anyMoveKey) {
        this.stopShowcaseFlythrough();
        return;
      }

      this.flythroughTimer = Math.max(0, this.flythroughTimer - dt);
      const progress = 1 - this.flythroughTimer / 20.0;
      const angle = progress * Math.PI * 1.65 - 0.5;
      const radius = 22 + Math.sin(progress * Math.PI) * 8;
      const camY = this.flythroughFocus.y + 8.5 + Math.sin(progress * Math.PI * 2) * 2.5;
      this.camera.position.set(
        this.flythroughFocus.x + Math.sin(angle) * radius,
        camY,
        this.flythroughFocus.z + Math.cos(angle) * radius
      );
      this.camera.lookAt(this.flythroughFocus);

      this.flythroughPulseTimer -= dt;
      if (this.flythroughPulseTimer <= 0) {
        this.flythroughPulseTimer = 2.2;
        const pulseOrigin = new THREE.Vector3(
          this.flythroughFocus.x + Math.sin(angle + 0.4) * 6,
          this.flythroughFocus.y,
          this.flythroughFocus.z + Math.cos(angle + 0.4) * 6
        );
        this.sonar.emit(pulseOrigin, true, 24, 0.65);
        this.audio.playSonar();
      }
      updateMovingPlatformsAndDrones(
        this.entities,
        dt,
        this.worldTime,
        this.audio,
        this.sonar,
        this.emitSoundSubtitle
      );
      this.sonar.update(dt, this.flythroughFocus, this.entities.revealables, this.worldTime);
      updateMirrorCrystals(this.entities, this.sonar, dt, this.audio, this.emitSoundSubtitle);
      updateResonanceDoors(this.entities, dt);
      animateLevelProps(this.entities, dt, this.worldTime);

      if (this.flythroughTimer === 0) {
        this.camCtrl?.resetBehindPlayer();
      }
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.1) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
      return;
    }

    if (this.photoMode) {
      const yawInput =
        (this.input.heldKeys.has('ArrowRight') ? 1 : 0) -
        (this.input.heldKeys.has('ArrowLeft') ? 1 : 0);
      if (yawInput !== 0) this.camCtrl.applyKeyboardYaw(yawInput, dt);
      const zoomInput =
        (this.input.heldKeys.has('ArrowDown') ? 1 : 0) -
        (this.input.heldKeys.has('ArrowUp') ? 1 : 0);
      if (zoomInput !== 0) this.camCtrl.adjustDistance(zoomInput * dt * 6);
      this.camCtrl.update(this.camera, this.phys.playerPos, dt, true);
      return;
    }

    // State === PLAYING
    this.levelElapsed += dt;
    if (this.hintCooldown > 0) {
      this.hintCooldown = Math.max(0, this.hintCooldown - dt);
    }
    this.stuckTimer += dt;
    if (this.stuckTimer >= STUCK_OFFER_SECONDS && !this.hintAutoPrompt && this.hintCooldown <= 0) {
      this.hintAutoPrompt = true;
    }

    if (this.soundSubtitleTimer > 0) {
      this.soundSubtitleTimer = Math.max(0, this.soundSubtitleTimer - dt);
      if (this.soundSubtitleTimer === 0) {
        this.soundSubtitle = null;
      }
    }

    if (this.loreTimer > 0) {
      this.loreTimer = Math.max(0, this.loreTimer - dt);
      if (this.loreTimer === 0) {
        this.loreMessage = null;
        this.loreSource = null;
      }
    }
    if (this.interactAnim > 0) this.interactAnim = Math.max(0, this.interactAnim - dt);

    this.adaptiveAudioTimer += dt;
    if (this.adaptiveAudioTimer >= 0.4) {
      this.adaptiveAudioTimer = 0;
      const anyAlert =
        this.entities.hazards.some((h) => h.alertTimer > 0) ||
        Boolean(
          this.entities.bossWarden &&
            !this.entities.bossWarden.defeated &&
            this.entities.bossWarden.alertTimer > 0
        );
      this.audio.setAdaptiveIntensity(this.currentLevel.levelNumber, anyAlert);
    }

    if (this.input.isActionJustPressed('hint')) {
      void this.requestHint();
    }

    if (this.input.isActionJustPressed('restart')) {
      this.restartCheckpoint();
      return;
    }

    if (this.respawnAnim > 0) {
      this.respawnAnim -= dt * 2.2;
      animateExplorer(
        this.explorer,
        dt,
        this.worldTime,
        0,
        false,
        0,
        0,
        0,
        Math.max(0, this.respawnAnim)
      );
      if (this.respawnAnim <= 0) {
        this.respawnAnim = 0;
        this.phys.playerPos.copy(this.respawnPos);
        this.phys.playerVel.set(0, 0, 0);
        this.phys.standingPlatform = null;
        this.sonar.emit(this.phys.playerPos, true, 16);
        void this.triggerLore('death');
      }
      this.camCtrl.update(this.camera, this.phys.playerPos, dt, this.settings.reducedShake);
      return;
    }

    updateMovingPlatformsAndDrones(
      this.entities,
      dt,
      this.worldTime,
      this.audio,
      this.sonar,
      this.emitSoundSubtitle
    );

    const yawInput =
      (this.input.heldKeys.has('ArrowRight') ? 1 : 0) -
      (this.input.heldKeys.has('ArrowLeft') ? 1 : 0);
    if (yawInput !== 0) {
      this.camCtrl.applyKeyboardYaw(yawInput, dt);
    }

    // Echo Energy regen (+25% boost when Adaptive Assist active)
    const regenRate = this.adaptiveAssistActive ? 16 * 1.25 : 16;
    this.echoEnergy = this.judgeMode ? 100 : Math.min(100, this.echoEnergy + dt * regenRate);
    const holdingPulse = this.input.isActionHeld('pulse') || gp.holdingPulse;
    if (holdingPulse && this.sonar.canEmit() && this.echoEnergy >= 25) {
      this.isChargingPulse = true;
      this.chargeHoldTime = Math.min(CHARGE_HOLD_MAX, this.chargeHoldTime + dt);
    } else if (this.isChargingPulse && (!holdingPulse || gp.pulseReleased)) {
      const chargeRatio = this.chargeHoldTime > 0.24 ? this.chargeHoldTime / CHARGE_HOLD_MAX : 0;
      this.isChargingPulse = false;
      this.chargeHoldTime = 0;
      this.firePlayerPulse(chargeRatio);
    } else if (!holdingPulse) {
      this.isChargingPulse = false;
      this.chargeHoldTime = 0;
    }

    if (this.input.virtualPulse && this.sonar.canEmit() && this.echoEnergy >= 25) {
      this.firePlayerPulse(0);
    }

    // Player physics step
    const stepRes = stepPlayerPhysics({
      dt,
      state: this.phys,
      input: this.input,
      gp,
      camCtrl: this.camCtrl,
      explorerRoot: this.explorer.root,
      platforms: this.entities.platforms,
      resonanceDoors: this.entities.resonanceDoors,
      hazards: this.entities.hazards,
      bossWarden: this.entities.bossWarden,
      audio: this.audio,
    });

    if (stepRes.noiseOrigin && stepRes.noiseRadius > 0) {
      emitSoundNoise(
        this.entities,
        stepRes.noiseOrigin,
        stepRes.noiseRadius,
        () => {
          this.soundAlertCount += 1;
        },
        this.audio,
        this.emitSoundSubtitle
      );
    }

    if (stepRes.triggeredDeath) {
      this.triggerDeath();
      return;
    }

    if (this.tutorialStep === 0) {
      const moved = Math.hypot(
        this.phys.playerPos.x - this.currentLevel.spawn.x,
        this.phys.playerPos.z - this.currentLevel.spawn.z
      );
      if (moved >= 2.0) {
        this.tutorialStep = 1;
      }
    }

    this.explorer.root.position.copy(this.phys.playerPos);
    const horizSpeed = Math.hypot(this.phys.playerVel.x, this.phys.playerVel.z);
    animateExplorer(
      this.explorer,
      dt,
      this.worldTime,
      horizSpeed,
      this.phys.onGround,
      this.phys.playerVel.y,
      this.settings.reducedShake ? 0 : this.sonar.pulseFlash,
      this.interactAnim,
      0,
      this.phys.isCrouching
    );
    this.lights.keyLight.position.set(
      this.phys.playerPos.x + 14,
      this.phys.playerPos.y + 24,
      this.phys.playerPos.z + 16
    );
    this.lights.keyLight.target.position.copy(this.phys.playerPos);

    this.camCtrl.update(this.camera, this.phys.playerPos, dt, this.settings.reducedShake);

    _playerCenter.set(this.phys.playerPos.x, this.phys.playerPos.y + 0.9, this.phys.playerPos.z);
    this.sonar.update(dt, _playerCenter, this.entities.revealables, this.worldTime);
    updateBossWarden(this.entities, dt, this.worldTime, this.phys.isCrouching);
    updateMirrorCrystals(
      this.entities,
      this.sonar,
      dt,
      this.audio,
      this.emitSoundSubtitle,
      this.handleWardenStunned
    );
    updateResonanceDoors(this.entities, dt);

    animateLevelProps(this.entities, dt, this.worldTime);
    this.handleInteractions(gp.interactPressed);
    this.recordGhostSample(dt);
    this.updateGhostPlayback(dt);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private recordGhostSample(dt: number): void {
    if (this.currentLevel.isTrial) return;
    if (this.ghostRecordedFrames.length >= GHOST_MAX_FRAMES) return;
    this.ghostSampleAccum += dt;
    while (
      this.ghostSampleAccum >= GHOST_SAMPLE_DT &&
      this.ghostRecordedFrames.length < GHOST_MAX_FRAMES
    ) {
      this.ghostSampleAccum -= GHOST_SAMPLE_DT;
      this.ghostRecordedFrames.push({
        x: this.phys.playerPos.x,
        y: this.phys.playerPos.y,
        z: this.phys.playerPos.z,
        yaw: this.phys.playerFacingYaw,
        pulsed: this.ghostPulsedSinceSample,
        crouching: this.phys.isCrouching,
      });
      this.ghostPulsedSinceSample = false;
    }
  }

  private updateGhostPlayback(dt: number): void {
    if (!this.ghostRig || this.activeGhostFrames.length < 2) {
      this.ghostDeltaSeconds = null;
      return;
    }
    this.ghostRig.root.visible = this.settings.showGhost;

    const frames = this.activeGhostFrames;
    const floatIdx = Math.min(frames.length - 1, Math.max(0, this.levelElapsed / GHOST_SAMPLE_DT));
    const i0 = Math.floor(floatIdx);
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const alpha = floatIdx - i0;

    const f0 = frames[i0];
    const f1 = frames[i1];
    const gx = THREE.MathUtils.lerp(f0.x, f1.x, alpha);
    const gy = THREE.MathUtils.lerp(f0.y, f1.y, alpha);
    const gz = THREE.MathUtils.lerp(f0.z, f1.z, alpha);

    let yawDiff = f1.yaw - f0.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    const gYaw = f0.yaw + yawDiff * alpha;

    this.ghostRig.root.position.set(gx, gy, gz);
    this.ghostRig.root.rotation.y = gYaw;

    const approxSpeed = Math.hypot(f1.x - f0.x, f1.z - f0.z) / GHOST_SAMPLE_DT;
    const approxVy = (f1.y - f0.y) / GHOST_SAMPLE_DT;
    animateExplorer(
      this.ghostRig,
      dt,
      this.worldTime,
      approxSpeed,
      Math.abs(approxVy) < 1.2,
      approxVy,
      f0.pulsed ? 0.8 : 0,
      0,
      0,
      f0.crouching
    );

    if (i0 > this.ghostLastPulseFrame) {
      let triggeredPulse = false;
      for (let k = Math.max(0, this.ghostLastPulseFrame + 1); k <= i0; k++) {
        if (frames[k].pulsed) {
          triggeredPulse = true;
          break;
        }
      }
      this.ghostLastPulseFrame = i0;
      if (triggeredPulse && this.settings.showGhost) {
        this.sonar.emit(this.ghostRig.root.position, true, 6);
      }
    }

    let bestIdx = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const dx = frames[i].x - this.phys.playerPos.x;
      const dy = frames[i].y - this.phys.playerPos.y;
      const dz = frames[i].z - this.phys.playerPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestIdx = i;
      }
    }
    const ghostTimeAtPos = bestIdx * GHOST_SAMPLE_DT;
    this.ghostDeltaSeconds = Number((this.levelElapsed - ghostTimeAtPos).toFixed(1));
  }

  private firePlayerPulse(requestedCharge: number): void {
    if (!this.sonar.canEmit() || this.echoEnergy < 25) return;
    const maxAffordableCharge = Math.max(0, Math.min(1, (this.echoEnergy - 25) / 25));
    const effectiveCharge = Math.min(requestedCharge, maxAffordableCharge);
    const cost = 25 + Math.round(effectiveCharge * 25);
    const baseSparks =
      this.settings.quality === 'LOW' ? 12 : this.settings.quality === 'MEDIUM' ? 22 : 34;
    const sparkCount = Math.round(baseSparks * (1 + effectiveCharge * 0.6));

    if (this.sonar.emit(this.phys.playerPos, false, sparkCount, effectiveCharge)) {
      this.echoEnergy = this.judgeMode ? 100 : Math.max(0, this.echoEnergy - cost);
      this.pulsesThisLevel += 1;
      this.unsyncedPulses += 1;
      this.ghostPulsedSinceSample = true;
      if (effectiveCharge > 0.25) {
        this.audio.playChargedSonar(effectiveCharge);
        this.emitSoundSubtitle('Charged Sonar Wave');
        if (!this.settings.reducedShake) this.camCtrl.triggerShake(0.32, 0.22);
      } else {
        this.audio.playSonar();
        this.emitSoundSubtitle('Sonar Ping');
        if (!this.settings.reducedShake) this.camCtrl.triggerShake(0.22, 0.16);
      }
      if (this.tutorialStep === 1) {
        this.tutorialStep = 2;
      }

      for (const gp of this.entities.glyphPads) {
        if (gp.activated) continue;
        const dist = Math.hypot(
          this.phys.playerPos.x - gp.def.x,
          this.phys.playerPos.z - gp.def.z
        );
        if (dist < 1.85 && Math.abs(this.phys.playerPos.y - gp.def.y) < 1.35) {
          gp.activated = true;
          const ringMat = gp.ringMesh.material as THREE.MeshStandardMaterial;
          ringMat.emissiveIntensity = 3.0;
          const door = this.entities.resonanceDoors.find((d) => d.def.id === gp.def.doorId);
          if (door && !door.open) {
            door.open = true;
            this.doorsOpenedThisLevel += 1;
            this.unsyncedDoorsOpened += 1;
            this.audio.playDoorOpen();
            this.emitSoundSubtitle('Resonance Door Unsealed', door.mesh.position);
            this.sonar.spawnSparks(door.mesh.position, 24);
            this.loreMessage = `Resonance Door unlocked (${gp.def.color.toUpperCase()}).`;
            this.loreSource = null;
            this.loreTimer = 3.0;
          }
        }
      }

      emitSoundNoise(
        this.entities,
        this.phys.playerPos,
        14,
        () => {
          this.soundAlertCount += 1;
        },
        this.audio,
        this.emitSoundSubtitle
      );
    }
  }

  private handleInteractions(gamepadInteract = false): void {
    for (const f of this.entities.fragments) {
      if (f.collected) continue;
      const dist = Math.hypot(
        this.phys.playerPos.x - f.def.x,
        this.phys.playerPos.y + 0.9 - f.def.y,
        this.phys.playerPos.z - f.def.z
      );
      if (dist < 1.35) {
        f.collected = true;
        f.mesh.visible = false;
        f.light.visible = false;
        if (!this.currentLevel.isTrial && !this.judgeMode) {
          this.persistentFragments.add(f.def.id);
        }
        if (this.tutorialStep === 2) {
          this.skipTutorial();
        }
        this.stuckTimer = 0;
        this.hintAutoPrompt = false;
        this.audio.playCrystalCollect();
        this.emitSoundSubtitle('Fragment Chime', f.mesh.position);
        this.sonar.spawnSparks(f.mesh.position, 22);
        if (!this.currentLevel.isTrial) {
          this.saveCheckpointProgress();
        }
        this.emitHud();
      }
    }

    for (let cpIdx = 0; cpIdx < this.entities.checkpoints.length; cpIdx++) {
      const cp = this.entities.checkpoints[cpIdx];
      if (cp.activated) continue;
      const dist = Math.hypot(
        this.phys.playerPos.x - cp.def.x,
        this.phys.playerPos.z - cp.def.z
      );
      if (dist < 1.7 && Math.abs(this.phys.playerPos.y - cp.def.y) < 1.6) {
        cp.activated = true;
        this.checkpointReached = true;
        if (this.tutorialStep === 2) {
          this.skipTutorial();
        }
        this.stuckTimer = 0;
        this.hintAutoPrompt = false;
        this.deathsInSection = 0;
        this.adaptiveAssistActive = false;
        this.respawnPos.set(cp.def.x, cp.def.y + 0.1, cp.def.z);
        const mat = cp.crystal.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x43e8ff);
        mat.emissive.setHex(0x43e8ff);
        mat.emissiveIntensity = 1.9;
        this.audio.playCheckpoint();
        this.emitSoundSubtitle('Checkpoint Beacon', cp.group.position);
        const splitLabel = `CP ${cpIdx + 1}`;
        if (!this.checkpointSplits.some((s) => s.label === splitLabel)) {
          this.checkpointSplits.push({
            label: splitLabel,
            time: Number(this.levelElapsed.toFixed(1)),
            delta: this.ghostDeltaSeconds,
          });
        }
        if (!this.settings.speedrunMode) {
          this.loreMessage = 'Checkpoint illuminated — progress anchored.';
          this.loreSource = null;
          this.loreTimer = 3.2;
        }
        if (!this.currentLevel.isTrial) {
          this.saveCheckpointProgress();
        }
        this.emitHud();
      }
    }

    if (
      !this.currentLevel.isTrial &&
      !this.judgeMode &&
      this.currentLevel.secretZoneCenter &&
      !this.persistentSecrets.has(this.currentLevel.levelNumber)
    ) {
      const sz = this.currentLevel.secretZoneCenter;
      if (Math.hypot(this.phys.playerPos.x - sz.x, this.phys.playerPos.z - sz.z) < 3.2) {
        this.persistentSecrets.add(this.currentLevel.levelNumber);
        this.stuckTimer = 0;
        this.hintAutoPrompt = false;
        this.loreMessage = 'Secret Passage Discovered!';
        this.loreSource = null;
        this.loreTimer = 3.5;
        this.saveCheckpointProgress();
        void this.triggerLore('secret_found');
      }
    }

    let prompt: string | null = null;
    const interactPressed =
      this.input.isActionJustPressed('interact') || this.input.virtualInteract || gamepadInteract;
    const interactKeyLabel = this.input.gamepadActive
      ? 'Y'
      : formatKeyCode(this.settings.keyBindings.interact);

    for (const m of this.entities.mechanisms) {
      if (m.activated) continue;
      const dist = Math.hypot(
        this.phys.playerPos.x - m.def.x,
        this.phys.playerPos.z - m.def.z
      );
      if (dist < 2.2 && Math.abs(this.phys.playerPos.y - m.def.y) < 1.8) {
        prompt = `Press ${interactKeyLabel} · Activate ${m.def.label}`;
        if (interactPressed) {
          m.activated = true;
          this.stuckTimer = 0;
          this.hintAutoPrompt = false;
          this.interactAnim = 0.45;
          const mat = m.orb.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x43e8ff);
          mat.emissive.setHex(0x43e8ff);
          mat.emissiveIntensity = 2.2;
          m.light.color.setHex(0x43e8ff);
          this.audio.playMechanism();
          this.emitSoundSubtitle('Ancient Seal Activated', m.group.position);
          if (!this.settings.reducedShake) this.camCtrl.triggerShake(0.26, 0.22);

          this.updateExitUnlockState();
          this.emitHud();
        }
      }
    }

    for (const st of this.entities.statues) {
      const dist = Math.hypot(this.phys.playerPos.x - st.x, this.phys.playerPos.z - st.z);
      if (dist < 2.6 && Math.abs(this.phys.playerPos.y - st.y) < 2.0) {
        if (!prompt) prompt = `Press ${interactKeyLabel} · Read Ancient Watcher`;
        if (interactPressed) {
          this.interactAnim = 0.35;
          this.loreMessage = st.inscription;
          this.loreSource = null;
          this.loreTimer = 6.0;
          this.audio.playMechanism();
          this.emitHud();
          void this.triggerLore('statue', st.inscription);
        }
      }
    }

    if (this.entities.exitObj) {
      const dist = Math.hypot(
        this.phys.playerPos.x - this.entities.exitObj.pos.x,
        this.phys.playerPos.z - this.entities.exitObj.pos.z
      );
      if (dist < 2.4 && Math.abs(this.phys.playerPos.y - this.entities.exitObj.pos.y) < 2.0) {
        if (this.entities.exitObj.unlocked || this.judgeMode) {
          prompt = this.entities.exitObj.unlocked
            ? `Press ${interactKeyLabel} · Enter Ancient Portal`
            : `Press ${interactKeyLabel} · Showcase Skip (Enter Portal)`;
          if (interactPressed) {
            this.completeCurrentLevel();
            return;
          }
        } else {
          const activeCount = this.entities.mechanisms.filter((x) => x.activated).length;
          const bw = this.entities.bossWarden;
          if (bw && !bw.defeated && activeCount >= this.entities.exitObj.required) {
            prompt = `Silent Warden Active (${bw.stuns}/${bw.maxStuns} Stuns)`;
          } else {
            prompt = `Portal Sealed (${activeCount}/${this.entities.exitObj.required} Seals Active)`;
          }
        }
      }
    }

    this.interactPrompt = prompt;
  }

  private handleWardenStunned = (stuns: number, maxStuns: number, defeated: boolean): void => {
    this.stuckTimer = 0;
    this.hintAutoPrompt = false;
    if (!this.settings.reducedShake) {
      this.camCtrl.triggerShake(defeated ? 0.55 : 0.35, defeated ? 0.42 : 0.25);
    }
    this.updateExitUnlockState();
    if (defeated) {
      this.performanceToast = 'The Silent Warden shattered! Core Portal unlocked.';
      this.performanceToastTimer = 4.5;
      this.audio.playDoorOpen();
    } else {
      this.performanceToast = `Silent Warden stunned (${stuns}/${maxStuns})!`;
      this.performanceToastTimer = 3.2;
    }
    this.emitHud();
  };

  private updateExitUnlockState(): void {
    const exitObj = this.entities.exitObj;
    if (!exitObj) return;
    const activeCount = this.entities.mechanisms.filter((x) => x.activated).length;
    const bw = this.entities.bossWarden;
    const bossCleared = !bw || bw.defeated || this.judgeMode;
    const shouldUnlock = (activeCount >= exitObj.required && bossCleared) || (this.judgeMode && bw !== null);
    if (shouldUnlock && !exitObj.unlocked) {
      exitObj.unlocked = true;
      const pMat = exitObj.portalMesh.material as THREE.MeshStandardMaterial;
      pMat.color.setHex(0x43e8ff);
      pMat.emissive.setHex(0x43e8ff);
      pMat.emissiveIntensity = 2.1;
      pMat.opacity = 0.88;
      exitObj.light.color.setHex(0x43e8ff);
      this.loreMessage = 'Ancient Door unsealed! Proceed through the portal.';
      this.loreSource = null;
      this.loreTimer = 4.2;
    }
  }

  private triggerDeath(): void {
    if (this.respawnAnim > 0) return;
    this.respawnAnim = 1.0;
    this.deathsThisLevel += 1;
    this.deathsInSection += 1;
    if (this.deathsInSection >= 3 && this.isAdaptiveAssistEligible() && !this.adaptiveAssistActive) {
      this.adaptiveAssistActive = true;
      this.hintAutoPrompt = true;
      this.performanceToast = 'Echo steadies — pulse regen +25% & [H] hint available';
      this.performanceToastTimer = 4.5;
    }
    this.audio.playDeath();
    this.camCtrl.triggerShake(0.45, 0.3);
    this.sonar.spawnSparks(this.phys.playerPos, 28);
    this.emitHud();
  }

  private async triggerLore(trigger: LoreTrigger, statueInscription?: string): Promise<void> {
    if (this.isDestroyed) return;
    if (this.settings.speedrunMode && trigger !== 'statue') return;
    const seq = ++this.loreRequestSeq;
    const levelNumber = this.currentLevel.levelNumber;
    const collectedCount = this.entities.fragments.filter((f) => f.collected).length;

    const result = await fetchAiLore(
      {
        trigger,
        levelNumber,
        levelName: this.currentLevel.name,
        fragmentsCollected: collectedCount,
        pulsesUsed: this.pulsesThisLevel,
        elapsedSeconds: Math.round(this.levelElapsed),
        deaths: this.deathsThisLevel,
        statueInscription,
        language: this.settings.narrationLanguage,
      },
      this.settings.aiNarration
    );

    if (this.isDestroyed || seq !== this.loreRequestSeq) return;
    if (this.currentLevel.levelNumber !== levelNumber) return;

    this.loreMessage = result.text;
    this.loreSource = result.source;
    this.loreTimer = 6.5;
    this.audio.playWhisper();
    this.emitHud();
  }

  public async requestHint(): Promise<void> {
    if (this.isDestroyed || this.gameState !== 'PLAYING') return;
    if (this.hintCooldown > 0 || this.hintLoading) return;

    const seq = ++this.loreRequestSeq;
    const levelNumber = this.currentLevel.levelNumber;
    this.hintLoading = true;
    this.hintAutoPrompt = false;
    this.hintCooldown = HINT_COOLDOWN_SECONDS;
    this.hintsUsed += 1;
    this.stuckTimer = 0;
    this.emitHud();

    const collected = this.entities.fragments.filter((f) => f.collected).length;
    const missing = Math.max(0, this.entities.fragments.length - collected);
    const mechActivated = this.entities.mechanisms.filter((m) => m.activated).length;

    const result = await fetchAiHint(
      {
        levelNumber,
        levelName: this.currentLevel.name,
        fragmentsCollected: collected,
        fragmentsMissing: missing,
        mechanismsActivated: mechActivated,
        mechanismsRequired: this.entities.exitObj ? this.entities.exitObj.required : 0,
        secondsStuck: Math.round(this.levelElapsed),
        language: this.settings.narrationLanguage,
      },
      this.settings.aiNarration
    );

    this.hintLoading = false;
    if (this.isDestroyed || seq !== this.loreRequestSeq || this.gameState !== 'PLAYING') {
      this.emitHud();
      return;
    }

    this.loreMessage = result.text;
    this.loreSource = result.source;
    this.loreTimer = 7.0;
    this.audio.playWhisper();
    this.emitHud();
  }

  private saveCheckpointProgress(): void {
    if (this.judgeMode) return;
    const pulsesDelta = this.unsyncedPulses;
    const doorsOpenedDelta = this.unsyncedDoorsOpened;
    this.unsyncedPulses = 0;
    this.unsyncedDoorsOpened = 0;
    this.callbacks.onCheckpointSave({
      level: this.currentLevel.levelNumber,
      checkpoint: {
        level: this.currentLevel.levelNumber,
        x: Number(this.respawnPos.x.toFixed(2)),
        y: Number(this.respawnPos.y.toFixed(2)),
        z: Number(this.respawnPos.z.toFixed(2)),
      },
      collectedFragments: Array.from(this.persistentFragments),
      pulsesDelta,
      secretsDiscovered: Array.from(this.persistentSecrets),
      doorsOpenedDelta,
    });
  }

  private completeCurrentLevel(): void {
    const pulsesDelta = this.unsyncedPulses;
    const doorsOpenedDelta = this.unsyncedDoorsOpened;
    this.unsyncedPulses = 0;
    this.unsyncedDoorsOpened = 0;

    if (this.currentLevel.isTrial && this.currentLevel.trialMeta) {
      const elapsed = Math.max(8, Math.round(this.levelElapsed * 10) / 10);
      this.lastCompletedLevelTime = elapsed;
      this.lastMedal = null;
      this.gameState = 'LEVEL_COMPLETE';
      this.audio.playLevelComplete();
      this.camCtrl.releasePointerLock();
      this.input.clearHeld();

      if (!this.judgeMode) {
        this.callbacks.onTrialCompleted?.({
          seed: this.currentLevel.trialMeta.seed,
          difficulty: this.currentLevel.trialMeta.difficulty,
          isDaily: this.currentLevel.trialMeta.isDaily,
          completionTimeSeconds: elapsed,
          fragmentsCollected: this.entities.fragments.filter((f) => f.collected).length,
          pulsesUsed: this.pulsesThisLevel,
          shareCode: this.currentLevel.trialMeta.shareCode,
        });
      }

      this.emitHud();
      return;
    }

    const elapsed = Math.max(6, Math.round(this.levelElapsed * 10) / 10);
    this.lastCompletedLevelTime = elapsed;
    this.lastMedal = computeLevelMedal(this.currentLevel.levelNumber, elapsed);

    const finalDelta =
      this.activeGhostTargetTime !== null
        ? Number((elapsed - this.activeGhostTargetTime).toFixed(1))
        : this.ghostDeltaSeconds;
    this.checkpointSplits.push({
      label: 'Finish',
      time: elapsed,
      delta: finalDelta,
    });

    let ghostData: string | undefined;
    if (!this.judgeMode && this.ghostRecordedFrames.length >= 30) {
      ghostData = encodeGhostFrames(this.ghostRecordedFrames);
    }

    if (this.currentLevel.levelNumber === 5) {
      this.gameState = 'VICTORY';
      this.audio.playVictoryFanfare();
    } else {
      this.gameState = 'LEVEL_COMPLETE';
      this.audio.playLevelComplete();
    }

    this.camCtrl.releasePointerLock();
    this.input.clearHeld();
    void this.triggerLore('level_complete');

    if (!this.judgeMode) {
      this.callbacks.onLevelCompleted({
        level: this.currentLevel.levelNumber,
        completionTimeSeconds: elapsed,
        collectedFragments: Array.from(this.persistentFragments),
        pulsesDelta,
        secretsDiscovered: Array.from(this.persistentSecrets),
        doorsOpenedDelta,
        noAlertClear: this.soundAlertCount === 0,
        hintsUsed: this.hintsUsed,
        ghostData,
      });
    }

    this.emitHud();
  }

  public getHudSnapshot(): HudSnapshot {
    return buildHudSnapshot({
      gameState: this.gameState,
      currentLevel: this.currentLevel,
      entities: this.entities,
      persistentFragmentsCount: this.persistentFragments.size,
      echoEnergy: this.echoEnergy,
      sonarCooldownRatio: this.sonar ? this.sonar.getCooldownRatio() : 0,
      sonarReady: this.sonar ? this.sonar.canEmit() && this.echoEnergy >= 25 : true,
      isChargingPulse: this.isChargingPulse,
      chargeHoldTime: this.chargeHoldTime,
      isCrouching: this.phys.isCrouching,
      soundAlertCount: this.soundAlertCount,
      doorsOpenedThisLevel: this.doorsOpenedThisLevel,
      checkpointReached: this.checkpointReached,
      levelElapsed: this.levelElapsed,
      pulsesThisLevel: this.pulsesThisLevel,
      hintsUsed: this.hintsUsed,
      hintCooldown: this.hintCooldown,
      hintAutoPrompt: this.hintAutoPrompt,
      hintLoading: this.hintLoading,
      interactPrompt: this.interactPrompt,
      loreMessage: this.loreMessage,
      loreSource: this.loreSource,
      pointerLocked: this.camCtrl ? this.camCtrl.pointerLocked : false,
      isOffline: this.isOffline,
      webglError: this.webglError,
      lastCompletedLevelTime: this.lastCompletedLevelTime,
      lastMedal: this.lastMedal,
      lastServerScore: this.lastServerScore,
      newlyUnlockedAchievements: this.newlyUnlockedAchievements,
      lastTrialScore: this.lastTrialScore,
      ghostDeltaSeconds: this.ghostDeltaSeconds,
      activeGhostOwner: this.activeGhostOwner,
      activeGhostTargetTime: this.activeGhostTargetTime,
      checkpointSplits: this.checkpointSplits,
      soundSubtitle: this.soundSubtitle,
      gamepadActive: this.input.gamepadActive,
      photoMode: this.photoMode,
      tutorialStep: this.tutorialStep,
      debugStats: this.debugStats,
      performanceToast: this.performanceToast,
      engineReady: this.engineReady,
      judgeMode: this.judgeMode,
      flythroughTimer: this.flythroughTimer,
      adaptiveAssistActive: this.adaptiveAssistActive,
      deathsInSection: this.deathsInSection,
      wardenActive:
        this.entities.bossWarden !== null &&
        !this.entities.bossWarden.defeated &&
        (this.phys.playerPos.z < -46 || this.entities.bossWarden.stuns > 0),
      wardenStuns: this.entities.bossWarden ? this.entities.bossWarden.stuns : 0,
      wardenMaxStuns: this.entities.bossWarden ? this.entities.bossWarden.maxStuns : 3,
      wardenStunned: this.entities.bossWarden ? this.entities.bossWarden.stunTimer > 0 : false,
    });
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.getHudSnapshot());
  }

  public destroy(): void {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.input.dispose();

    disposeLevelObjects(this.levelGroup, this.envRig);
    this.camCtrl?.dispose();
    this.sonar?.dispose();
    this.stoneTex?.dispose();
    this.shadowTex?.dispose();
    this.audio.destroy();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}

export type { RuntimePlatform };
