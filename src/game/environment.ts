import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Level3DDefinition, QualityPreset, StatueDef, WaterfallDef } from './types';
import { createWaterfallTexture } from './materials';

export interface EnvironmentRig {
  root: THREE.Group;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  waterfallTex: THREE.CanvasTexture;
  dustPoints: THREE.Points;
  waterPlane: THREE.Mesh;
  update: (dt: number, time: number, quality: QualityPreset) => void;
  dispose: () => void;
}

export function initSceneLightingAndIBL(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): { keyLight: THREE.DirectionalLight; hemiLight: THREE.HemisphereLight; rimLight: THREE.DirectionalLight } {
  scene.background = new THREE.Color(0x070b16);
  scene.fog = new THREE.FogExp2(0x070b16, 0.02);

  // Zero-dependency Studio Environment Reflection for metallic & crystalline PBR
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  // Balanced 3-point lighting rig (single shadow caster for 60fps performance)
  const hemiLight = new THREE.HemisphereLight(0x3986ff, 0x070b16, 0.55);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.05);
  keyLight.position.set(16, 28, 18);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 90;
  const d = 28;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight(0x9b7bff, 0.45);
  rimLight.position.set(-18, 12, -32);
  scene.add(rimLight);

  return { keyLight, hemiLight, rimLight };
}

export function createAncientStatueMesh(def: StatueDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, def.y, def.z);
  group.rotation.y = def.rotY ?? 0;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1a263f,
    roughness: 0.85,
    metalness: 0.1,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3986ff,
    roughness: 0.35,
    metalness: 0.65,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x43e8ff,
    emissive: 0x43e8ff,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.1,
  });

  // 1. Stepped pedestal
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.8), stoneMat);
  base.position.y = 0.2;
  base.castShadow = true;
  base.receiveShadow = true;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 1.3), trimMat);
  plinth.position.y = 0.72;
  plinth.castShadow = true;

  // 2. Robed torso
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 1.55, 8), stoneMat);
  robe.position.y = 1.8;
  robe.castShadow = true;

  // 3. Hooded head
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), stoneMat);
  head.position.y = 2.75;
  head.castShadow = true;

  // 4. Glowing chest rune
  const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), runeMat);
  rune.position.set(0, 2.05, 0.42);

  // 5. Ancient halo ring behind head
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 24), runeMat);
  halo.position.set(0, 2.75, -0.18);

  group.add(base, plinth, robe, head, rune, halo);
  return group;
}

