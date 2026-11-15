import { useEffect, useRef, useState } from 'react';
import { Camera, Pause, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, HudSnapshot, UserProfile } from '../game/types';
import { formatKeyCode } from '../services/progress';

interface GameHudProps {
  hud: HudSnapshot;
  settings: GameSettings;
  user: UserProfile | null;
  onToggleMute: () => void;
  onPause: () => void;
  onRestartCheckpoint: () => void;
  onRequestHint: () => void;
  onSkipTutorial: () => void;
  onTogglePhotoMode: () => void;
  onToggleFlythrough: () => void;
  onCapturePhoto: () => Promise<void>;
  onVirtualInput: (opts: {
    moveX?: number;
    moveY?: number;
    jump?: boolean;
    pulse?: boolean;
    interact?: boolean;
  }) => void;
}

export function formatTime(seconds: number, tenths = false): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const base = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (!tenths) return base;
  const d = Math.floor((seconds * 10) % 10);
  return `${base}.${d}`;
}

export function GameHud({
  hud,
  settings,
  user,
  onToggleMute,
  onPause,
  onRestartCheckpoint,
  onRequestHint,
  onSkipTutorial,
  onTogglePhotoMode,
  onToggleFlythrough,
  onCapturePhoto,
  onVirtualInput,
}: GameHudProps) {
  const pulseFill = Math.round((1 - hud.sonarCooldownRatio) * 100);
  const hintReady = hud.hintCooldownRatio <= 0 && !hud.hintLoading;
  const hintRemainingSec = Math.ceil(hud.hintCooldownRatio * 60);
  const joyOrigin = useRef<{ x: number; y: number } | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Typewriter reveal for lore messages
  const [typedLength, setTypedLength] = useState(0);
  useEffect(() => {
    const msg = hud.loreMessage;
    if (!msg) {
      setTypedLength(0);
      return;
    }
    setTypedLength(1);
    const id = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= msg.length) {
          window.clearInterval(id);
          return msg.length;
        }
        return prev + 2;
      });
    }, 18);
    return () => window.clearInterval(id);
  }, [hud.loreMessage]);

  const visibleLore = hud.loreMessage ? hud.loreMessage.slice(0, typedLength) : null;
  const scaleStyle = { transform: `scale(${settings.hudScale})` };

  // Photo Mode clean viewport UI
  if (hud.photoMode) {
    return (
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
        <div className="flex items-center justify-between text-xs text-[#A4B0C6]">
          <div className="px-3 py-1.5 rounded-md bg-[#070B16]/85 border border-[#43E8FF]/40 text-[#43E8FF] font-medium">
            Photo Mode · Level 0{hud.levelNumber} — {hud.levelName}
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-[#070B16]/85 border border-[#3986FF]/30 text-xs text-[#A4B0C6]">
            Drag or Arrow Keys to Orbit · Scroll or Up/Down to Zoom
          </div>
          <button
            type="button"
            disabled={capturing}
            onClick={async () => {
              setCapturing(true);
              await onCapturePhoto();
              setCapturing(false);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-xs hover:bg-[#73EFFF] disabled:opacity-60"
          >
            <Camera className="w-4 h-4" />
            <span>{capturing ? 'Saving...' : 'Capture Snapshot'}</span>
          </button>
          <button
            type="button"
            onClick={onTogglePhotoMode}
            className="px-4 py-2 rounded-md bg-[#10182A]/95 border border-[#3986FF]/40 text-xs text-[#F1F5FF] hover:border-[#43E8FF]/70"
          >
            Exit Photo Mode [{formatKeyCode(settings.keyBindings.photo)} / Esc]
          </button>
        </div>
      </div>
    );
  }

  const pulseKey = hud.gamepadActive ? 'X' : formatKeyCode(settings.keyBindings.pulse);
  const crouchKey = hud.gamepadActive ? 'B' : formatKeyCode(settings.keyBindings.crouch);
  const hintKey = formatKeyCode(settings.keyBindings.hint);
  const photoKey = formatKeyCode(settings.keyBindings.photo);
  const moveKeys = hud.gamepadActive
    ? 'Left Stick'
    : `${formatKeyCode(settings.keyBindings.forward)}/${formatKeyCode(settings.keyBindings.left)}/${formatKeyCode(settings.keyBindings.backward)}/${formatKeyCode(settings.keyBindings.right)}`;

  const tutorialMessages = [
    `Step 1 of 3 · Move Explorer using ${moveKeys} and look around with the camera.`,
    `Step 2 of 3 · Tap [${pulseKey}] to emit a Sonar Wave (or hold [${pulseKey}] to charge 1.8x range).`,
    `Step 3 of 3 · Collect a glowing Amber Echo Fragment or step onto a Checkpoint beacon.`,
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-5">
      {/* Top Perimeter HUD (zero backdrop-filter over WebGL) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Stage, Objective, Speedrun Splits & F3 Debug */}
        <div className="max-w-xs sm:max-w-md origin-top-left" style={scaleStyle}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#A4B0C6]">
            <span className="font-mono-num text-[#43E8FF]">
              {hud.isTrial && hud.trialMeta
                ? hud.trialMeta.isDaily
                  ? 'Daily Trial'
                  : 'Echo Trial'
                : `Level 0${hud.levelNumber}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#F1F5FF]">{hud.levelName}</span>
            {hud.isTrial && hud.trialMeta && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-[#FFC857]">{hud.trialMeta.shareCode}</span>
              </>
            )}
            {hud.checkpointReached && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#43E8FF]">Checkpoint Saved</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className={hud.judgeMode ? 'text-[#FFC857]' : hud.isOffline ? 'text-[#FFC857]' : 'text-[#A4B0C6]'}>
              {hud.judgeMode
                ? 'Showcase Mode · Scores Disabled'
                : user
                  ? hud.isOffline
                    ? 'Offline Cache'
                    : 'Cloud Synced'
                  : 'Guest Local'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-[#A4B0C6]">{hud.objective}</p>

          {settings.speedrunMode && hud.checkpointSplits.length > 0 && (
            <div className="mt-2 inline-flex flex-col gap-0.5 rounded-md bg-[#070B16]/85 border border-[#3986FF]/25 px-2.5 py-1.5 text-[11px] font-mono-num">
              {hud.checkpointSplits.map((sp) => (
                <div key={sp.label} className="flex items-center justify-between gap-4">
                  <span className="text-[#A4B0C6]">{sp.label}</span>
                  <span className="text-[#F1F5FF]">{formatTime(sp.time, true)}</span>
                  {sp.delta !== null && (
                    <span className={sp.delta <= 0 ? 'text-[#43E8FF]' : 'text-[#FFC857]'}>
                      {sp.delta <= 0 ? `${sp.delta.toFixed(1)}s` : `+${sp.delta.toFixed(1)}s`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {hud.debugStats && (
            <div className="mt-2 inline-block rounded-md bg-[#070B16]/90 border border-[#9B7BFF]/40 px-2.5 py-1.5 text-[11px] font-mono-num text-[#A4B0C6]">
              <div>
                FPS: <span className="text-[#43E8FF]">{hud.debugStats.fps}</span> · Quality:{' '}
                <span className="text-[#F1F5FF]">{hud.debugStats.quality}</span>
              </div>
              <div>
                Draw Calls: <span className="text-[#F1F5FF]">{hud.debugStats.drawCalls}</span> · Tris:{' '}
                <span className="text-[#F1F5FF]">{hud.debugStats.triangles}</span>
              </div>
              <div>
                Entities: <span className="text-[#F1F5FF]">{hud.debugStats.entities}</span>
                {hud.debugStats.memoryMb !== null && (
                  <>
                    {' '}
                    · Heap: <span className="text-[#FFC857]">{hud.debugStats.memoryMb} MB</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top-Center: Fragments, Seals, Timer, Ghost Delta & Boss Stun Ring */}
        <div className="hidden md:flex flex-col items-center gap-2 origin-top" style={scaleStyle}>
          <div className="flex items-center gap-4 text-xs font-medium bg-[#070B16]/85 border border-[#3986FF]/25 rounded-md px-3.5 py-2">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                <polygon points="8,1 13,8 8,15 3,8" fill="#FFC857" />
              </svg>
              <span className="text-[#A4B0C6]">Fragments</span>
              <span className="font-mono-num text-[#FFC857]">
                {hud.levelFragmentsCollected}/{hud.levelFragmentsTotal}
              </span>
            </div>

            {hud.mechanismsRequired > 0 && (
              <>
                <span className="text-[#3986FF]/40" aria-hidden="true">
                  /
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A4B0C6]">Seals</span>
                  <span className="font-mono-num text-[#9B7BFF]">
                    {hud.mechanismsActivated}/{hud.mechanismsRequired}
                  </span>
                </div>
              </>
            )}

            <span className="text-[#3986FF]/40" aria-hidden="true">
              /
            </span>
            <span className="font-mono-num text-[#F1F5FF]">
              {formatTime(hud.elapsedSeconds, settings.speedrunMode)}
            </span>

            {settings.showGhost && hud.ghostDeltaSeconds !== null && hud.ghostOwnerName && (
              <>
                <span className="text-[#3986FF]/40" aria-hidden="true">
                  /
                </span>
                <span
                  className={`font-mono-num ${
                    hud.ghostDeltaSeconds <= 0 ? 'text-[#43E8FF]' : 'text-[#FFC857]'
                  }`}
                  title={`Delta vs ${hud.ghostOwnerName} PB`}
                >
                  vs {hud.ghostOwnerName} {hud.ghostDeltaSeconds <= 0 ? '' : '+'}
                  {hud.ghostDeltaSeconds.toFixed(1)}s
                </span>
              </>
            )}
          </div>

          {hud.wardenActive && (
            <div className="flex items-center gap-3 bg-[#070B16]/90 border border-[#FF526B]/45 rounded-md px-3.5 py-2">
              <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0 -rotate-90" aria-hidden="true">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(255,82,107,0.22)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={hud.wardenStunned ? '#FFC857' : '#43E8FF'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={
                    2 * Math.PI * 14 * (1 - hud.wardenStuns / Math.max(1, hud.wardenMaxStuns))
                  }
                />
              </svg>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="text-[#F1F5FF]">The Silent Warden</span>
                  <span
                    className={`font-mono-num ${
                      hud.wardenStunned
                        ? 'text-[#FFC857]'
                        : hud.isCrouching
                          ? 'text-[#43E8FF]'
                          : 'text-[#FF526B]'
                    }`}
                  >
                    {hud.wardenStunned ? 'STUNNED' : hud.isCrouching ? 'FROZEN' : 'HUNTING'} ·{' '}
                    {hud.wardenStuns}/{hud.wardenMaxStuns}
                  </span>
                </div>
                <p className="text-[10px] text-[#A4B0C6]">
                  Hold [{pulseKey}] to strike a Mirror Crystal · [{crouchKey}] Crouch to freeze
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Showcase Fly-Through, Echo Energy, Ask Echo Hint, Photo Mode & Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2 origin-top-right" style={scaleStyle}>
          {hud.judgeMode && (
            <button
              type="button"
              onClick={onToggleFlythrough}
              className={`h-9 px-3 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap ${
                hud.showcaseFlythroughRemaining !== null
                  ? 'bg-[#FFC857] border-[#FFC857] text-[#070B16]'
                  : 'bg-[#070B16]/85 border-[#FFC857]/60 text-[#FFC857] hover:bg-[#FFC857]/15'
              }`}
            >
              {hud.showcaseFlythroughRemaining !== null
                ? `Stop Fly-Through (${hud.showcaseFlythroughRemaining}s)`
                : '20s Fly-Through'}
            </button>
          )}
          <button
            type="button"
            onClick={onRequestHint}
            disabled={!hintReady}
            title={`Ask the Echo Keeper for a Hint (${hintKey})`}
            aria-label="Ask the Echo Keeper for a hint"
            className={`relative overflow-hidden flex items-center gap-1.5 h-9 px-2.5 rounded-md border text-xs font-medium transition-colors ${
              hud.hintAutoPrompt && hintReady
                ? 'bg-[#10182A]/95 border-[#FFC857] text-[#FFC857]'
                : hintReady
                  ? 'bg-[#070B16]/85 border-[#9B7BFF]/45 text-[#F1F5FF] hover:border-[#43E8FF]/70'
                  : 'bg-[#070B16]/75 border-[#3986FF]/20 text-[#A4B0C6]/70 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9B7BFF] shrink-0" />
            <span className="hidden sm:inline">
              {hud.hintLoading
                ? 'Listening...'
                : hintReady
                  ? hud.hintAutoPrompt
                    ? `Need a Hint? [${hintKey}]`
                    : `Ask Echo [${hintKey}]`
                  : `Hint ${hintRemainingSec}s`}
            </span>
            {hud.hintCooldownRatio > 0 && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-[#9B7BFF] transition-all"
                style={{ width: `${Math.round((1 - hud.hintCooldownRatio) * 100)}%` }}
              />
            )}
          </button>

          <div className="bg-[#070B16]/85 border border-[#3986FF]/25 rounded-md px-3 py-1.5 min-w-[152px]">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
              <span className="text-[#A4B0C6]">Echo Core</span>
              <span className="font-mono-num text-[#43E8FF]">{hud.echoEnergy}%</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-[#10182A] overflow-hidden">
              <div
                className="h-full origin-left transition-transform duration-75 rounded-full bg-[#43E8FF]"
                style={{ transform: `scaleX(${hud.echoEnergy / 100})` }}
              />
            </div>
            {hud.chargeRatio > 0 ? (
              <div className="mt-1">
                <div className="h-1 w-full rounded-full bg-[#10182A] overflow-hidden">
                  <div
                    className="h-full origin-left rounded-full bg-[#FFC857]"
                    style={{ transform: `scaleX(${hud.chargeRatio})` }}
                  />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#FFC857]">
                  <span>Charging Echo</span>
                  <span className="font-mono-num">{Math.round(hud.chargeRatio * 100)}%</span>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#A4B0C6]">
                <span>{hud.isCrouching ? `Silent Crouch [${crouchKey}]` : `Hold [${pulseKey}] Charge`}</span>
                <span className={`font-mono-num ${hud.isCrouching ? 'text-[#43E8FF]' : ''}`}>
                  {hud.sonarReady ? 'Ready' : `${pulseFill}%`}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onTogglePhotoMode}
            title={`Photo Mode (${photoKey})`}
            aria-label="Enter Photo Mode"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-md bg-[#070B16]/85 border border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#43E8FF]/60 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRestartCheckpoint}
            title={`Restart Checkpoint (${formatKeyCode(settings.keyBindings.restart)})`}
            aria-label="Restart Checkpoint"
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#070B16]/85 border border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#43E8FF]/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#070B16]/85 border border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#43E8FF]/60 transition-colors"
          >
            {settings.muted ? (
              <VolumeX className="w-4 h-4 text-[#FF526B]" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onPause}
            title="Pause (Esc)"
            aria-label="Pause Game"
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#070B16]/85 border border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#43E8FF]/60 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Area: Performance Toast, Tutorial, Lore Banner, Sound Subtitles, Interact Prompt, Touch Controls */}
      <div className="flex flex-col items-center gap-2.5 origin-bottom" style={scaleStyle}>
        {hud.performanceToast && (
          <div className="px-3.5 py-1.5 rounded-md bg-[#10182A]/95 border border-[#FFC857]/55 text-xs text-[#FFC857]">
            {hud.performanceToast}
          </div>
        )}

        {hud.tutorialStep !== null && hud.tutorialStep >= 0 && hud.tutorialStep < 3 && (
          <div className="pointer-events-auto flex items-center gap-3 max-w-xl px-4 py-2 rounded-md bg-[#0C1324]/92 border border-[#43E8FF]/50 text-xs text-[#F1F5FF]">
            <span>{tutorialMessages[hud.tutorialStep]}</span>
            <button
              type="button"
              onClick={onSkipTutorial}
              className="shrink-0 px-2.5 py-1 rounded bg-[#10182A] border border-[#3986FF]/40 text-[11px] text-[#A4B0C6] hover:text-[#F1F5FF]"
            >
              Skip Tutorial
            </button>
          </div>
        )}

        {visibleLore && (
          <div className="max-w-xl px-4 py-2.5 rounded-md bg-[#070B16]/92 border border-[#43E8FF]/45 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#9B7BFF] font-semibold">
                Echo Keeper
              </span>
              {hud.loreSource === 'gemini' && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#9B7BFF]/20 border border-[#9B7BFF]/45 text-[#43E8FF]">
                  ✦ Gemini
                </span>
              )}
            </div>
            <p className="text-sm text-[#F1F5FF] leading-snug">{visibleLore}</p>
          </div>
        )}

        {settings.soundSubtitles && hud.soundSubtitle && (
          <div
            aria-live="polite"
            className="px-3 py-1 rounded bg-[#070B16]/85 border border-[#3986FF]/30 text-[11px] font-mono-num text-[#A4B0C6]"
          >
            {hud.soundSubtitle}
          </div>
        )}

        {hud.interactPrompt && (
          <div className="px-4 py-1.5 rounded-md bg-[#10182A]/95 border border-[#43E8FF]/60 text-xs font-semibold text-[#F1F5FF]">
            {hud.interactPrompt}
          </div>
        )}

        {!hud.pointerLocked && !settings.touchControls && !hud.gamepadActive && (
          <div className="text-[11px] text-[#A4B0C6]/85">
            Click viewport to lock mouse · [{hintKey}] Ask Echo · [{photoKey}] Photo Mode · [F3] Stats
          </div>
        )}

        {settings.touchControls && (
          <div className="pointer-events-auto flex items-end justify-between w-full pt-2">
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                joyOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
              }}
              onPointerMove={(e) => {
                if (!joyOrigin.current) return;
                const dx = Math.max(-1, Math.min(1, (e.clientX - joyOrigin.current.x) / 36));
                const dy = Math.max(-1, Math.min(1, (e.clientY - joyOrigin.current.y) / 36));
                onVirtualInput({ moveX: dx, moveY: dy });
              }}
              onPointerUp={() => {
                joyOrigin.current = null;
                onVirtualInput({ moveX: 0, moveY: 0 });
              }}
              onPointerCancel={() => {
                joyOrigin.current = null;
                onVirtualInput({ moveX: 0, moveY: 0 });
              }}
              className="w-24 h-24 rounded-full bg-[#10182A]/85 border border-[#3986FF]/40 flex items-center justify-center text-[11px] text-[#A4B0C6] touch-none"
            >
              Move
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={() => onVirtualInput({ interact: true })}
                className="min-w-[54px] min-h-[48px] px-3 rounded-md bg-[#10182A]/90 border border-[#9B7BFF]/50 text-xs font-semibold text-[#F1F5FF]"
              >
                Use
              </button>
              <button
                type="button"
                onPointerDown={() => onVirtualInput({ pulse: true })}
                className="min-w-[58px] min-h-[48px] px-3 rounded-md bg-[#43E8FF]/20 border border-[#43E8FF]/70 text-xs font-semibold text-[#43E8FF]"
              >
                Echo
              </button>
              <button
                type="button"
                onPointerDown={() => onVirtualInput({ jump: true })}
                className="min-w-[56px] min-h-[48px] px-3 rounded-md bg-[#10182A]/90 border border-[#3986FF]/50 text-xs font-semibold text-[#F1F5FF]"
              >
                Jump
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
