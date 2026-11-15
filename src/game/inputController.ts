import { GameSettings, GameState, KeyBindAction } from './types';
import { Audio3DEngine } from './audio3d';
import { ThirdPersonCameraController } from './camera3d';

export interface GamepadPollResult {
  holdingPulse: boolean;
  pulseReleased: boolean;
  crouchHeld: boolean;
  sprintHeld: boolean;
  jumpPressed: boolean;
  interactPressed: boolean;
  pausePressed: boolean;
}

export class EngineInputController {
  public heldKeys = new Set<string>();
  public justPressed = new Set<string>();
  public virtualMove = { x: 0, y: 0 };
  public virtualJump = false;
  public virtualPulse = false;
  public virtualInteract = false;

  public gamepadActive = false;
  public gamepadMove = { x: 0, y: 0 };
  private gamepadLastUsed = 0;
  private gamepadPrevButtons: Record<number, boolean> = {};

  private getSettings: () => GameSettings;
  private getGameState: () => GameState;
  private audio: Audio3DEngine;

  constructor(
    getSettings: () => GameSettings,
    getGameState: () => GameState,
    audio: Audio3DEngine
  ) {
    this.getSettings = getSettings;
    this.getGameState = getGameState;
    this.audio = audio;

    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

    this.audio.unlock();
    const settings = this.getSettings();
    if (
      (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3'].includes(e.code) ||
        Object.values(settings.keyBindings).includes(e.code)) &&
      this.getGameState() === 'PLAYING'
    ) {
      e.preventDefault();
    }

    this.gamepadActive = false;
    if (!e.repeat && !this.heldKeys.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.heldKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.justPressed.clear();
    this.virtualMove = { x: 0, y: 0 };
  };

  public isActionHeld(action: KeyBindAction): boolean {
    return this.heldKeys.has(this.getSettings().keyBindings[action]);
  }

  public isActionJustPressed(action: KeyBindAction): boolean {
    return this.justPressed.has(this.getSettings().keyBindings[action]);
  }

  public setVirtualInput(opts: {
    moveX?: number;
    moveY?: number;
    jump?: boolean;
    pulse?: boolean;
    interact?: boolean;
  }): void {
    this.audio.unlock();
    if (opts.moveX !== undefined) this.virtualMove.x = opts.moveX;
    if (opts.moveY !== undefined) this.virtualMove.y = opts.moveY;
    if (opts.jump) this.virtualJump = true;
    if (opts.pulse) this.virtualPulse = true;
    if (opts.interact) this.virtualInteract = true;
  }

  public clearStepEdges(): void {
    this.justPressed.clear();
    this.virtualJump = false;
    this.virtualPulse = false;
    this.virtualInteract = false;
  }

  public clearHeld(): void {
    this.heldKeys.clear();
  }

  public pollGamepad(
    dt: number,
    worldTime: number,
    camCtrl: ThirdPersonCameraController
  ): GamepadPollResult {
    const empty: GamepadPollResult = {
      holdingPulse: false,
      pulseReleased: false,
      crouchHeld: false,
      sprintHeld: false,
      jumpPressed: false,
      interactPressed: false,
      pausePressed: false,
    };
    const pads = navigator.getGamepads?.();
    if (!pads) return empty;
    const pad = Array.from(pads).find((p) => p && p.connected);
    if (!pad) return empty;

    const lx = Math.abs(pad.axes[0] ?? 0) > 0.18 ? pad.axes[0] : 0;
    const ly = Math.abs(pad.axes[1] ?? 0) > 0.18 ? pad.axes[1] : 0;
    const rx = Math.abs(pad.axes[2] ?? 0) > 0.18 ? pad.axes[2] : 0;
    const ry = Math.abs(pad.axes[3] ?? 0) > 0.18 ? pad.axes[3] : 0;
    this.gamepadMove.x = lx;
    this.gamepadMove.y = ly;

    const anyStick = lx !== 0 || ly !== 0 || rx !== 0 || ry !== 0;
    if (rx !== 0 || ry !== 0) {
      camCtrl.applyStickLook(rx, ry, dt);
    }

    const isDown = (idx: number) => Boolean(pad.buttons[idx]?.pressed);
    const wasDown = (idx: number) => Boolean(this.gamepadPrevButtons[idx]);
    const justEdge = (idx: number) => isDown(idx) && !wasDown(idx);

    const anyBtn = [0, 1, 2, 3, 4, 5, 9].some(isDown);
    if (anyStick || anyBtn) {
      this.gamepadActive = true;
      this.gamepadLastUsed = worldTime;
    } else if (this.gamepadActive && worldTime - this.gamepadLastUsed > 10) {
      this.gamepadActive = false;
    }

    const res: GamepadPollResult = {
      holdingPulse: isDown(2),
      pulseReleased: !isDown(2) && wasDown(2),
      crouchHeld: isDown(1),
      sprintHeld: isDown(4) || isDown(5),
      jumpPressed: justEdge(0),
      interactPressed: justEdge(3),
      pausePressed: justEdge(9),
    };

    for (let i = 0; i < Math.min(12, pad.buttons.length); i++) {
      this.gamepadPrevButtons[i] = isDown(i);
    }
    return res;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
