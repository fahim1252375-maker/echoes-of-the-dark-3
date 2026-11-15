import * as THREE from 'three';
import { Audio3DEngine } from './audio3d';
import { EchoPulse3DSystem } from './echoPulse3d';
import { RuntimeLevelEntities } from './engineTypes';

const _beamDir = new THREE.Vector3();
const _segProj = new THREE.Vector3();

export type SubtitleEmitter = (label: string, origin?: THREE.Vector3) => void;

export function emitSoundNoise(
  entities: RuntimeLevelEntities,
  origin: THREE.Vector3,
  radius: number,
  onNewAlert: () => void,
  audio: Audio3DEngine,
  emitSubtitle: SubtitleEmitter
): void {
  for (const h of entities.hazards) {
    if (h.def.kind !== 'drone' || !h.def.soundSensitive) continue;
    const dist = h.pos.distanceTo(origin);
    if (dist <= radius) {
      if (h.alertTimer <= 0) {
        onNewAlert();
        audio.playDroneAlert();
        emitSubtitle('Drone Alerted', h.pos);
      }
      h.alertTimer = 3.5;
      h.investigateTarget.copy(origin);
    }
  }

  const bw = entities.bossWarden;
  if (bw && !bw.defeated && bw.stunTimer <= 0) {
    const dist = bw.pos.distanceTo(origin);
    if (dist <= radius) {
      if (bw.alertTimer <= 0) {
        audio.playDroneAlert();
        emitSubtitle('Silent Warden Drawn to Sound', bw.pos);
      }
      bw.alertTimer = 4.2;
      bw.investigateTarget.copy(origin);
    }
  }
}

export function updateMirrorCrystals(
  entities: RuntimeLevelEntities,
  sonar: EchoPulse3DSystem,
  dt: number,
  audio: Audio3DEngine,
  emitSubtitle: SubtitleEmitter,
  onWardenStunned?: (stuns: number, maxStuns: number, defeated: boolean) => void
): void {
  for (const mc of entities.mirrorCrystals) {
    mc.crystal.rotation.y += dt * 1.4;

    for (const w of sonar.waves) {
      if (!w.active || w.isAmbient || w.hitMirrors.has(mc.def.id)) continue;
      const dist = w.origin.distanceTo(mc.group.position);
      if (dist <= w.radius && dist >= Math.max(0, w.radius - 3.6)) {
        w.hitMirrors.add(mc.def.id);
        const isCharged = w.chargeRatio >= 0.25;
        mc.beamTimer = isCharged ? 1.45 : 1.2;
        mc.beamCharged = isCharged;
        mc.beamHitWarden = false;
        audio.playMirrorBeam();
        emitSubtitle(isCharged ? 'Charged Mirror Beam' : 'Mirror Beam Chime', mc.group.position);
        sonar.spawnSparks(mc.group.position, isCharged ? 24 : 16);
      }
    }

    if (mc.beamTimer > 0) {
      mc.beamTimer = Math.max(0, mc.beamTimer - dt);
      mc.beamMesh.visible = true;
      const bMat = mc.beamMesh.material as THREE.MeshBasicMaterial;
      bMat.color.setHex(mc.beamCharged ? 0xffc857 : 0x9ef6ff);
      bMat.opacity = Math.min(0.95, (mc.beamTimer / 1.2) * (mc.beamCharged ? 0.98 : 0.9));

      _beamDir.copy(mc.beamDir);
      for (const ent of entities.revealables) {
        const t = Math.max(
          0,
          Math.min(
            mc.def.length,
            (ent.position.x - mc.group.position.x) * _beamDir.x +
              (ent.position.y - mc.group.position.y) * _beamDir.y +
              (ent.position.z - mc.group.position.z) * _beamDir.z
          )
        );
        _segProj.copy(mc.group.position).addScaledVector(_beamDir, t);
        const dx = Math.max(0, Math.abs(_segProj.x - ent.position.x) - ent.halfExtents.x);
        const dy = Math.max(0, Math.abs(_segProj.y - ent.position.y) - ent.halfExtents.y);
        const dz = Math.max(0, Math.abs(_segProj.z - ent.position.z) - ent.halfExtents.z);
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= 3.0) {
          ent.revealTimer = Math.max(ent.revealTimer, 3.6);
        }
      }

      // Check if charged mirror beam strikes the Silent Warden
      const bw = entities.bossWarden;
      if (
        bw &&
        mc.beamCharged &&
        !mc.beamHitWarden &&
        !bw.defeated &&
        bw.stunTimer <= 0
      ) {
        const tWarden = Math.max(
          0,
          Math.min(
            mc.def.length,
            (bw.pos.x - mc.group.position.x) * _beamDir.x +
              (bw.pos.y - mc.group.position.y) * _beamDir.y +
              (bw.pos.z - mc.group.position.z) * _beamDir.z
          )
        );
        _segProj.copy(mc.group.position).addScaledVector(_beamDir, tWarden);
        const distToWarden = _segProj.distanceTo(bw.pos);
        if (distToWarden <= 2.4) {
          mc.beamHitWarden = true;
          bw.stuns += 1;
          bw.stunTimer = 3.0;
          bw.alertTimer = 0;
          bw.frozenByCrouch = false;
          sonar.spawnSparks(bw.pos, 34);
          audio.playCrystalCollect();
          emitSubtitle(`Warden Stunned (${bw.stuns}/${bw.maxStuns})`, bw.pos);
          if (bw.stuns >= bw.maxStuns) {
            bw.defeated = true;
            bw.defeatAnim = 1.0;
          }
          onWardenStunned?.(bw.stuns, bw.maxStuns, bw.defeated);
        }
      }
    } else {
      mc.beamMesh.visible = false;
    }
  }
}

