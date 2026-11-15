import { GameSettings } from './types';

export class Audio3DEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private droneBassGain: GainNode | null = null;
  private startedAmbience = false;
  private nodes: AudioNode[] = [];
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  private createCaveImpulseResponse(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        channelData[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      // Route SFX through dry path + procedural cavern ConvolverNode reverb
      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.82;
      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.34;
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.createCaveImpulseResponse(this.ctx, 1.85, 2.7);

      this.sfxGain.connect(dryGain);
      this.sfxGain.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(this.sfxBus);
      wetGain.connect(this.sfxBus);
      this.sfxBus.connect(this.masterGain);

      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applySettings(this.settings);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.startedAmbience) {
      this.startCaveAmbience();
    }
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const master = settings.muted ? 0 : settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.04);
    this.musicGain.gain.setTargetAtTime(settings.musicVolume * 0.28, now, 0.08);
  }

  private startCaveAmbience(): void {
    if (!this.ctx || !this.musicGain || this.startedAmbience) return;
    this.startedAmbience = true;

    try {
      // Filtered cave air noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (prev + 0.025 * w) / 1.025;
        prev = data[i];
        data[i] *= 2.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 185;
      this.windFilter = filter;

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.25;
      noise.connect(filter);
      filter.connect(windGain);
      windGain.connect(this.musicGain);
      noise.start();

      // Atmospheric subterranean harmonic chord (A1 + E2 + C3 soft)
      const chordFreqs = [55, 82.41, 130.81];
      chordFreqs.forEach((freq, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        const g = this.ctx.createGain();
        g.gain.value = idx === 0 ? 0.14 : 0.045;
        if (idx === 0) this.droneBassGain = g;

        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08 + idx * 0.04;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);

        osc.connect(g);
        g.connect(this.musicGain);
        osc.start();
        lfo.start();
        this.nodes.push(osc, lfo);
      });

      this.nodes.push(noise);
    } catch {
      // Audio failure never stops gameplay
    }
  }

  public setAdaptiveIntensity(levelNumber: number, alertActive: boolean): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const depthRatio = Math.min(1, Math.max(0, (levelNumber - 1) / 4));
    const cutoff = 175 + depthRatio * 95 + (alertActive ? 85 : 0);
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(cutoff, now, 0.35);
    }
    if (this.droneBassGain) {
      const targetGain = 0.13 + depthRatio * 0.05 + (alertActive ? 0.07 : 0);
      this.droneBassGain.gain.setTargetAtTime(targetGain, now, 0.25);
    }
  }

  private canSfx(): boolean {
    return Boolean(this.ctx && this.sfxGain && !this.settings.muted);
  }

  public playSonar(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.65);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.75);

    // Spatial cavern echo taps
    [0.2, 0.42].forEach((delay, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const echo = this.ctx.createOscillator();
      const eg = this.ctx.createGain();
      echo.type = 'triangle';
      echo.frequency.setValueAtTime(620 - idx * 90, now + delay);
      echo.frequency.exponentialRampToValueAtTime(220, now + delay + 0.45);
      eg.gain.setValueAtTime(0.001, now + delay);
      eg.gain.linearRampToValueAtTime(0.11 / (idx + 1), now + delay + 0.02);
      eg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
      echo.connect(eg);
      eg.connect(this.sfxGain);
      echo.start(now + delay);
      echo.stop(now + delay + 0.52);
    });
  }

  public playFootstep(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110 + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.05);
    g.gain.setValueAtTime(0.055, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playJump(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.13);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playLand(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.08);
    g.gain.setValueAtTime(0.13, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCrystalCollect(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [587.33, 880, 1174.66, 1479.98].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playMechanism(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [329.63, 493.88, 659.25, 987.77].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.07;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  public playCheckpoint(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [440, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playDeath(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.42);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.42);
    g.gain.setValueAtTime(0.19, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playLevelComplete(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.68);
    });
  }

  public playVictoryFanfare(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.15);
    });
  }

  public playWhisper(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, t + 0.45);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.065 / (idx + 1), t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public playChargedSonar(chargeRatio: number): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980 + chargeRatio * 240, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.95);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.36, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.02);
  }

  public playMirrorBeam(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.32);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playDoorOpen(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [220, 329.63, 440, 659.25].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  public playCrumble(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.28);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playDroneAlert(): void {
    if (!this.canSfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(760, now + 0.09);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public destroy(): void {
    this.nodes.forEach((n) => {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
      } catch {
        // ignore
      }
    });
    this.nodes = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