export function buildCavernEnvironment(
  scene: THREE.Scene,
  level: Level3DDefinition,
  maxAniso: number,
  lights: { keyLight: THREE.DirectionalLight; hemiLight: THREE.HemisphereLight; rimLight: THREE.DirectionalLight }
): EnvironmentRig {
  const root = new THREE.Group();
  scene.add(root);

  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = level.fogDensity;
  }
  lights.hemiLight.groundColor.setHex(level.ambientColor);

  // Reflective Abyssal Water Basin
  const waterGeo = new THREE.PlaneGeometry(240, 240);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x071022,
    roughness: 0.12,
    metalness: 0.88,
    envMapIntensity: 1.25,
  });
  const waterPlane = new THREE.Mesh(waterGeo, waterMat);
  waterPlane.position.set(0, -6.5, -15);
  waterPlane.receiveShadow = true;
  root.add(waterPlane);

  // Instanced Cavern Stalactites & Stalagmites (grounded naturally around the cavern)
  const rockCount = 54;
  const rockGeo = new THREE.ConeGeometry(1.4, 9.5, 6);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x10182a,
    roughness: 0.9,
    metalness: 0.08,
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2;
    const radius = 25 + (i % 5) * 6.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 14;
    const isCeiling = i % 2 === 0;
    const scaleXZ = 0.75 + (i % 7) * 0.22;
    const scaleY = 0.8 + (i % 5) * 0.35;

    dummy.position.set(x, isCeiling ? 18 : -6.2, z);
    dummy.rotation.set(isCeiling ? Math.PI : 0, (i * 1.1) % Math.PI, 0);
    dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);

    tint.setHex(i % 3 === 0 ? 0x132038 : 0x0d1526);
    rocks.setColorAt(i, tint);
  }
  rocks.computeBoundingSphere();
  root.add(rocks);

  // Instanced Glowing Cave Crystals along outer cavern walls
  const crystalCount = 32;
  const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
  crystalGeo.scale(0.65, 2.2, 0.65);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x43e8ff,
    emissive: 0x3986ff,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.2,
  });
  const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, crystalCount);
  for (let i = 0; i < crystalCount; i++) {
    const angle = (i / crystalCount) * Math.PI * 2 + 0.15;
    const radius = 21 + (i % 4) * 4.5;
    dummy.position.set(Math.cos(angle) * radius, -4.8 + (i % 3) * 1.8, Math.sin(angle) * radius - 14);
    dummy.rotation.set((i % 3 - 1) * 0.25, i * 0.7, (i % 2 - 0.5) * 0.3);
    const s = 0.8 + (i % 4) * 0.25;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    crystals.setMatrixAt(i, dummy.matrix);
    tint.setHex(i % 3 === 0 ? 0x9b7bff : 0x43e8ff);
    crystals.setColorAt(i, tint);
  }
  crystals.computeBoundingSphere();
  root.add(crystals);

  // Decorative Temple Pillars framing solid platforms
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x16223a, roughness: 0.8, metalness: 0.15 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2a3b5e, roughness: 0.5, metalness: 0.4 });
  level.platforms
    .filter((p) => p.kind === 'solid' && p.w >= 9)
    .forEach((p) => {
      const offsets = [-p.w * 0.42, p.w * 0.42];
      offsets.forEach((ox) => {
        const pillarGroup = new THREE.Group();
        pillarGroup.position.set(p.x + ox, p.y + p.h * 0.5, p.z);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.6, 8), pillarMat);
        shaft.position.y = 2.3;
        shaft.castShadow = true;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.95), capMat);
        cap.position.y = 4.65;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.0), capMat);
        base.position.y = 0.175;
        pillarGroup.add(shaft, cap, base);
        root.add(pillarGroup);
      });
    });

  // Underground Waterfalls
  const waterfallTex = createWaterfallTexture(maxAniso);
  const wfMat = new THREE.MeshBasicMaterial({
    map: waterfallTex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  level.waterfalls.forEach((wf: WaterfallDef) => {
    const wfMesh = new THREE.Mesh(new THREE.PlaneGeometry(wf.width, wf.height), wfMat);
    wfMesh.position.set(wf.x, wf.y, wf.z);
    wfMesh.rotation.y = wf.rotY ?? 0;
    root.add(wfMesh);
  });

  // Atmospheric Cave Dust Particles
  const dustCount = 160;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 65;
    dustPositions[i * 3 + 1] = -3 + Math.random() * 20;
    dustPositions[i * 3 + 2] = 24 - Math.random() * 85;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xa4b0c6,
    size: 0.14,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  root.add(dustPoints);

  return {
    root,
    ...lights,
    waterfallTex,
    dustPoints,
    waterPlane,
    update: (dt: number, time: number, quality: QualityPreset) => {
      waterfallTex.offset.y -= dt * 0.85;
      dustPoints.visible = quality !== 'LOW';
      dustPoints.rotation.y = Math.sin(time * 0.08) * 0.04;
      dustPoints.position.y = Math.sin(time * 0.5) * 0.35;
    },
    dispose: () => {
      scene.remove(root);
      rockGeo.dispose();
      rockMat.dispose();
      crystalGeo.dispose();
      crystalMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      waterfallTex.dispose();
      wfMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      pillarMat.dispose();
      capMat.dispose();
    },
  };
}
