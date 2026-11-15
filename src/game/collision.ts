import * as THREE from 'three';
import { Audio3DEngine } from './audio3d';
import { ThirdPersonCameraController } from './camera3d';
import {
  CROUCH_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  RuntimeBossWarden,
  RuntimeHazard,
  RuntimePlatform,
  RuntimeResonanceDoor,
  SPRINT_SPEED,
  WALK_SPEED,
} from './engineTypes';
import { EngineInputController, GamepadPollResult } from './inputController';

const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export function resolveHorizontalCollisions(
  playerPos: THREE.Vector3,
  playerVel: THREE.Vector3,
  platforms: RuntimePlatform[],
  resonanceDoors: RuntimeResonanceDoor[],
  axis: 'x' | 'z'
): void {
  for (const p of platforms) {
    if (p.crumbleState === 'fallen') continue;
    const halfW = p.def.w * 0.5;
    const halfH = p.def.h * 0.5;
    const halfD = p.def.d * 0.5;
    const topY = p.pos.y + halfH;
    const botY = p.pos.y - halfH;

    if (playerPos.y >= topY - 0.25 || playerPos.y + PLAYER_HEIGHT <= botY + 0.05) {
      continue;
    }

    if (
      Math.abs(playerPos.x - p.pos.x) < halfW + PLAYER_RADIUS &&
      Math.abs(playerPos.z - p.pos.z) < halfD + PLAYER_RADIUS
    ) {
      if (axis === 'x') {
        const sign = playerPos.x >= p.pos.x ? 1 : -1;
        playerPos.x = p.pos.x + sign * (halfW + PLAYER_RADIUS);
        playerVel.x = 0;
      } else {
        const sign = playerPos.z >= p.pos.z ? 1 : -1;
        playerPos.z = p.pos.z + sign * (halfD + PLAYER_RADIUS);
        playerVel.z = 0;
      }
    }
  }

  for (const d of resonanceDoors) {
    if (d.open) continue;
    const halfW = d.def.w * 0.5;
    const halfH = d.def.h * 0.5;
    const halfD = d.def.d * 0.5;
    const topY = d.def.y + halfH;
    const botY = d.def.y - halfH;

    if (playerPos.y >= topY || playerPos.y + PLAYER_HEIGHT <= botY) {
      continue;
    }

    if (
      Math.abs(playerPos.x - d.def.x) < halfW + PLAYER_RADIUS &&
      Math.abs(playerPos.z - d.def.z) < halfD + PLAYER_RADIUS
    ) {
      if (axis === 'x') {
        const sign = playerPos.x >= d.def.x ? 1 : -1;
        playerPos.x = d.def.x + sign * (halfW + PLAYER_RADIUS);
        playerVel.x = 0;
      } else {
        const sign = playerPos.z >= d.def.z ? 1 : -1;
        playerPos.z = d.def.z + sign * (halfD + PLAYER_RADIUS);
        playerVel.z = 0;
      }
    }
  }
}

export interface PhysicsStepState {
  playerPos: THREE.Vector3;
  playerVel: THREE.Vector3;
  playerFacingYaw: number;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  standingPlatform: RuntimePlatform | null;
  footstepTimer: number;
  isCrouching: boolean;
}

export interface PhysicsStepOutcome {
  triggeredDeath: boolean;
  noiseOrigin: THREE.Vector3 | null;
  noiseRadius: number;
}

