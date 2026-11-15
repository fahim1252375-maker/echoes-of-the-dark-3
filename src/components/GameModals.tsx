import { useEffect, useState } from 'react';
import {
  ColorblindMode,
  GameSettings,
  HudSnapshot,
  KeyBindAction,
  ModalView,
  NarrationLanguage,
  QualityPreset,
} from '../game/types';
import { THEME_CONFIG } from '../game/themeConfig';
import { TOTAL_CAMPAIGN_FRAGMENTS } from '../game/levelValidator';
import { DEFAULT_KEY_BINDINGS, formatKeyCode, WorldStats } from '../services/progress';
import { fetchAiRecap } from '../services/ai';
import { isSpeechSupported, listAvailableVoices, VoiceOption } from '../services/voiceNarration';
import { renderShareCardBlob } from './ShareCardCanvas';
import { formatTime } from './GameHud';
import { ModalFrame } from './ModalFrame';

interface GameModalsProps {
  hud: HudSnapshot;
  modal: ModalView;
  settings: GameSettings;
  worldStats?: WorldStats | null;
  onCloseModal: () => void;
  onOpenModal: (m: ModalView) => void;
  onResume: () => void;
  onRestartCheckpoint: () => void;
  onSaveAndExit: () => void;
  onMainMenu: () => void;
  onNextLevel: (nextLevel: 1 | 2 | 3 | 4 | 5) => void;
  onReplayGame: () => void;
  onReplayTrial?: () => void;
  onUpdateSettings: (next: GameSettings) => void;
}

const KEYBIND_LABELS: { action: KeyBindAction; label: string }[] = [
  { action: 'forward', label: 'Move Forward' },
  { action: 'backward', label: 'Move Backward' },
  { action: 'left', label: 'Strafe Left' },
  { action: 'right', label: 'Strafe Right' },
  { action: 'jump', label: 'Jump' },
  { action: 'pulse', label: 'Echo Pulse (Tap / Hold)' },
  { action: 'interact', label: 'Activate Seal / Door' },
  { action: 'crouch', label: 'Silent Crouch' },
  { action: 'hint', label: 'Ask Echo Keeper Hint' },
  { action: 'restart', label: 'Restart Checkpoint' },
  { action: 'photo', label: 'Photo Mode' },
];

