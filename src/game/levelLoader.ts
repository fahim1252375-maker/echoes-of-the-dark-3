import * as THREE from 'three';
import { Level3DDefinition } from './types';
import {
  RESONANCE_HEX,
  RuntimeBossWarden,
  RuntimeCheckpoint,
  RuntimeExit,
  RuntimeFragment,
  RuntimeGlyphPad,
  RuntimeHazard,
  RuntimeLevelEntities,
  RuntimeMechanism,
  RuntimeMirrorCrystal,
  RuntimePlatform,
  RuntimeResonanceDoor,
} from './engineTypes';
import {
  buildCavernEnvironment,
  createAncientStatueMesh,
  EnvironmentRig,
} from './environment';
import { RevealableEntity } from './echoPulse3d';

const _upAxis = new THREE.Vector3(0, 1, 0);

export function disposeLevelObjects(
  levelGroup: THREE.Group,
  envRig: EnvironmentRig | null
): void {
  levelGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
  while (levelGroup.children.length > 0) {
    levelGroup.remove(levelGroup.children[0]);
  }
  envRig?.dispose();
}

export function buildLevelScene(params: {
  scene: THREE.Scene;
  levelGroup: THREE.Group;
  def: Level3DDefinition;
  maxAnisotropy: number;
  stoneTex: THREE.CanvasTexture;
  lights: {
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    rimLight: THREE.DirectionalLight;
  };
  persistentFragments: Set<string>;
}): { entities: RuntimeLevelEntities; envRig: EnvironmentRig } {
  const { scene, levelGroup, def, maxAnisotropy, stoneTex, lights, persistentFragments } = params;

  const envRig = buildCavernEnvironment(scene, def, maxAnisotropy, lights);

  const platforms: RuntimePlatform[] = [];
  const hazards: RuntimeHazard[] = [];
  const glyphPads: RuntimeGlyphPad[] = [];
  const resonanceDoors: RuntimeResonanceDoor[] = [];
  const mirrorCrystals: RuntimeMirrorCrystal[] = [];
  const fragments: RuntimeFragment[] = [];
  const mechanisms: RuntimeMechanism[] = [];
  const checkpoints: RuntimeCheckpoint[] = [];
  const revealables: RevealableEntity[] = [];

  // Platforms
  for (const p of def.platforms) {
    const isSolid = p.kind === 'solid';
    const isSecret = p.kind === 'secret';
    const isMoving = p.kind === 'moving';
    const isCrumbling = p.kind === 'crumbling';

    const baseOpacity = isSolid ? 1.0 : isCrumbling ? 0.55 : isMoving ? 0.22 : 0.05;
    const color = isSolid
      ? 0x18243c
      : isCrumbling
        ? 0x3b2a1e
        : isSecret
          ? 0x2e1f5e
          : isMoving
            ? 0x1e2c52
            : 0x102a4a;
    const emissive = isSolid
      ? 0x060b16
      : isCrumbling
        ? 0x88521a
        : isSecret
          ? 0x9b7bff
          : isMoving
            ? 0x3986ff
            : 0x43e8ff;

    const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
    const texClone = stoneTex.clone();
    texClone.needsUpdate = true;
    texClone.repeat.set(Math.max(1, p.w / 3), Math.max(1, p.d / 3));

    const mat = new THREE.MeshStandardMaterial({
      color,
      map: isSolid || isCrumbling ? texClone : null,
      roughness: isSolid ? 0.82 : isCrumbling ? 0.88 : 0.35,
      metalness: isSolid ? 0.12 : 0.45,
      emissive,
      emissiveIntensity: isSolid ? 0.2 : 0.35,
      transparent: !isSolid,
      opacity: baseOpacity,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.castShadow = isSolid;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geo);
    const edgeColor = isCrumbling ? 0xffc857 : isSecret ? 0x9b7bff : isMoving ? 0x3986ff : 0x43e8ff;
    const lineMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: isSolid ? 0.22 : isCrumbling ? 0.5 : 0.14,
    });
    const outline = new THREE.LineSegments(edges, lineMat);
    mesh.add(outline);
    levelGroup.add(mesh);

    const revealEntity: RevealableEntity = {
      id: p.id,
      position: mesh.position,
      halfExtents: new THREE.Vector3(p.w * 0.5, p.h * 0.5, p.d * 0.5),
      baseOpacity,
      revealTimer: 0,
      currentReveal: baseOpacity,
      meshes: [mesh],
      outline,
      isSecret,
      isCrumbling,
    };
    if (!isSolid) {
      revealables.push(revealEntity);
    }

    platforms.push({
      def: p,
      mesh,
      outline,
      pos: mesh.position,
      prevPos: new THREE.Vector3(p.x, p.y, p.z),
      delta: new THREE.Vector3(),
      revealEntity,
      crumbleState: 'solid',
      crumbleTimer: 0,
    });
  }

  // Hazards
  for (const h of def.hazards) {
    const group = new THREE.Group();
    group.position.set(h.x, h.y, h.z);
    const meshes: THREE.Mesh[] = [];
    let droneMat: THREE.MeshStandardMaterial | undefined;

    if (h.kind === 'spikes') {
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0xff526b,
        emissive: 0xff2846,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.25,
        transparent: true,
        opacity: 0.22,
      });
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const rad = i === 0 ? 0 : h.radius * 0.45;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, h.height * (i === 0 ? 1.05 : 0.8), 5),
          spikeMat
        );
        cone.position.set(Math.cos(ang) * rad, h.height * 0.45, Math.sin(ang) * rad);
        group.add(cone);
        meshes.push(cone);
      }
    } else {
      droneMat = new THREE.MeshStandardMaterial({
        color: h.soundSensitive ? 0xff7b43 : 0xff526b,
        emissive: h.soundSensitive ? 0xff4518 : 0xff3b58,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.6,
        transparent: true,
        opacity: h.soundSensitive ? 0.4 : 0.25,
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(h.radius * 0.65, 0), droneMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h.radius * 0.9, 0.08, 6, 18), droneMat);
      ring.rotation.x = Math.PI / 2;
      group.add(core, ring);
      meshes.push(core, ring);
    }

    levelGroup.add(group);
    const rev: RevealableEntity = {
      id: h.id,
      position: group.position,
      halfExtents: new THREE.Vector3(h.radius, h.height * 0.5, h.radius),
      baseOpacity: h.soundSensitive ? 0.35 : 0.2,
      revealTimer: 0,
      currentReveal: h.soundSensitive ? 0.35 : 0.2,
      meshes,
      isHazard: true,
    };
    revealables.push(rev);
    hazards.push({
      def: h,
      group,
      pos: group.position,
      revealEntity: rev,
      patrolPos: new THREE.Vector3(h.x, h.y, h.z),
      alertTimer: 0,
      investigateTarget: new THREE.Vector3(h.x, h.y, h.z),
      droneMat,
    });
  }

  // Resonance Doors
  for (const d of def.resonanceDoors ?? []) {
    const hex = RESONANCE_HEX[d.color];
    const doorMat = new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: 1.0,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.58,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.d), doorMat);
    mesh.position.set(d.x, d.y, d.z);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.95 })
    );
    mesh.add(edges);
    levelGroup.add(mesh);
    resonanceDoors.push({ def: d, mesh, open: false, openProgress: 0 });
  }

  // Glyph Pads
  for (const gp of def.glyphPads ?? []) {
    const hex = RESONANCE_HEX[gp.color];
    const group = new THREE.Group();
    group.position.set(gp.x, gp.y + 0.04, gp.z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0x162238, roughness: 0.65, metalness: 0.35 })
    );
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.08, 6, 16),
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.06;
    group.add(base, ringMesh);
    levelGroup.add(group);
    glyphPads.push({ def: gp, group, ringMesh, activated: false });
  }

  // Mirror Crystals
  for (const mc of def.mirrorCrystals ?? []) {
    const group = new THREE.Group();
    group.position.set(mc.x, mc.y, mc.z);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({
        color: 0xbef8ff,
        emissive: 0x43e8ff,
        emissiveIntensity: 1.35,
        roughness: 0.12,
        metalness: 0.8,
      })
    );
    const bDir = new THREE.Vector3(mc.dirX, mc.dirY, mc.dirZ).normalize();
    const beamGeo = new THREE.CylinderGeometry(0.14, 0.14, mc.length, 8);
    beamGeo.translate(0, mc.length * 0.5, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x9ef6ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.quaternion.setFromUnitVectors(_upAxis, bDir);
    beamMesh.visible = false;

    group.add(crystal, beamMesh);
    levelGroup.add(group);
    mirrorCrystals.push({
      def: mc,
      group,
      crystal,
      beamMesh,
      beamDir: bDir,
      beamTimer: 0,
      beamCharged: false,
      beamHitWarden: false,
    });
  }

  // Echo Fragments
  for (const f of def.fragments) {
    const already = !def.isTrial && persistentFragments.has(f.id);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0xffc857,
      emissive: 0xffa822,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), fragMat);
    mesh.scale.set(0.85, 1.35, 0.85);
    mesh.position.set(f.x, f.y, f.z);
    mesh.visible = !already;

    const light = new THREE.PointLight(0xffc857, already ? 0 : 2.5, 6.5, 1.6);
    light.position.copy(mesh.position);
    light.visible = !already;

    levelGroup.add(mesh, light);
    fragments.push({ def: f, mesh, light, collected: already });
  }

  // Resonance Mechanisms
  for (const m of def.mechanisms) {
    const group = new THREE.Group();
    group.position.set(m.x, m.y, m.z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x1c2842, roughness: 0.7, metalness: 0.25 })
    );
    base.position.y = 0.55;
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0x9b7bff,
        emissive: 0x9b7bff,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      })
    );
    orb.position.y = 1.5;
    const light = new THREE.PointLight(0x9b7bff, 2.2, 8, 1.6);
    light.position.y = 1.7;
    group.add(base, orb, light);
    levelGroup.add(group);
    mechanisms.push({ def: m, group, orb, light, activated: false });
  }

  // Checkpoints
  for (const cp of def.checkpoints) {
    const group = new THREE.Group();
    group.position.set(cp.x, cp.y, cp.z);
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.25, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2640, roughness: 0.75, metalness: 0.2 })
    );
    plinth.position.y = 0.125;
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0x3986ff,
        emissive: 0x3986ff,
        emissiveIntensity: 0.8,
        roughness: 0.25,
      })
    );
    crystal.position.y = 0.75;
    group.add(plinth, crystal);
    levelGroup.add(group);
    checkpoints.push({ def: cp, group, crystal, activated: false });
  }

  // Ancient Statues
  for (const st of def.statues) {
    levelGroup.add(createAncientStatueMesh(st));
  }

  // Exit Portal
  const exitGroup = new THREE.Group();
  exitGroup.position.set(def.exit.x, def.exit.y, def.exit.z);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1b2944,
    roughness: 0.65,
    metalness: 0.35,
  });
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.7), frameMat);
  leftPillar.position.set(-1.6, 2.1, 0);
  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.7), frameMat);
  rightPillar.position.set(1.6, 2.1, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 0.9), frameMat);
  lintel.position.set(0, 4.2, 0);

  const unlockedInitially = def.exit.requiredMechanisms === 0 && !def.bossWarden;
  const portalMat = new THREE.MeshStandardMaterial({
    color: unlockedInitially ? 0x43e8ff : 0x9b7bff,
    emissive: unlockedInitially ? 0x43e8ff : 0x523699,
    emissiveIntensity: unlockedInitially ? 2.0 : 0.7,
    transparent: true,
    opacity: unlockedInitially ? 0.85 : 0.38,
    side: THREE.DoubleSide,
  });
  const portalMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.8), portalMat);
  portalMesh.position.set(0, 1.95, 0);
  const exitLight = new THREE.PointLight(unlockedInitially ? 0x43e8ff : 0x9b7bff, 3.5, 14, 1.5);
  exitLight.position.set(0, 2.2, 0.8);

  exitGroup.add(leftPillar, rightPillar, lintel, portalMesh, exitLight);
  levelGroup.add(exitGroup);
  const exitObj: RuntimeExit = {
    group: exitGroup,
    portalMesh,
    light: exitLight,
    unlocked: unlockedInitially,
    pos: exitGroup.position,
    required: def.exit.requiredMechanisms,
  };

  // Optional Boss: The Silent Warden
  let bossWarden: RuntimeBossWarden | null = null;
  if (def.bossWarden) {
    const bw = def.bossWarden;
    const bwGroup = new THREE.Group();
    bwGroup.position.set(bw.x, bw.y, bw.z);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff2e4c,
      emissive: 0xcc1436,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.65,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), coreMat);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff526b,
      emissive: 0xff2846,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.5,
    });
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.085, 8, 28), ringMat);
    ringMesh.rotation.x = Math.PI / 2;

    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      emissive: 0x9b7bff,
      emissiveIntensity: 0.6,
      roughness: 0.35,
      metalness: 0.7,
    });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 4), shardMat);
      shard.position.set(Math.cos(ang) * 1.15, 0.25, Math.sin(ang) * 1.15);
      shard.rotation.z = Math.cos(ang) * -0.45;
      shard.rotation.x = Math.sin(ang) * 0.45;
      bwGroup.add(shard);
    }

    const bwLight = new THREE.PointLight(0xff2e4c, 3.4, 15, 1.5);
    bwLight.position.set(0, 0.4, 0);
    bwGroup.add(core, ringMesh, bwLight);
    levelGroup.add(bwGroup);

    bossWarden = {
      def: bw,
      group: bwGroup,
      pos: bwGroup.position,
      coreMat,
      ringMesh,
      ringMat,
      light: bwLight,
      stuns: 0,
      maxStuns: bw.maxStuns,
      stunTimer: 0,
      alertTimer: 0,
      frozenByCrouch: false,
      investigateTarget: new THREE.Vector3(bw.arenaCenterX, bw.y, bw.arenaCenterZ),
      defeated: false,
      defeatAnim: 0,
    };
  }

  return {
    entities: {
      platforms,
      hazards,
      glyphPads,
      resonanceDoors,
      mirrorCrystals,
      fragments,
      mechanisms,
      checkpoints,
      statues: def.statues,
      revealables,
      exitObj,
      bossWarden,
    },
    envRig,
  };
}
