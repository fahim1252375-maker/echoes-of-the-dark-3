import * as THREE from 'three';

export const SONAR_MAX_RADIUS = 20.5;
export const SONAR_SPEED = 24.0; // units / sec
export const SONAR_HOLD_TIME = 2.55; // seconds
export const SONAR_FADE_TIME = 0.95; // seconds
export const SONAR_COOLDOWN = 1.45; // seconds

export interface ActiveWave3D {
  active: boolean;
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  speed: number;
  ringMesh: THREE.Mesh;
  domeMesh: THREE.Mesh;
  flashLight: THREE.PointLight;
  isAmbient: boolean;
  chargeRatio: number;
  hitMirrors: Set<string>;
}

export interface RevealableEntity {
  id: string;
  position: THREE.Vector3;
  halfExtents: THREE.Vector3;
  baseOpacity: number;
  revealTimer: number;
  currentReveal: number;
  meshes: THREE.Mesh[];
  outline?: THREE.LineSegments;
  isHazard?: boolean;
  isSecret?: boolean;
  isCrumbling?: boolean;
  crumbleShaking?: boolean;
}

const WAVE_DOME_VERT = `
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WAVE_DOME_FRAG = `
  uniform float uAlpha;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vLocalPos;
  void main() {
    float heightFade = 1.0 - abs(vLocalPos.y);
    float fresnel = pow(max(0.0, heightFade), 1.6);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, abs(vLocalPos.y)));
    gl_FragColor = vec4(col, uAlpha * (0.28 + 0.35 * fresnel));
  }
