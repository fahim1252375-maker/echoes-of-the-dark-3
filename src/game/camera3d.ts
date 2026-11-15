import * as THREE from 'three';

const _target = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();

export class ThirdPersonCameraController {
  public yaw = 0; // radians, 0 looks down -Z
  public pitch = 0.36; // downward angle
  public distance = 8.5;
  public pointerLocked = false;

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private shakeTime = 0;
  private shakeAmp = 0;
  private sensitivity = 1.0;

  private domElement: HTMLElement;
  private isPlayingCheck: () => boolean;
  private onLockChange?: (locked: boolean) => void;

  constructor(
    domElement: HTMLElement,
    isPlayingCheck: () => boolean,
    onLockChange?: (locked: boolean) => void
  ) {
    this.domElement = domElement;
    this.isPlayingCheck = isPlayingCheck;
    this.onLockChange = onLockChange;

    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  public setSensitivity(sens: number): void {
    this.sensitivity = sens;
  }

  public resetBehindPlayer(): void {
    this.yaw = 0;
    this.pitch = 0.36;
    this.distance = 8.5;
  }

  public triggerShake(amp: number, duration: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  public releasePointerLock(): void {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock?.();
    }
  }

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.domElement;
    if (this.onLockChange) this.onLockChange(this.pointerLocked);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (!this.isPlayingCheck()) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    // Request pointer lock on click for natural 3D camera control (never blocks fallback drag if denied)
    if (document.pointerLockElement !== this.domElement && e.button === 0) {
      this.domElement.requestPointerLock?.();
    }
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isPlayingCheck()) return;

    let dx = 0;
    let dy = 0;
    if (document.pointerLockElement === this.domElement) {
      dx = e.movementX;
      dy = e.movementY;
    } else if (this.isDragging) {
      dx = e.clientX - this.lastX;
      dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    } else {
      return;
    }

    const scale = 0.0032 * this.sensitivity;
    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * scale, 0.12, 1.05);
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.isPlayingCheck()) return;
    this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.006, 5.2, 14.5);
  };

  public applyKeyboardYaw(dir: number, dt: number): void {
    this.yaw -= dir * dt * 1.9 * this.sensitivity;
  }

  public applyStickLook(dx: number, dy: number, dt: number): void {
    const rate = 2.4 * this.sensitivity;
    this.yaw -= dx * rate * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * rate * dt, 0.12, 1.05);
  }

  public adjustDistance(delta: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, 3.6, 15.5);
  }

  public update(
    camera: THREE.PerspectiveCamera,
    playerPos: THREE.Vector3,
    dt: number,
    reducedShake: boolean
  ): void {
    _target.set(playerPos.x, playerPos.y + 1.35, playerPos.z);

    const horizDist = Math.cos(this.pitch) * this.distance;
    const vertDist = Math.sin(this.pitch) * this.distance;
    _desiredPos.set(
      _target.x + Math.sin(this.yaw) * horizDist,
      Math.max(-3.5, _target.y + vertDist),
      _target.z + Math.cos(this.yaw) * horizDist
    );

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredPos.x, 12, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredPos.y, 12, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredPos.z, 12, dt);

    if (this.shakeTime > 0 && !reducedShake) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const decay = this.shakeTime / 0.25;
      const amp = this.shakeAmp * Math.min(1, decay);
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp;
    } else {
      this.shakeAmp = 0;
    }

    camera.lookAt(_target);
  }

  public dispose(): void {
    this.releasePointerLock();
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }
}