export function stepPlayerPhysics(params: {
  dt: number;
  state: PhysicsStepState;
  input: EngineInputController;
  gp: GamepadPollResult;
  camCtrl: ThirdPersonCameraController;
  explorerRoot: THREE.Group;
  platforms: RuntimePlatform[];
  resonanceDoors: RuntimeResonanceDoor[];
  hazards: RuntimeHazard[];
  bossWarden?: RuntimeBossWarden | null;
  audio: Audio3DEngine;
}): PhysicsStepOutcome {
  const {
    dt,
    state,
    input,
    gp,
    camCtrl,
    explorerRoot,
    platforms,
    resonanceDoors,
    hazards,
    bossWarden,
    audio,
  } = params;

  const wasOnGround = state.onGround;
  const preLandVy = state.playerVel.y;

  if (state.onGround && state.standingPlatform) {
    state.playerPos.add(state.standingPlatform.delta);
  }

  const fwdInput =
    (input.isActionHeld('forward') || input.heldKeys.has('ArrowUp') ? 1 : 0) -
    (input.isActionHeld('backward') || input.heldKeys.has('ArrowDown') ? 1 : 0) -
    input.virtualMove.y -
    input.gamepadMove.y;
  const strafeInput =
    (input.isActionHeld('right') ? 1 : 0) -
    (input.isActionHeld('left') ? 1 : 0) +
    input.virtualMove.x +
    input.gamepadMove.x;

  _forward.set(-Math.sin(camCtrl.yaw), 0, -Math.cos(camCtrl.yaw));
  _right.set(Math.cos(camCtrl.yaw), 0, -Math.sin(camCtrl.yaw));

  _moveDir.set(0, 0, 0);
  _moveDir.addScaledVector(_forward, fwdInput);
  _moveDir.addScaledVector(_right, strafeInput);

  state.isCrouching =
    input.isActionHeld('crouch') ||
    input.heldKeys.has('ControlLeft') ||
    input.heldKeys.has('ControlRight') ||
    gp.crouchHeld;
  const sprinting =
    !state.isCrouching &&
    (input.heldKeys.has('ShiftLeft') || input.heldKeys.has('ShiftRight') || gp.sprintHeld);
  const maxSpeed = state.isCrouching ? CROUCH_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;

  if (_moveDir.lengthSq() > 0.001) {
    _moveDir.normalize();
    state.playerVel.x = THREE.MathUtils.damp(state.playerVel.x, _moveDir.x * maxSpeed, 14, dt);
    state.playerVel.z = THREE.MathUtils.damp(state.playerVel.z, _moveDir.z * maxSpeed, 14, dt);

    const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
    let diff = targetYaw - state.playerFacingYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.playerFacingYaw += diff * Math.min(1, dt * 13);
    explorerRoot.rotation.y = state.playerFacingYaw;
  } else {
    state.playerVel.x = THREE.MathUtils.damp(state.playerVel.x, 0, 14, dt);
    state.playerVel.z = THREE.MathUtils.damp(state.playerVel.z, 0, 14, dt);
  }

  state.coyoteTimer = state.onGround ? 0.12 : Math.max(0, state.coyoteTimer - dt);
  if (input.isActionJustPressed('jump') || input.virtualJump || gp.jumpPressed) {
    state.jumpBufferTimer = 0.12;
  } else {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }

  if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
    state.playerVel.y = JUMP_VELOCITY;
    state.onGround = false;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.standingPlatform = null;
    audio.playJump();
  }

  state.playerVel.y = Math.max(-28, state.playerVel.y - GRAVITY * dt);

  state.playerPos.x += state.playerVel.x * dt;
  resolveHorizontalCollisions(state.playerPos, state.playerVel, platforms, resonanceDoors, 'x');
  state.playerPos.z += state.playerVel.z * dt;
  resolveHorizontalCollisions(state.playerPos, state.playerVel, platforms, resonanceDoors, 'z');

  state.playerPos.y += state.playerVel.y * dt;
  state.onGround = false;
  state.standingPlatform = null;

  for (const p of platforms) {
    if (p.crumbleState === 'fallen') continue;
    const halfW = p.def.w * 0.5;
    const halfH = p.def.h * 0.5;
    const halfD = p.def.d * 0.5;

    if (
      Math.abs(state.playerPos.x - p.pos.x) < halfW + PLAYER_RADIUS * 0.85 &&
      Math.abs(state.playerPos.z - p.pos.z) < halfD + PLAYER_RADIUS * 0.85
    ) {
      const topY = p.pos.y + halfH;
      const botY = p.pos.y - halfH;

      if (state.playerVel.y <= 0 && state.playerPos.y <= topY && state.playerPos.y >= topY - 0.85) {
        state.playerPos.y = topY;
        state.playerVel.y = 0;
        state.onGround = true;
        state.standingPlatform = p;
        if (p.def.kind === 'crumbling' && p.crumbleState === 'solid') {
          p.crumbleState = 'shaking';
          p.crumbleTimer = 0.8;
          p.revealEntity.crumbleShaking = true;
        }
      } else if (
        state.playerVel.y > 0 &&
        state.playerPos.y + PLAYER_HEIGHT >= botY &&
        state.playerPos.y < botY
      ) {
        state.playerPos.y = botY - PLAYER_HEIGHT;
        state.playerVel.y = 0;
      }
    }
  }

  let noiseOrigin: THREE.Vector3 | null = null;
  let noiseRadius = 0;

  if (!wasOnGround && state.onGround) {
    audio.playLand();
    if (preLandVy < -11 && !state.isCrouching) {
      noiseOrigin = state.playerPos;
      noiseRadius = 6;
    }
  }

  const horizSpeed = Math.hypot(state.playerVel.x, state.playerVel.z);
  if (state.onGround && horizSpeed > 1.2 && !state.isCrouching) {
    state.footstepTimer -= dt * (sprinting ? 1.4 : 1.0);
    if (state.footstepTimer <= 0) {
      state.footstepTimer = 0.34;
      audio.playFootstep();
      if (sprinting) {
        noiseOrigin = state.playerPos;
        noiseRadius = 6;
      }
    }
  }

  if (state.playerPos.y < -6.2) {
    return { triggeredDeath: true, noiseOrigin, noiseRadius };
  }

  for (const h of hazards) {
    const dx = state.playerPos.x - h.pos.x;
    const dz = state.playerPos.z - h.pos.z;
    const horizDist = Math.hypot(dx, dz);
    const yOverlap =
      state.playerPos.y < h.pos.y + h.def.height && state.playerPos.y + PLAYER_HEIGHT > h.pos.y;
    if (horizDist < h.def.radius + PLAYER_RADIUS * 0.65 && yOverlap) {
      return { triggeredDeath: true, noiseOrigin, noiseRadius };
    }
  }

  if (bossWarden && !bossWarden.defeated && bossWarden.stunTimer <= 0) {
    const dx = state.playerPos.x - bossWarden.pos.x;
    const dz = state.playerPos.z - bossWarden.pos.z;
    const horizDist = Math.hypot(dx, dz);
    const yOverlap =
      state.playerPos.y < bossWarden.pos.y + 1.4 &&
      state.playerPos.y + PLAYER_HEIGHT > bossWarden.pos.y - 1.2;
    if (horizDist < 1.25 + PLAYER_RADIUS * 0.65 && yOverlap) {
      return { triggeredDeath: true, noiseOrigin, noiseRadius };
    }
  }

  return { triggeredDeath: false, noiseOrigin, noiseRadius };
}
