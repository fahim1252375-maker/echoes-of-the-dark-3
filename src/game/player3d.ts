import * as THREE from 'three';

export interface ExplorerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  scarfTail: THREE.Mesh;
  echoCoreRing: THREE.Mesh;
  echoCoreGem: THREE.Mesh;
  echoCoreLight: THREE.PointLight;
  shadowPlane: THREE.Mesh;
  coreMaterial: THREE.MeshStandardMaterial;
}

export function createExplorerModel(contactShadowTex: THREE.Texture): ExplorerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Calibrated PBR materials with >= 0.25 roughness contrast
  const outfitMat = new THREE.MeshStandardMaterial({
    color: 0x162238,
    roughness: 0.78,
    metalness: 0.12,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3986ff,
    roughness: 0.35,
    metalness: 0.65,
    emissive: 0x102a54,
    emissiveIntensity: 0.6,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xff526b,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x380812,
    emissiveIntensity: 0.45,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x26324d,
    roughness: 0.52,
    metalness: 0.48,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x43e8ff,
    roughness: 0.18,
    metalness: 0.15,
    emissive: 0x43e8ff,
    emissiveIntensity: 1.9,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x0b101d,
    roughness: 0.6,
    metalness: 0.2,
  });

  // 1 & 2. Articulated Legs (bottom-center grounded at y = 0)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.66, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.56, 8), outfitMat);
    thigh.position.y = -0.28;
    thigh.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.3), packMat);
    boot.position.set(0, -0.58, 0.04);
    boot.castShadow = true;
    legPivot.add(thigh, boot);
    bodyPivot.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.15);
  const rightLeg = makeLeg(0.15);

  // 3. Torso / Tunic
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.68, 10), outfitMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Belt accent
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 10), trimMat);
  belt.position.y = 0.72;
  bodyPivot.add(belt);

  // 4. Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), packMat);
  backpack.position.set(0, 1.04, -0.24);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  // 5 & 6. Articulated Arms
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.26, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.52, 8), outfitMat);
    sleeve.position.y = -0.24;
    sleeve.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 8), trimMat);
    cuff.position.y = -0.46;
    armPivot.add(sleeve, cuff);
    bodyPivot.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);

  // 7. Hooded Head + Luminous Visor
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), outfitMat);
  hood.castShadow = true;
  const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
  faceMask.position.set(0, -0.02, 0.09);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), coreMat);
  visor.position.set(0, 0.01, 0.21);
  head.add(hood, faceMask, visor);
  bodyPivot.add(head);

  // 8. Distinctive Red Scarf Collar + Trailing Scarf Ribbon
  const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.075, 8, 16), scarfMat);
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.set(0, 1.32, 0.02);
  bodyPivot.add(scarfCollar);

  const scarfTailGeo = new THREE.BoxGeometry(0.16, 0.04, 0.58);
  scarfTailGeo.translate(0, 0, -0.29); // pivot at collar back
  const scarfTail = new THREE.Mesh(scarfTailGeo, scarfMat);
  scarfTail.position.set(0.06, 1.31, -0.2);
  scarfTail.rotation.x = -0.35;
  scarfTail.castShadow = true;
  bodyPivot.add(scarfTail);

  // 9. ECHO CORE Chest Device + PointLight
  const echoCoreRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16), trimMat);
  echoCoreRing.position.set(0, 1.06, 0.24);
  const echoCoreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), coreMat);
  echoCoreGem.position.set(0, 1.06, 0.26);
  const echoCoreLight = new THREE.PointLight(0x43e8ff, 2.2, 8.5, 1.8);
  echoCoreLight.position.set(0, 1.18, 0.35);
  bodyPivot.add(echoCoreRing, echoCoreGem, echoCoreLight);

  // Soft Grounding Contact Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    head,
    scarfTail,
    echoCoreRing,
    echoCoreGem,
    echoCoreLight,
    shadowPlane,
    coreMaterial: coreMat,
  };
}

export function animateExplorer(
  rig: ExplorerRig,
  dt: number,
  time: number,
  speed: number,
  onGround: boolean,
  vy: number,
  pulseFlash: number,
  interactTimer: number,
  respawnAnim: number,
  crouching = false
): void {
  const isMoving = speed > 0.35;
  const strideFreq = speed > 7.5 ? 12.5 : 8.5;
  const strideAmp = isMoving ? Math.min(0.68, speed * 0.085) : 0;

  if (!onGround) {
    // Jump / Airborne pose
    const targetL = vy > 0 ? 0.38 : -0.25;
    const targetR = vy > 0 ? -0.32 : 0.25;
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, targetL, 10, dt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, targetR, 10, dt);
    rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -0.55, 10, dt);
    rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -0.55, 10, dt);
  } else if (isMoving) {
    // Walk / Sprint cycle
    const s = Math.sin(time * strideFreq);
    rig.leftLeg.rotation.x = s * strideAmp;
    rig.rightLeg.rotation.x = -s * strideAmp;
    rig.leftArm.rotation.x = -s * strideAmp * 0.8;
    rig.rightArm.rotation.x = s * strideAmp * 0.8;
    rig.bodyPivot.position.y = Math.abs(Math.cos(time * strideFreq)) * 0.05;
  } else {
    // Idle breathing
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0, 12, dt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0, 12, dt);
    rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, Math.sin(time * 2) * 0.04, 8, dt);
    rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -Math.sin(time * 2) * 0.04, 8, dt);
    rig.bodyPivot.position.y = Math.sin(time * 2.2) * 0.025;
  }

  // Interaction gesture reach
  if (interactTimer > 0) {
    rig.rightArm.rotation.x = -1.25;
  }

  // Trailing red scarf flutter
  const targetScarfPitch = isMoving ? -0.08 + Math.sin(time * 13) * 0.12 : -0.35 + Math.sin(time * 3.1) * 0.06;
  rig.scarfTail.rotation.x = THREE.MathUtils.damp(rig.scarfTail.rotation.x, targetScarfPitch, 10, dt);
  rig.scarfTail.rotation.y = Math.sin(time * (isMoving ? 10 : 2.5)) * (isMoving ? 0.18 : 0.06);

  // Echo Core spin + pulse flare
  rig.echoCoreGem.rotation.y += dt * (2.2 + pulseFlash * 8);
  rig.echoCoreRing.rotation.z -= dt * 1.4;
  rig.coreMaterial.emissiveIntensity = 1.6 + pulseFlash * 3.6;
  rig.echoCoreLight.intensity = 2.0 + pulseFlash * 6.5;

  // Respawn dissolve scale or crouch squat
  if (respawnAnim > 0) {
    const scale = Math.max(0.05, 1 - respawnAnim);
    rig.bodyPivot.scale.set(scale, scale, scale);
    rig.bodyPivot.rotation.y += dt * 12;
  } else {
    const targetScaleY = crouching ? 0.72 : 1.0;
    const targetScaleXZ = crouching ? 1.08 : 1.0;
    rig.bodyPivot.scale.x = THREE.MathUtils.damp(rig.bodyPivot.scale.x, targetScaleXZ, 14, dt);
    rig.bodyPivot.scale.y = THREE.MathUtils.damp(rig.bodyPivot.scale.y, targetScaleY, 14, dt);
    rig.bodyPivot.scale.z = THREE.MathUtils.damp(rig.bodyPivot.scale.z, targetScaleXZ, 14, dt);
    rig.bodyPivot.rotation.y = THREE.MathUtils.damp(rig.bodyPivot.rotation.y, 0, 12, dt);
  }
}