`;

export class EchoPulse3DSystem {
  public waves: ActiveWave3D[] = [];
  public cooldown = 0;
  private cooldownMax = SONAR_COOLDOWN;
  public pulseFlash = 0;
  private group = new THREE.Group();

  // 3D Spark particle pool
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private sparkLives: Float32Array;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPoints: THREE.Points;
  private sparkCursor = 0;
  private readonly MAX_SPARKS = 180;

  private primaryHex = 0x43e8ff;
  private chargedHex = 0x9b7bff;
  private highContrast = false;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(1, 0.045, 8, 48);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.primaryHex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.visible = false;

      const domeGeo = new THREE.SphereGeometry(1, 28, 16);
      const domeMat = new THREE.ShaderMaterial({
        vertexShader: WAVE_DOME_VERT,
        fragmentShader: WAVE_DOME_FRAG,
        uniforms: {
          uAlpha: { value: 0 },
          uColorA: { value: new THREE.Color(this.primaryHex) },
          uColorB: { value: new THREE.Color(this.chargedHex) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const domeMesh = new THREE.Mesh(domeGeo, domeMat);
      domeMesh.visible = false;

      const flashLight = new THREE.PointLight(0x43e8ff, 0, 34, 1.5);
      flashLight.visible = false;

      this.group.add(ringMesh, domeMesh, flashLight);

      this.waves.push({
        active: false,
        origin: new THREE.Vector3(),
        radius: 0,
        maxRadius: SONAR_MAX_RADIUS,
        speed: SONAR_SPEED,
        ringMesh,
        domeMesh,
        flashLight,
        isAmbient: false,
        chargeRatio: 0,
        hitMirrors: new Set<string>(),
      });
    }

    // Initialize spark points pool
    this.sparkPositions = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkVelocities = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkLives = new Float32Array(this.MAX_SPARKS);
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x43e8ff,
      size: 0.18,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, sparkMat);
    this.sparkPoints.frustumCulled = false;
    this.group.add(this.sparkPoints);
  }

  public reset(): void {
    this.cooldown = 0;
    this.cooldownMax = SONAR_COOLDOWN;
    this.pulseFlash = 0;
    for (const w of this.waves) {
      w.active = false;
      w.hitMirrors.clear();
      w.ringMesh.visible = false;
      w.domeMesh.visible = false;
      w.flashLight.visible = false;
    }
    this.sparkLives.fill(0);
    for (let i = 0; i < this.sparkPositions.length; i++) {
      this.sparkPositions[i] = 9999;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  public canEmit(): boolean {
    return this.cooldown <= 0;
  }

  public getCooldownRatio(): number {
    return this.cooldown <= 0 ? 0 : Math.min(1, this.cooldown / Math.max(0.1, this.cooldownMax));
  }

  public setPalette(primaryHex: number, chargedHex: number, highContrast: boolean): void {
    this.primaryHex = primaryHex;
    this.chargedHex = chargedHex;
    this.highContrast = highContrast;
    (this.sparkPoints.material as THREE.PointsMaterial).color.setHex(primaryHex);
    for (const w of this.waves) {
      const u = (w.domeMesh.material as THREE.ShaderMaterial).uniforms;
      u.uColorA.value.setHex(primaryHex);
      u.uColorB.value.setHex(chargedHex);
    }
  }

  public emit(
    origin: THREE.Vector3,
    isAmbient = false,
    sparkCount = 26,
    chargeRatio = 0
  ): boolean {
    if (!isAmbient && !this.canEmit()) return false;

    const clampedCharge = Math.max(0, Math.min(1, chargeRatio));
    const slot = this.waves.find((w) => !w.active) ?? this.waves[0];
    slot.active = true;
    slot.origin.copy(origin);
    slot.radius = 0.5;
    slot.maxRadius = isAmbient ? 16 : SONAR_MAX_RADIUS * (1 + 0.8 * clampedCharge);
    slot.speed = isAmbient ? 12 : SONAR_SPEED * (1 + 0.2 * clampedCharge);
    slot.isAmbient = isAmbient;
    slot.chargeRatio = isAmbient ? 0 : clampedCharge;
    slot.hitMirrors.clear();

    const waveHex = clampedCharge > 0.35 ? this.chargedHex : this.primaryHex;
    slot.ringMesh.position.copy(origin);
    slot.ringMesh.position.y += 0.35;
    (slot.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(waveHex);
    slot.ringMesh.visible = true;

    slot.domeMesh.position.copy(origin);
    slot.domeMesh.visible = true;

    slot.flashLight.position.set(origin.x, origin.y + 1.4, origin.z);
    slot.flashLight.color.setHex(waveHex);
    slot.flashLight.visible = !isAmbient;

    if (!isAmbient) {
      this.cooldownMax = SONAR_COOLDOWN * (1 + 0.55 * clampedCharge);
      this.cooldown = this.cooldownMax;
      this.pulseFlash = 1.0 + clampedCharge * 0.45;
      this.spawnSparks(origin, sparkCount);
    }

    return true;
  }

  public spawnSparks(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % this.MAX_SPARKS;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 5 + Math.random() * 8;
      this.sparkPositions[idx * 3] = origin.x;
      this.sparkPositions[idx * 3 + 1] = origin.y + 0.8;
      this.sparkPositions[idx * 3 + 2] = origin.z;
      this.sparkVelocities[idx * 3] = Math.cos(angle) * speed;
      this.sparkVelocities[idx * 3 + 1] = 1.2 + Math.random() * 3.5;
      this.sparkVelocities[idx * 3 + 2] = Math.sin(angle) * speed;
      this.sparkLives[idx] = 0.75 + Math.random() * 0.35;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    entities: RevealableEntity[],
    time: number
  ): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.pulseFlash > 0) this.pulseFlash = Math.max(0, this.pulseFlash - dt * 2.8);

    // Update waves
    for (const w of this.waves) {
      if (!w.active) continue;
      w.radius += w.speed * dt;
      const progress = w.radius / w.maxRadius;
      const fade = Math.max(0, 1 - progress * progress);

      w.ringMesh.scale.set(w.radius, 1, w.radius);
      (w.ringMesh.material as THREE.MeshBasicMaterial).opacity = fade * (w.isAmbient ? 0.35 : 0.92);

      w.domeMesh.scale.setScalar(w.radius);
      (w.domeMesh.material as THREE.ShaderMaterial).uniforms.uAlpha.value =
        fade * (w.isAmbient ? 0.16 : 0.48);

      w.flashLight.intensity = fade * 14;

      if (w.radius >= w.maxRadius) {
        w.active = false;
        w.ringMesh.visible = false;
        w.domeMesh.visible = false;
        w.flashLight.visible = false;
      }
    }

    // Update sparks
    let sparksDirty = false;
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      if (this.sparkLives[i] <= 0) continue;
      sparksDirty = true;
      this.sparkLives[i] -= dt;
      if (this.sparkLives[i] <= 0) {
        this.sparkPositions[i * 3] = 9999;
      } else {
        this.sparkPositions[i * 3] += this.sparkVelocities[i * 3] * dt;
        this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i * 3 + 1] * dt;
        this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i * 3 + 2] * dt;
        this.sparkVelocities[i * 3 + 1] -= 4.5 * dt;
      }
    }
    if (sparksDirty) {
      this.sparkGeo.attributes.position.needsUpdate = true;
    }

    // Update reveal state of world geometry
    const totalWindow = SONAR_HOLD_TIME + SONAR_FADE_TIME;
    for (const ent of entities) {
      ent.revealTimer = Math.max(0, ent.revealTimer - dt);

      // Distance from wave origin to entity AABB
      for (const w of this.waves) {
        if (!w.active || w.isAmbient) continue;
        const dx = Math.max(0, Math.abs(w.origin.x - ent.position.x) - ent.halfExtents.x);
        const dy = Math.max(0, Math.abs(w.origin.y - ent.position.y) - ent.halfExtents.y);
        const dz = Math.max(0, Math.abs(w.origin.z - ent.position.z) - ent.halfExtents.z);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= w.radius && dist >= Math.max(0, w.radius - 3.6)) {
          ent.revealTimer = totalWindow;
        }
      }

      // Personal close-range Echo Core aura (radius ~3.4 units)
      const pdx = Math.max(0, Math.abs(playerPos.x - ent.position.x) - ent.halfExtents.x);
      const pdy = Math.max(0, Math.abs(playerPos.y - ent.position.y) - ent.halfExtents.y);
      const pdz = Math.max(0, Math.abs(playerPos.z - ent.position.z) - ent.halfExtents.z);
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
      const aura = pDist < 3.4 ? (1 - pDist / 3.4) * 0.65 : 0;

      let pulseVis = 0;
      if (ent.revealTimer > SONAR_FADE_TIME) {
        pulseVis = 1;
      } else if (ent.revealTimer > 0) {
        pulseVis = ent.revealTimer / SONAR_FADE_TIME;
      }

      const hazardPulse = ent.isHazard ? 0.16 + 0.12 * Math.sin(time * 4.8) : 0;
      const contrastFloor = this.highContrast ? 0.26 : 0;
      const targetVis = Math.max(ent.baseOpacity, pulseVis, aura, hazardPulse, contrastFloor);
      ent.currentReveal = THREE.MathUtils.damp(ent.currentReveal, targetVis, 11, dt);

      for (const mesh of ent.meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.min(1, ent.currentReveal);
        if (mat.emissiveIntensity !== undefined) {
          const boost = pulseVis > 0.1 ? 0.55 + pulseVis * 0.9 : this.highContrast ? 0.65 : 0.25;
          mat.emissiveIntensity = boost;
          if (ent.isCrumbling) {
            if (ent.crumbleShaking || pulseVis > 0.25) {
              mat.emissive.setHex(0xff526b);
              mat.emissiveIntensity = ent.crumbleShaking ? 1.45 + Math.sin(time * 24) * 0.45 : 0.85;
            } else {
              mat.emissive.setHex(0x88521a);
            }
          }
        }
      }

      if (ent.outline) {
        const lineMat = ent.outline.material as THREE.LineBasicMaterial;
        const baseOutline = this.highContrast ? 0.35 : ent.isSecret ? 0.08 : 0.1;
        lineMat.opacity = Math.max(baseOutline, ent.currentReveal);
        if (ent.isCrumbling) {
          lineMat.color.setHex(ent.crumbleShaking || pulseVis > 0.25 ? 0xff526b : 0xffc857);
        }
      }
    }
  }

  public dispose(): void {
    for (const w of this.waves) {
      w.ringMesh.geometry.dispose();
      (w.ringMesh.material as THREE.Material).dispose();
      w.domeMesh.geometry.dispose();
      (w.domeMesh.material as THREE.Material).dispose();
    }
    this.sparkGeo.dispose();
    (this.sparkPoints.material as THREE.Material).dispose();
  }
}