export function updateBossWarden(
  entities: RuntimeLevelEntities,
  dt: number,
  worldTime: number,
  isCrouching: boolean
): void {
  const bw = entities.bossWarden;
  if (!bw) return;

  if (bw.defeated) {
    if (bw.defeatAnim > 0) {
      bw.defeatAnim = Math.max(0, bw.defeatAnim - dt * 0.9);
      const scale = Math.max(0.01, bw.defeatAnim);
      bw.group.scale.setScalar(scale);
      bw.pos.y = bw.def.y - (1 - bw.defeatAnim) * 1.4;
      bw.group.rotation.y += dt * 7;
      bw.light.intensity = 3.4 * bw.defeatAnim;
      if (bw.defeatAnim <= 0) {
        bw.group.visible = false;
        bw.light.visible = false;
      }
    }
    return;
  }

  if (bw.stunTimer > 0) {
    bw.stunTimer = Math.max(0, bw.stunTimer - dt);
    bw.frozenByCrouch = false;
    bw.coreMat.color.setHex(0x43e8ff);
    bw.coreMat.emissive.setHex(0xffc857);
    bw.coreMat.emissiveIntensity = 1.8 + Math.sin(worldTime * 18) * 0.5;
    bw.ringMat.color.setHex(0x43e8ff);
    bw.ringMat.emissive.setHex(0x43e8ff);
    bw.light.color.setHex(0x43e8ff);
    bw.group.rotation.y += dt * 0.6;
    bw.pos.y = bw.def.y - 0.15 + Math.sin(worldTime * 16) * 0.08;
    return;
  }

  bw.frozenByCrouch = isCrouching;
  if (bw.frozenByCrouch) {
    // Player crouching freezes the Silent Warden completely in place
    bw.coreMat.color.setHex(0x6c88ad);
    bw.coreMat.emissive.setHex(0x3986ff);
    bw.coreMat.emissiveIntensity = 0.65;
    bw.ringMat.color.setHex(0x6c88ad);
    bw.ringMat.emissive.setHex(0x3986ff);
    bw.light.color.setHex(0x3986ff);
    return;
  }

  // Active movement: pursue recent sound or patrol center orbit
  const minX = bw.def.arenaCenterX - bw.def.arenaHalfWidth;
  const maxX = bw.def.arenaCenterX + bw.def.arenaHalfWidth;
  const minZ = bw.def.arenaCenterZ - bw.def.arenaHalfDepth;
  const maxZ = bw.def.arenaCenterZ + bw.def.arenaHalfDepth;

  if (bw.alertTimer > 0) {
    bw.alertTimer = Math.max(0, bw.alertTimer - dt);
    const targetX = THREE.MathUtils.clamp(bw.investigateTarget.x, minX, maxX);
    const targetZ = THREE.MathUtils.clamp(bw.investigateTarget.z, minZ, maxZ);
    const dx = targetX - bw.pos.x;
    const dz = targetZ - bw.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.15) {
      const speed = 3.8;
      const step = Math.min(dist, speed * dt);
      bw.pos.x += (dx / dist) * step;
      bw.pos.z += (dz / dist) * step;
    }
    bw.coreMat.color.setHex(0xff2e4c);
    bw.coreMat.emissive.setHex(0xff1e38);
    bw.coreMat.emissiveIntensity = 1.9;
    bw.ringMat.color.setHex(0xff526b);
    bw.ringMat.emissive.setHex(0xff2846);
    bw.light.color.setHex(0xff2e4c);
    bw.group.rotation.y += dt * 4.5;
  } else {
    const orbitX = bw.def.arenaCenterX + Math.cos(worldTime * 0.75) * bw.def.patrolRadius;
    const orbitZ = bw.def.arenaCenterZ + Math.sin(worldTime * 0.75) * (bw.def.patrolRadius * 0.75);
    bw.pos.x = THREE.MathUtils.lerp(bw.pos.x, orbitX, Math.min(1, dt * 2.4));
    bw.pos.z = THREE.MathUtils.lerp(bw.pos.z, orbitZ, Math.min(1, dt * 2.4));
    bw.coreMat.color.setHex(0xff2e4c);
    bw.coreMat.emissive.setHex(0xcc1436);
    bw.coreMat.emissiveIntensity = 1.35;
    bw.ringMat.color.setHex(0xff526b);
    bw.ringMat.emissive.setHex(0xff2846);
    bw.light.color.setHex(0xff2e4c);
    bw.group.rotation.y += dt * 2.2;
  }

  bw.pos.y = bw.def.y + Math.sin(worldTime * 2.8) * 0.18;
  bw.ringMesh.rotation.z += dt * 1.4;
}