export function GameModals({
  hud,
  modal,
  settings,
  worldStats,
  onCloseModal,
  onOpenModal,
  onResume,
  onRestartCheckpoint,
  onSaveAndExit,
  onMainMenu,
  onNextLevel,
  onReplayGame,
  onReplayTrial,
  onUpdateSettings,
}: GameModalsProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const [rebindingAction, setRebindingAction] = useState<KeyBindAction | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const speechSupported = isSpeechSupported();

  const [recapText, setRecapText] = useState<string | null>(null);
  const [recapSource, setRecapSource] = useState<'gemini' | 'fallback' | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [shareCardBusy, setShareCardBusy] = useState(false);
  const [shareCardSaved, setShareCardSaved] = useState(false);

  useEffect(() => {
    if (!speechSupported) return;
    const refresh = () => setVoices(listAvailableVoices());
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
    };
  }, [speechSupported]);

  useEffect(() => {
    if (
      (hud.gameState !== 'LEVEL_COMPLETE' && hud.gameState !== 'VICTORY') ||
      hud.isTrial
    ) {
      setRecapText(null);
      setRecapSource(null);
      setShareCardSaved(false);
      return;
    }

    let active = true;
    setRecapLoading(true);
    fetchAiRecap(
      {
        levelNumber: hud.levelNumber,
        levelName: hud.levelName,
        completionTimeSeconds: hud.lastCompletedLevelTime ?? hud.elapsedSeconds,
        pulsesUsed: hud.pulsesThisLevel,
        deaths: hud.deathsInSection,
        fragmentsCollected: hud.levelFragmentsCollected,
        hintsUsed: hud.hintsUsed,
        medal: hud.lastMedal,
        language: settings.narrationLanguage,
      },
      settings.aiNarration
    )
      .then((res) => {
        if (!active) return;
        setRecapText(res.text);
        setRecapSource(res.source);
      })
      .finally(() => {
        if (active) setRecapLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    hud.gameState,
    hud.isTrial,
    hud.levelNumber,
    hud.levelName,
    hud.lastCompletedLevelTime,
    hud.elapsedSeconds,
    hud.pulsesThisLevel,
    hud.deathsInSection,
    hud.levelFragmentsCollected,
    hud.hintsUsed,
    hud.lastMedal,
    settings.narrationLanguage,
    settings.aiNarration,
  ]);

  useEffect(() => {
    if (!rebindingAction) return;
    const handleCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setRebindingAction(null);
        return;
      }
      onUpdateSettings({
        ...settings,
        keyBindings: {
          ...settings.keyBindings,
          [rebindingAction]: e.code,
        },
      });
      setRebindingAction(null);
    };
    window.addEventListener('keydown', handleCaptureKey, { capture: true });
    return () => window.removeEventListener('keydown', handleCaptureKey, { capture: true });
  }, [rebindingAction, settings, onUpdateSettings]);

  if (modal === 'SETTINGS') {
    return (
      <ModalFrame
        labelledBy="modal-settings-title"
        onClose={rebindingAction ? undefined : onCloseModal}
      >
        <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
            <h2 id="modal-settings-title" className="font-display text-xl font-bold text-[#F1F5FF]">
              Settings
            </h2>
            <button
              type="button"
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF]"
            >
              Back
            </button>
          </div>

          <div className="mt-4 overflow-y-auto space-y-4 pr-1 text-sm">
            <ToggleRow
              label="Mute All Audio"
              desc="Silence cave ambience and synthesized sound effects"
              checked={settings.muted}
              onChange={(v) => onUpdateSettings({ ...settings, muted: v })}
            />
            <SliderRow
              label="Master Volume"
              value={settings.masterVolume}
              disabled={settings.muted}
              onChange={(v) => onUpdateSettings({ ...settings, masterVolume: v })}
            />
            <SliderRow
              label="Music / Cave Ambience"
              value={settings.musicVolume}
              disabled={settings.muted}
              onChange={(v) => onUpdateSettings({ ...settings, musicVolume: v })}
            />
            <SliderRow
              label="Sound Effects Volume"
              value={settings.sfxVolume}
              disabled={settings.muted}
              onChange={(v) => onUpdateSettings({ ...settings, sfxVolume: v })}
            />

            <div className="border-t border-[#3986FF]/20 pt-3 space-y-3">
              <SliderRow
                label="Mouse Sensitivity"
                min={0.3}
                max={2.0}
                step={0.1}
                value={settings.mouseSensitivity}
                isPercent={false}
                onChange={(v) => onUpdateSettings({ ...settings, mouseSensitivity: v })}
              />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#F1F5FF]">Graphics Quality</div>
                  <div className="text-xs text-[#A4B0C6]">Adjust shadows, resolution scaling, and dust density</div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-[#070B16] rounded-md">
                  {(['LOW', 'MEDIUM', 'HIGH'] as QualityPreset[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, quality: q })}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        settings.quality === q
                          ? 'bg-[#10182A] text-[#43E8FF]'
                          : 'text-[#A4B0C6] hover:text-[#F1F5FF]'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <ToggleRow
                label="Reduced Camera Shake"
                desc="Disable camera shake, sonar pulse flash, and motion spikes"
                checked={settings.reducedShake}
                onChange={(v) => onUpdateSettings({ ...settings, reducedShake: v })}
              />

              <ToggleRow
                label="On-Screen Touch Controls"
                desc="Display virtual joystick and Jump / Echo / Use buttons"
                checked={settings.touchControls}
                onChange={(v) => onUpdateSettings({ ...settings, touchControls: v })}
              />

              <ToggleRow
                label="AI Narration (Echo Keeper)"
                desc="Dynamic poetic lore whispers and adaptive hints powered by Gemini"
                checked={settings.aiNarration}
                onChange={(v) => onUpdateSettings({ ...settings, aiNarration: v })}
              />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[#F1F5FF]">Narration &amp; Hint Language</div>
                  <div className="text-xs text-[#A4B0C6]">Language used for Echo Keeper whispers, hints &amp; recaps</div>
                </div>
                <select
                  aria-label="Narration Language"
                  value={settings.narrationLanguage}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      narrationLanguage: e.target.value as NarrationLanguage,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-md bg-[#070B16] border border-[#3986FF]/35 text-xs text-[#F1F5FF]"
                >
                  <option value="en">English</option>
                  <option value="bn">বাংলা</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <ToggleRow
                label="Narration Voice (Speech)"
                desc={
                  speechSupported
                    ? 'Read Echo Keeper whispers and hints aloud with browser speech'
                    : 'Text-only mode active (Speech Synthesis unsupported in this browser)'
                }
                checked={speechSupported && settings.narrationVoice}
                disabled={!speechSupported}
                onChange={(v) => onUpdateSettings({ ...settings, narrationVoice: v })}
              />

              {speechSupported && settings.narrationVoice && (
                <div className="pl-3 border-l-2 border-[#43E8FF]/30 space-y-2.5">
                  {voices.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#A4B0C6]">Voice</span>
                      <select
                        aria-label="Narration Voice"
                        value={settings.narrationVoiceName}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, narrationVoiceName: e.target.value })
                        }
                        className="max-w-[240px] px-2 py-1 rounded bg-[#070B16] border border-[#3986FF]/35 text-xs text-[#F1F5FF]"
                      >
                        <option value="">Auto-match language</option>
                        {voices.map((v) => (
                          <option key={`${v.name}-${v.lang}`} value={v.name}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <SliderRow
                    label="Voice Speed"
                    min={0.7}
                    max={1.4}
                    step={0.05}
                    value={settings.narrationRate}
                    isPercent={false}
                    onChange={(v) => onUpdateSettings({ ...settings, narrationRate: v })}
                  />
                </div>
              )}

              <ToggleRow
                label="Adaptive Assist"
                desc="Steady Echo Energy regen (+25%) and offer hints after 3 falls in a section (disabled in Speedrun & Daily Trials)"
                checked={settings.adaptiveAssist}
                onChange={(v) => onUpdateSettings({ ...settings, adaptiveAssist: v })}
              />

              <ToggleRow
                label="Show PB Ghost Replay"
                desc="Race against a translucent 3D ghost of the fastest recorded run"
                checked={settings.showGhost}
                onChange={(v) => onUpdateSettings({ ...settings, showGhost: v })}
              />

              <ToggleRow
                label="Speedrun Mode"
                desc="Display tenth-second timer, checkpoint splits, and suppress lore popups"
                checked={settings.speedrunMode}
                onChange={(v) => onUpdateSettings({ ...settings, speedrunMode: v })}
              />
            </div>

            {/* Accessibility Section */}
            <div className="border-t border-[#3986FF]/20 pt-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#43E8FF]">
                Accessibility &amp; Display
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[#F1F5FF]">Colorblind Sonar Palette</div>
                  <div className="text-xs text-[#A4B0C6]">Adjust sonar ring and wave colors</div>
                </div>
                <select
                  aria-label="Colorblind Sonar Palette"
                  value={settings.colorblindMode}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, colorblindMode: e.target.value as ColorblindMode })
                  }
                  className="px-2.5 py-1.5 rounded-md bg-[#070B16] border border-[#3986FF]/35 text-xs text-[#F1F5FF]"
                >
                  <option value="none">Default (Cyan / Violet)</option>
                  <option value="deuteranopia">Deuteranopia</option>
                  <option value="protanopia">Protanopia</option>
                  <option value="tritanopia">Tritanopia</option>
                </select>
              </div>

              <ToggleRow
                label="High Contrast Sonar"
                desc="Increase baseline outline visibility on hidden platforms"
                checked={settings.highContrastSonar}
                onChange={(v) => onUpdateSettings({ ...settings, highContrastSonar: v })}
              />

              <ToggleRow
                label="Directional Sound Subtitles"
                desc="Show spatial audio captions like [Drone Alerted · Left]"
                checked={settings.soundSubtitles}
                onChange={(v) => onUpdateSettings({ ...settings, soundSubtitles: v })}
              />

              <SliderRow
                label="HUD Scale"
                min={0.8}
                max={1.4}
                step={0.05}
                value={settings.hudScale}
                onChange={(v) => onUpdateSettings({ ...settings, hudScale: v })}
              />
            </div>

            {/* Key Rebinding Section */}
            <div className="border-t border-[#3986FF]/20 pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#43E8FF]">
                  Key Bindings (Gamepad Plug-and-Play Supported)
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      keyBindings: { ...DEFAULT_KEY_BINDINGS },
                    })
                  }
                  className="text-xs text-[#A4B0C6] hover:text-[#F1F5FF] underline"
                >
                  Reset Defaults
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {KEYBIND_LABELS.map(({ action, label }) => {
                  const waiting = rebindingAction === action;
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#070B16] border border-[#3986FF]/20"
                    >
                      <span className="text-[#A4B0C6]">{label}</span>
                      <button
                        type="button"
                        onClick={() => setRebindingAction(waiting ? null : action)}
                        className={`px-2 py-0.5 rounded font-mono-num font-medium ${
                          waiting
                            ? 'bg-[#FFC857] text-[#070B16]'
                            : 'bg-[#10182A] text-[#43E8FF] border border-[#3986FF]/35'
                        }`}
                      >
                        {waiting ? 'Press Key...' : formatKeyCode(settings.keyBindings[action])}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (modal === 'HOW_TO_PLAY' || modal === 'CONTROLS') {
    const kb = settings.keyBindings;
    return (
      <ModalFrame labelledBy="modal-help-title" onClose={onCloseModal}>
        <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
            <h2 id="modal-help-title" className="font-display text-xl font-bold text-[#F1F5FF]">
              {modal === 'CONTROLS' ? 'Controls' : 'How to Play'}
            </h2>
            <button
              type="button"
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF]"
            >
              Back
            </button>
          </div>

          <div className="mt-4 overflow-y-auto space-y-4 text-sm text-[#A4B0C6]">
            {modal === 'HOW_TO_PLAY' && (
              <p className="text-[#F1F5FF] leading-relaxed">
                Explore a sunken ancient civilization shrouded in darkness. Activate your{' '}
                <span className="text-[#43E8FF] font-semibold">
                  Echo Core [{formatKeyCode(kb.pulse)}]
                </span>{' '}
                to emit a 3D sonar wave that temporarily reveals invisible stone bridges, secret passages, hazards, and mechanisms.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 border-t border-[#3986FF]/20 pt-3 text-xs">
              <ControlLine
                k={`${formatKeyCode(kb.forward)}/${formatKeyCode(kb.left)}/${formatKeyCode(kb.backward)}/${formatKeyCode(kb.right)}`}
                v="Move / Left Stick"
              />
              <ControlLine k="Mouse / Right Stick" v="Rotate 3D Camera" />
              <ControlLine k={`${formatKeyCode(kb.jump)} / [A]`} v="Jump" />
              <ControlLine k={`${formatKeyCode(kb.pulse)} (Tap) / [X]`} v="Emit Echo Pulse" />
              <ControlLine k={`${formatKeyCode(kb.pulse)} (Hold)`} v="Charged Pulse (1.8x)" />
              <ControlLine k={`${formatKeyCode(kb.crouch)} / Ctrl / [B]`} v="Crouch (Silent)" />
              <ControlLine k={`${formatKeyCode(kb.interact)} / [Y]`} v="Activate Seals & Statues" />
              <ControlLine k={formatKeyCode(kb.hint)} v="Ask Echo Keeper (Hint)" />
              <ControlLine k={formatKeyCode(kb.restart)} v="Restart Checkpoint" />
              <ControlLine k={formatKeyCode(kb.photo)} v="Photo Mode Snapshot" />
              <ControlLine k="F3" v="Performance Stats" />
              <ControlLine k="Escape / Start" v="Pause / Release Mouse" />
            </div>

            <div className="border-t border-[#3986FF]/20 pt-3 space-y-1.5 text-xs">
              <div>
                <span className="text-[#43E8FF] font-semibold">Cyan Platforms &amp; Mirrors:</span> Revealed by sonar for ~2.5s; pulsing Mirror Crystals casts a forward light beam.
              </div>
              <div>
                <span className="text-[#9B7BFF] font-semibold">Glyph Pads &amp; Resonance Doors:</span> Pulse a colored Glyph Pad to unlock its matching sealed door.
              </div>
              <div>
                <span className="text-[#FFC857] font-semibold">Amber Echo Fragments:</span> {TOTAL_CAMPAIGN_FRAGMENTS} relics hidden across all 5 chambers.
              </div>
              <div>
                <span className="text-[#FF526B] font-semibold">Crumbling Slabs &amp; Sound Drones:</span> Shaking slabs collapse after 0.8s; crouch with [{formatKeyCode(kb.crouch)}] near blind drones so your footsteps go unheard.
              </div>
            </div>
          </div>
        </div>
      </ModalFrame>
    );
  }

  if (modal === 'ABOUT') {
    return (
      <ModalFrame labelledBy="modal-about-title" onClose={onCloseModal}>
        <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
            <h2 id="modal-about-title" className="font-display text-xl font-bold text-[#F1F5FF]">
              About &amp; How It Was Built
            </h2>
            <button
              type="button"
              onClick={onCloseModal}
              className="px-3 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF]"
            >
              Back
            </button>
          </div>

          <div className="mt-4 overflow-y-auto space-y-3.5 pr-1 text-xs text-[#A4B0C6] leading-relaxed">
            <p className="text-sm text-[#F1F5FF]">
              <span className="text-[#43E8FF] font-semibold">Echoes of the Dark</span> is a 3D acoustic-spatial puzzle adventure where sound replaces sight.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-md bg-[#070B16] border border-[#3986FF]/20">
                <div className="font-semibold text-[#43E8FF]">3D Rendering &amp; GLSL Sonar</div>
                <p className="mt-1">
                  Three.js WebGL PBR ruins, custom GLSL expanding sonar dome shaders, instanced cave formations, and directional Mirror Crystal beams.
                </p>
              </div>
              <div className="p-3 rounded-md bg-[#070B16] border border-[#3986FF]/20">
                <div className="font-semibold text-[#9B7BFF]">Gemini AI &amp; Echo Trials</div>
                <p className="mt-1">
                  Server-side <code className="text-[#F1F5FF]">@google/genai</code> generates structured chamber layouts and adaptive Echo Keeper hints with deterministic fallbacks.
                </p>
              </div>
              <div className="p-3 rounded-md bg-[#070B16] border border-[#3986FF]/20">
                <div className="font-semibold text-[#FFC857]">Physics, BFS &amp; Ghost Replays</div>
                <p className="mt-1">
                  Every level &amp; seed passes a BFS reachability validator. Best runs encode 10 Hz quantized frames into compact &lt;40 KB binary ghosts.
                </p>
              </div>
              <div className="p-3 rounded-md bg-[#070B16] border border-[#3986FF]/20">
                <div className="font-semibold text-[#F1F5FF]">Procedural Audio &amp; Full-Stack</div>
                <p className="mt-1">
                  Zero-asset Web Audio synth with procedural impulse cavern reverb, backed by Express, MongoDB Atlas, JWT auth, and offline Guest Mode.
                </p>
              </div>
            </div>

            {worldStats && (
              <div className="p-3 rounded-md bg-[#070B16] border border-[#43E8FF]/30">
                <div className="text-[11px] uppercase tracking-wider text-[#43E8FF] font-semibold">
                  World Echoes Telemetry
                </div>
                {worldStats.offline ? (
                  <p className="mt-1 text-[#A4B0C6]">
                    Running in local offline mode — connect MongoDB Atlas to stream global explorer telemetry.
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num">
                    <div>
                      <div className="text-[10px] text-[#A4B0C6]">Explorers</div>
                      <div className="text-sm font-semibold text-[#F1F5FF]">{worldStats.totalExplorers}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A4B0C6]">Fragments</div>
                      <div className="text-sm font-semibold text-[#FFC857]">{worldStats.totalFragmentsCollected}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A4B0C6]">Trials Cleared</div>
                      <div className="text-sm font-semibold text-[#9B7BFF]">{worldStats.totalTrialRuns}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A4B0C6]">Sonar Waves</div>
                      <div className="text-sm font-semibold text-[#43E8FF]">{worldStats.totalPulsesEmitted}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-1 space-y-1">
              <p>
                <span className="text-[#F1F5FF] font-medium">Theme Alignment:</span>{' '}
                {THEME_CONFIG.officialThemeText}
              </p>
              <p>{THEME_CONFIG.themeExplanation}</p>
            </div>
          </div>
        </div>
      </ModalFrame>
    );
  }

  // PAUSE MENU
  if (hud.gameState === 'PAUSED') {
    return (
      <ModalFrame labelledBy="modal-pause-title" onClose={onResume} zIndexClass="z-20">
        <div className="w-full max-w-sm rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6 text-center">
          <div className="text-xs text-[#43E8FF]">
            Level 0{hud.levelNumber} · {hud.levelName}
          </div>
          <h2 id="modal-pause-title" className="mt-1 font-display text-2xl font-bold text-[#F1F5FF]">
            Paused
          </h2>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="min-h-[42px] w-full px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF]"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={onRestartCheckpoint}
              className="min-h-[42px] w-full px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-[#F1F5FF] text-sm hover:border-[#43E8FF]/60"
            >
              Restart Checkpoint
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('SETTINGS')}
              className="min-h-[42px] w-full px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-[#F1F5FF] text-sm hover:border-[#43E8FF]/60"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('CONTROLS')}
              className="min-h-[42px] w-full px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-[#F1F5FF] text-sm hover:border-[#43E8FF]/60"
            >
              Controls
            </button>
            <button
              type="button"
              onClick={onSaveAndExit}
              className="min-h-[42px] w-full px-4 py-2 rounded-md bg-[#10182A] border border-[#9B7BFF]/40 text-[#F1F5FF] text-sm hover:border-[#9B7BFF]"
            >
              Save and Exit
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="min-h-[38px] w-full px-4 py-1.5 rounded-md text-[#A4B0C6] hover:text-[#F1F5FF] text-xs"
            >
              Main Menu
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  // LEVEL COMPLETE OR FINAL VICTORY
  if (hud.gameState === 'LEVEL_COMPLETE' || hud.gameState === 'VICTORY') {
    if (hud.isTrial && hud.trialMeta) {
      const shareCode = hud.trialMeta.shareCode;
      return (
        <ModalFrame labelledBy="modal-trial-complete-title" zIndexClass="z-20">
          <div className="w-full max-w-md rounded-lg bg-[#0C1324] border border-[#FFC857]/50 p-7 text-center">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#FFC857]">
              {hud.trialMeta.isDaily ? 'Daily UTC Trial Complete' : 'Echo Trial Complete'}
            </div>
            <h2 id="modal-trial-complete-title" className="mt-2 font-display text-3xl font-bold text-[#F1F5FF]">
              {hud.trialMeta.title}
            </h2>
            <p className="mt-1 text-xs font-mono-num text-[#43E8FF]">{shareCode}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 py-4 border-y border-[#3986FF]/20 text-left">
              <div>
                <div className="text-xs text-[#A4B0C6]">Completion Time</div>
                <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#F1F5FF]">
                  {(hud.lastCompletedLevelTime ?? hud.elapsedSeconds).toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A4B0C6]">Fragments Found</div>
                <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#FFC857]">
                  {hud.levelFragmentsCollected} / {hud.levelFragmentsTotal}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A4B0C6]">Pulses Emitted</div>
                <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#43E8FF]">
                  {hud.pulsesThisLevel}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#A4B0C6]">Trial Score</div>
                <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#9B7BFF]">
                  {hud.lastTrialScore ?? '...'}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(shareCode);
                  setCopiedShare(true);
                  window.setTimeout(() => setCopiedShare(false), 1800);
                }}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-md bg-[#10182A] border border-[#FFC857]/45 text-[#FFC857] text-xs font-semibold hover:bg-[#FFC857]/10"
              >
                {copiedShare ? 'Copied Code!' : 'Copy Share Code'}
              </button>
              {onReplayTrial && (
                <button
                  type="button"
                  onClick={onReplayTrial}
                  className="flex-1 min-h-[42px] px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-xs hover:bg-[#73EFFF]"
                >
                  Replay Seed
                </button>
              )}
            </div>
            <div className="mt-2.5 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onMainMenu();
                  onOpenModal('ECHO_TRIALS');
                }}
                className="flex-1 min-h-[40px] px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/35 text-[#F1F5FF] text-xs hover:border-[#43E8FF]/60"
              >
                New Trial
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="flex-1 min-h-[40px] px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/35 text-[#A4B0C6] text-xs hover:text-[#F1F5FF]"
              >
                Main Menu
              </button>
            </div>
          </div>
        </ModalFrame>
      );
    }

    const isVictory = hud.gameState === 'VICTORY';
    const nextLvl = Math.min(5, hud.levelNumber + 1) as 1 | 2 | 3 | 4 | 5;
    const medalColor =
      hud.lastMedal === 'gold'
        ? '#FFC857'
        : hud.lastMedal === 'silver'
          ? '#D8E3F8'
          : hud.lastMedal === 'bronze'
            ? '#E09F67'
            : null;
    const medalLabel =
      hud.lastMedal === 'gold'
        ? 'Gold Medal'
        : hud.lastMedal === 'silver'
          ? 'Silver Medal'
          : hud.lastMedal === 'bronze'
            ? 'Bronze Medal'
            : null;

    return (
      <ModalFrame labelledBy="modal-level-complete-title" zIndexClass="z-20">
        <div className="w-full max-w-md rounded-lg bg-[#0C1324] border border-[#43E8FF]/45 p-7 text-center">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#43E8FF]">
            {isVictory ? 'Sanctum Restored' : `Level 0${hud.levelNumber} Complete`}
          </div>
          <h2 id="modal-level-complete-title" className="mt-2 font-display text-3xl font-bold text-[#F1F5FF]">
            {isVictory ? THEME_CONFIG.victoryTitle : hud.levelName}
          </h2>
          <p className="mt-2 text-sm text-[#A4B0C6] leading-relaxed">
            {isVictory ? THEME_CONFIG.victoryMessage : 'The ancient door seals behind you as deeper echoes beckon.'}
          </p>
          {medalLabel && medalColor && (
            <div className="mt-3 text-xs font-semibold tracking-wide" style={{ color: medalColor }}>
              Stage Rank: {medalLabel}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 py-4 border-y border-[#3986FF]/20 text-left">
            <div>
              <div className="text-xs text-[#A4B0C6]">Completion Time</div>
              <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#F1F5FF]">
                {formatTime(hud.lastCompletedLevelTime ?? hud.elapsedSeconds, settings.speedrunMode)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#A4B0C6]">Total Fragments</div>
              <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#FFC857]">
                {hud.totalFragmentsCollected} / {TOTAL_CAMPAIGN_FRAGMENTS}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#A4B0C6]">Pulses Emitted</div>
              <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#43E8FF]">
                {hud.pulsesThisLevel}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#A4B0C6]">Verified Score</div>
              <div className="mt-0.5 text-lg font-semibold font-mono-num text-[#9B7BFF]">
                {hud.judgeMode
                  ? 'Showcase Only'
                  : hud.lastServerScore !== null
                    ? hud.lastServerScore
                    : 'Local Run'}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-[#3986FF]/15 text-xs">
              <span className="text-[#A4B0C6]">Hints Used / Sound Alerts</span>
              <span className="font-mono-num text-[#F1F5FF] font-semibold">
                {hud.hintsUsed} hints · {hud.soundAlertCount} alerts
              </span>
            </div>
          </div>

          {hud.checkpointSplits.length > 0 && (
            <div className="mt-3 rounded-md bg-[#070B16]/75 border border-[#3986FF]/20 px-3 py-2 text-left text-xs font-mono-num space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-[#A4B0C6] font-sans">
                Checkpoint Splits
              </div>
              {hud.checkpointSplits.map((sp) => (
                <div key={sp.label} className="flex items-center justify-between gap-3">
                  <span className="text-[#A4B0C6]">{sp.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#F1F5FF]">{formatTime(sp.time, true)}</span>
                    {sp.delta !== null && (
                      <span className={sp.delta <= 0 ? 'text-[#43E8FF]' : 'text-[#FFC857]'}>
                        {sp.delta <= 0 ? `${sp.delta.toFixed(1)}s` : `+${sp.delta.toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Journey Recap */}
          <div className="mt-4 rounded-md bg-[#070B16]/85 border border-[#43E8FF]/25 p-3 text-left">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#43E8FF]">
              <span>Echo Keeper Journey Recap</span>
              {recapSource && (
                <span className="text-[10px] text-[#A4B0C6] normal-case">
                  {recapSource === 'gemini' ? 'Gemini AI' : 'Chronicle'}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#F1F5FF] leading-relaxed">
              {recapLoading ? 'Composing your subterranean chronicle...' : recapText ?? ''}
            </p>
          </div>

          {hud.newlyUnlockedAchievements.length > 0 && (
            <div className="mt-3 text-xs text-[#FFC857]">
              Unlocked Achievements: {hud.newlyUnlockedAchievements.join(', ')}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={shareCardBusy || recapLoading}
              onClick={async () => {
                setShareCardBusy(true);
                try {
                  const timeStr = formatTime(
                    hud.lastCompletedLevelTime ?? hud.elapsedSeconds,
                    settings.speedrunMode
                  );
                  const summary = recapText || THEME_CONFIG.victoryMessage;
                  const shareText = `Echoes of the Dark — Level 0${hud.levelNumber} (${hud.levelName}) cleared in ${timeStr} | Fragments: ${hud.totalFragmentsCollected}/${TOTAL_CAMPAIGN_FRAGMENTS} | Pulses: ${hud.pulsesThisLevel}${hud.lastMedal ? ` | ${hud.lastMedal.toUpperCase()} MEDAL` : ''}\n"${summary}"`;
                  void navigator.clipboard?.writeText(shareText);

                  const blob = await renderShareCardBlob({
                    levelNumber: hud.levelNumber,
                    levelName: hud.levelName,
                    isVictory,
                    timeFormatted: timeStr,
                    fragmentsCollected: hud.totalFragmentsCollected,
                    fragmentsTotal: TOTAL_CAMPAIGN_FRAGMENTS,
                    pulsesUsed: hud.pulsesThisLevel,
                    hintsUsed: hud.hintsUsed,
                    medal: hud.lastMedal,
                    recapText: summary,
                  });
                  if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `echoes-level-0${hud.levelNumber}-card.png`;
                    a.click();
                    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
                  }
                  setShareCardSaved(true);
                  window.setTimeout(() => setShareCardSaved(false), 2400);
                } finally {
                  setShareCardBusy(false);
                }
              }}
              className="w-full min-h-[40px] px-4 py-2 rounded-md bg-[#10182A] border border-[#9B7BFF]/55 text-[#F1F5FF] text-xs font-semibold hover:border-[#43E8FF] disabled:opacity-50"
            >
              {shareCardBusy
                ? 'Rendering Share Card...'
                : shareCardSaved
                  ? 'PNG Saved & Summary Copied!'
                  : 'Share Card (Download PNG + Copy Summary)'}
            </button>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            {!isVictory ? (
              <button
                type="button"
                onClick={() => onNextLevel(nextLvl)}
                className="flex-1 min-h-[44px] px-5 py-2.5 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF]"
              >
                Next Level (0{nextLvl})
              </button>
            ) : (
              <button
                type="button"
                onClick={onReplayGame}
                className="flex-1 min-h-[44px] px-5 py-2.5 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF]"
              >
                Play Again
              </button>
            )}
            <button
              type="button"
              onClick={onMainMenu}
              className="flex-1 min-h-[44px] px-5 py-2.5 rounded-md bg-[#10182A] border border-[#3986FF]/35 text-[#F1F5FF] text-sm hover:border-[#43E8FF]/60"
            >
              Return to Menu
            </button>
          </div>
        </div>
      </ModalFrame>
    );
  }

  return null;
}

function ControlLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono-num text-[#43E8FF] font-medium">{k}</span>
      <span className="text-[#F1F5FF]">{v}</span>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div>
        <div className="text-sm font-medium text-[#F1F5FF]">{label}</div>
        <div className="text-xs text-[#A4B0C6]">{desc}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#43E8FF] cursor-pointer shrink-0"
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  disabled = false,
  isPercent = true,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  isPercent?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={disabled ? 'opacity-45' : ''}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#F1F5FF] font-medium">{label}</span>
        <span className="font-mono-num text-[#A4B0C6]">
          {isPercent ? `${Math.round(value * 100)}%` : `${value.toFixed(1)}x`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#43E8FF] cursor-pointer"
      />
    </div>
  );
}