export function updateResonanceDoors(entities: RuntimeLevelEntities, dt: number): void {
  for (const d of entities.resonanceDoors) {
    if (d.open && d.openProgress < 1) {
      d.openProgress = Math.min(1, d.openProgress + dt * 2.2);
      d.mesh.position.y = d.def.y + d.openProgress * (d.def.h + 0.4);
      const mat = d.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, (1 - d.openProgress) * 0.58);
      if (d.openProgress >= 1) {
        d.mesh.visible = false;
      }
    }
  }
}

export function updateMovingPlatformsAndDrones(
  entities: RuntimeLevelEntities,
  dt: number,
  worldTime: number,
  audio: Audio3DEngine,
  sonar: EchoPulse3DSystem,
  emitSubtitle: SubtitleEmitter
): void {
  for (const p of entities.platforms) {
    if (p.def.kind === 'crumbling') {
      if (p.crumbleState === 'shaking') {
        p.crumbleTimer -= dt;
        p.pos.x = p.def.x + Math.sin(worldTime * 48) * 0.08;
        p.pos.z = p.def.z + Math.cos(worldTime * 42) * 0.08;
        if (p.crumbleTimer <= 0) {
          p.crumbleState = 'fallen';
          p.crumbleTimer = 4.0;
          p.mesh.visible = false;
          p.revealEntity.crumbleShaking = false;
          audio.playCrumble();
          emitSubtitle('Stone Crumble', p.pos);
          sonar.spawnSparks(p.pos, 14);
        }
      } else if (p.crumbleState === 'fallen') {
        p.crumbleTimer -= dt;
        if (p.crumbleTimer <= 0) {
          p.crumbleState = 'solid';
          p.crumbleTimer = 0;
          p.pos.set(p.def.x, p.def.y, p.def.z);
          p.mesh.visible = true;
        }
      }
      continue;
    }

    if (p.def.kind !== 'moving') continue;
    p.prevPos.copy(p.pos);
    const range = p.def.moveRange ?? 3;
    const speed = p.def.moveSpeed ?? 1.4;
    const phase = p.def.movePhase ?? 0;
    const offset = Math.sin(worldTime * speed + phase) * range;
    p.pos.x = p.def.x + (p.def.moveAxis === 'x' ? offset : 0);
    p.pos.y = p.def.y + (p.def.moveAxis === 'y' ? offset : 0);
    p.pos.z = p.def.z + (p.def.moveAxis === 'z' ? offset : 0);
    p.delta.subVectors(p.pos, p.prevPos);
  }

  for (const h of entities.hazards) {
    if (h.def.kind !== 'drone') continue;
    const range = h.def.moveRange ?? 3;
    const speed = h.def.moveSpeed ?? 2;
    const phase = h.def.movePhase ?? 0;
    const offset = Math.sin(worldTime * speed + phase) * range;
    h.patrolPos.set(
      h.def.x + (h.def.moveAxis === 'x' ? offset : 0),
      h.def.y + (h.def.moveAxis === 'y' ? offset : 0),
      h.def.z + (h.def.moveAxis === 'z' ? offset : 0)
    );

    if (h.alertTimer > 0) {
      h.alertTimer = Math.max(0, h.alertTimer - dt);
      const chaseStep = Math.min(1, dt * 2.6);
      const targetX = THREE.MathUtils.clamp(h.investigateTarget.x, h.def.x - 5.5, h.def.x + 5.5);
      const targetZ = THREE.MathUtils.clamp(h.investigateTarget.z, h.def.z - 5.5, h.def.z + 5.5);
      h.pos.x = THREE.MathUtils.lerp(h.pos.x, targetX, chaseStep);
      h.pos.z = THREE.MathUtils.lerp(h.pos.z, targetZ, chaseStep);
      h.pos.y = h.patrolPos.y;
      if (h.droneMat) {
        h.droneMat.color.setHex(0xff1e38);
        h.droneMat.emissive.setHex(0xff1e38);
        h.droneMat.emissiveIntensity = 1.8;
      }
    } else {
      h.pos.lerp(h.patrolPos, Math.min(1, dt * 4));
      if (h.droneMat && h.def.soundSensitive) {
        h.droneMat.color.setHex(0xff7b43);
        h.droneMat.emissive.setHex(0xff4518);
        h.droneMat.emissiveIntensity = 0.9;
      }
    }
    h.group.rotation.y += dt * (h.alertTimer > 0 ? 6.0 : 3.0);
  }
}

export function animateLevelProps(
  entities: RuntimeLevelEntities,
  dt: number,
  worldTime: number
): void {
  for (const f of entities.fragments) {
    if (f.collected) continue;
    f.mesh.rotation.y += dt * 2.1;
    f.mesh.position.y = f.def.y + Math.sin(worldTime * 2.6 + f.def.x) * 0.22;
  }
  for (const m of entities.mechanisms) {
    m.orb.rotation.y += dt * (m.activated ? 3.5 : 1.2);
    m.orb.position.y = 1.5 + Math.sin(worldTime * 2.4) * 0.1;
  }
  for (const cp of entities.checkpoints) {
    cp.crystal.rotation.y += dt * (cp.activated ? 2.8 : 1.0);
  }
  if (entities.exitObj && entities.exitObj.unlocked) {
    entities.exitObj.light.intensity = 3.6 + Math.sin(worldTime * 4) * 0.7;
  }
}
