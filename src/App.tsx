import { useCallback, useEffect, useRef, useState } from 'react';
import { Game3DEngine } from './game/engine3d';
import {
  GameSettings,
  HudSnapshot,
  Level3DDefinition,
  ModalView,
  ProgressData,
  UserProfile,
} from './game/types';
import {
  checkApiHealth,
  clearGuestProgress,
  DEFAULT_PROGRESS,
  fetchBestGhostForLevel,
  fetchWorldStats,
  hasSubstantialGuestProgress,
  loadGuestProgress,
  loadSettings,
  migrateGuestProgressToAccount,
  saveGuestProgress,
  saveSettings,
  submitGhostReplay,
  submitLevelCompleteToServer,
  submitTrialComplete,
  syncCheckpointToServer,
  WorldStats,
} from './services/progress';
import { fetchSessionUser, logoutAccount } from './services/auth';
import { getStoredToken } from './services/api';
import { GameHud } from './components/GameHud';
import { MainMenuOverlay } from './components/MainMenuOverlay';
import { AccountModals } from './components/AccountModals';
import { GameModals } from './components/GameModals';
import { TrialModal } from './components/TrialModal';
import { CodexModal } from './components/CodexModal';
import { speakNarration, stopNarration } from './services/voiceNarration';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Game3DEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData>(() => loadGuestProgress());
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalView>('NONE');
  const [pendingGuestMigration, setPendingGuestMigration] = useState<ProgressData | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [judgeMode, setJudgeMode] = useState<boolean>(false);
  const [worldStats, setWorldStats] = useState<WorldStats | null>(null);
  const activeTrialRef = useRef<Level3DDefinition | null>(null);

  // Refs for stable access inside engine callbacks
  const userRef = useRef<UserProfile | null>(null);
  const progressRef = useRef<ProgressData>(progress);
  const settingsRef = useRef<GameSettings>(settings);
  userRef.current = user;
  progressRef.current = progress;
  settingsRef.current = settings;

  // Bootstrap health check and existing JWT session
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      let offline = false;
      try {
        const health = await checkApiHealth();
        offline = health.database !== 'connected';
      } catch {
        offline = true;
      }

      if (!active) return;
      setIsOffline(offline);

      if (!offline && getStoredToken()) {
        try {
          const session = await fetchSessionUser();
          if (!active) return;
          setUser(session.user);
          setProgress(session.progress);
          engineRef.current?.syncExternalProgress(
            session.progress.collectedFragments,
            session.progress.secretsDiscovered,
            false
          );
          return;
        } catch {
          // Token expired or invalid
          logoutAccount();
        }
      }

      const guest = loadGuestProgress();
      engineRef.current?.syncExternalProgress(
        guest.collectedFragments,
        guest.secretsDiscovered,
        offline
      );
    }

    bootstrap();
    fetchWorldStats()
      .then((stats) => {
        if (active) setWorldStats(stats);
      })
      .catch(() => {});

    const handleOnline = () => {
      checkApiHealth()
        .then((h) => {
          const off = h.database !== 'connected';
          setIsOffline(off);
          engineRef.current?.syncExternalProgress(
            progressRef.current.collectedFragments,
            progressRef.current.secretsDiscovered,
            off
          );
        })
        .catch(() => setIsOffline(true));
    };
    window.addEventListener('online', handleOnline);
    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Mount Three.js 3D Engine once in isolated container
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new Game3DEngine(container, settings, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onCheckpointSave: async (payload) => {
        const current = progressRef.current;
        const nextLocal: ProgressData = {
          ...current,
          currentLevel: payload.level,
          checkpoint: payload.checkpoint,
          collectedFragments: payload.collectedFragments,
          pulsesEmitted: current.pulsesEmitted + payload.pulsesDelta,
          secretsDiscovered: payload.secretsDiscovered,
          doorsOpenedCount: (current.doorsOpenedCount ?? 0) + payload.doorsOpenedDelta,
        };
        setProgress(nextLocal);

        if (!userRef.current) {
          saveGuestProgress(nextLocal);
          return;
        }

        try {
          const res = await syncCheckpointToServer(payload);
          setProgress(res.progress);
          setIsOffline(false);
          engineRef.current?.setServerFeedback(
            res.progress.totalScore,
            res.newlyUnlockedAchievements,
            false
          );
        } catch {
          saveGuestProgress(nextLocal);
          setIsOffline(true);
          engineRef.current?.setServerFeedback(null, [], true);
        }
      },
      onLevelCompleted: async (payload) => {
        const current = progressRef.current;
        const completed = Array.from(new Set([...current.completedLevels, payload.level])).sort(
          (a, b) => a - b
        );
        const bestTimes = { ...current.bestCompletionTimes };
        const key = String(payload.level);
        if (bestTimes[key] === undefined || payload.completionTimeSeconds < bestTimes[key]) {
          bestTimes[key] = payload.completionTimeSeconds;
        }
        const noAlerts = payload.noAlertClear
          ? Array.from(new Set([...(current.noAlertCompletedLevels ?? []), payload.level])).sort(
              (a, b) => a - b
            )
          : current.noAlertCompletedLevels ?? [];

        const nextLocal: ProgressData = {
          ...current,
          currentLevel: Math.min(5, payload.level + 1),
          completedLevels: completed,
          collectedFragments: payload.collectedFragments,
          bestCompletionTimes: bestTimes,
          checkpoint: null,
          pulsesEmitted: current.pulsesEmitted + payload.pulsesDelta,
          secretsDiscovered: payload.secretsDiscovered,
          doorsOpenedCount: (current.doorsOpenedCount ?? 0) + payload.doorsOpenedDelta,
          noAlertCompletedLevels: noAlerts,
        };
        setProgress(nextLocal);

        if (payload.ghostData) {
          void submitGhostReplay({
            levelNumber: payload.level,
            username: userRef.current?.username ?? 'Guest',
            timeSeconds: payload.completionTimeSeconds,
            data: payload.ghostData,
          });
        }

        if (!userRef.current) {
          saveGuestProgress(nextLocal);
          return;
        }

        try {
          const res = await submitLevelCompleteToServer(payload);
          setProgress(res.progress);
          setIsOffline(false);
          engineRef.current?.setServerFeedback(
            res.progress.totalScore,
            res.newlyUnlockedAchievements,
            false
          );
        } catch {
          saveGuestProgress(nextLocal);
          setIsOffline(true);
          engineRef.current?.setServerFeedback(null, [], true);
        }
      },
      onTrialCompleted: async (payload) => {
        const res = await submitTrialComplete(payload);
        engineRef.current?.setTrialServerFeedback(res.score, Boolean(res.offline));
      },
      onTutorialCompleted: () => {
        const next = { ...settingsRef.current, tutorialCompleted: true };
        setSettings(next);
        saveSettings(next);
      },
      onQualityAutoDowngrade: (nextQuality) => {
        const next = { ...settingsRef.current, quality: nextQuality };
        setSettings(next);
        saveSettings(next);
      },
    });

    engineRef.current = engine;
    const initial = loadGuestProgress();
    engine.syncExternalProgress(initial.collectedFragments, initial.secretsDiscovered, isOffline);
    setHud(engine.getHudSnapshot());

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
    if (!next.narrationVoice || next.muted) {
      stopNarration();
    }
  }, []);

  const lastSpokenLoreRef = useRef<string | null>(null);
  useEffect(() => {
    const msg = hud?.loreMessage ?? null;
    if (!msg) {
      lastSpokenLoreRef.current = null;
      return;
    }
    if (hud?.gameState !== 'PLAYING' || settings.muted || !settings.narrationVoice) {
      stopNarration();
      return;
    }
    if (msg !== lastSpokenLoreRef.current) {
      lastSpokenLoreRef.current = msg;
      speakNarration(msg, settings);
    }
  }, [hud?.loreMessage, hud?.gameState, settings]);

  const handleLaunchTrial = useCallback((trialLevel: Level3DDefinition) => {
    activeTrialRef.current = trialLevel;
    setModal('NONE');
    engineRef.current?.startTrialLevel(trialLevel);
  }, []);

  const handleToggleJudgeMode = useCallback(() => {
    setJudgeMode((prev) => {
      const next = !prev;
      engineRef.current?.setJudgeMode(next);
      if (!next) {
        engineRef.current?.syncExternalProgress(
          progressRef.current.collectedFragments,
          progressRef.current.secretsDiscovered,
          isOffline
        );
      }
      return next;
    });
  }, [isOffline]);

  const handleStartShowcaseFlythrough = useCallback((levelNum?: 1 | 2 | 3 | 4 | 5) => {
    if (!judgeMode) {
      setJudgeMode(true);
      engineRef.current?.setJudgeMode(true);
    }
    if (levelNum) {
      setModal('NONE');
      engineRef.current?.startLevel(levelNum, null);
    }
    engineRef.current?.startShowcaseFlythrough();
  }, [judgeMode]);

  const handleStartLevel = useCallback(
    (levelNum?: 1 | 2 | 3 | 4 | 5) => {
      const target = (levelNum ?? Math.min(5, Math.max(1, progress.currentLevel))) as
        | 1
        | 2
        | 3
        | 4
        | 5;
      const cp =
        !judgeMode && progress.checkpoint && progress.checkpoint.level === target
          ? progress.checkpoint
          : null;
      setModal('NONE');
      engineRef.current?.startLevel(target, cp);
      void fetchBestGhostForLevel(target).then((ghost) => {
        engineRef.current?.setActiveGhost(ghost);
      });
    },
    [progress, judgeMode]
  );

  const handleAuthSuccess = useCallback((authedUser: UserProfile, serverProgress: ProgressData) => {
    setUser(authedUser);
    setIsOffline(false);

    const localGuest = loadGuestProgress();
    if (hasSubstantialGuestProgress(localGuest)) {
      setProgress(serverProgress);
      setPendingGuestMigration(localGuest);
      setModal('MIGRATE_PROMPT');
      engineRef.current?.syncExternalProgress(
        serverProgress.collectedFragments,
        serverProgress.secretsDiscovered,
        false
      );
    } else {
      setProgress(serverProgress);
      setModal('NONE');
      engineRef.current?.syncExternalProgress(
        serverProgress.collectedFragments,
        serverProgress.secretsDiscovered,
        false
      );
    }
  }, []);

  const handleConfirmMigrateGuest = useCallback(async () => {
    if (!pendingGuestMigration) {
      setModal('NONE');
      return;
    }
    try {
      const res = await migrateGuestProgressToAccount(pendingGuestMigration);
      setProgress(res.progress);
      clearGuestProgress();
      engineRef.current?.syncExternalProgress(
        res.progress.collectedFragments,
        res.progress.secretsDiscovered,
        false
      );
    } catch {
      // Keep local backup if sync fails
    } finally {
      setPendingGuestMigration(null);
      setModal('NONE');
    }
  }, [pendingGuestMigration]);

  const handleSkipMigrateGuest = useCallback(() => {
    clearGuestProgress();
    setPendingGuestMigration(null);
    setModal('NONE');
  }, []);

  const handleLogout = useCallback(() => {
    logoutAccount();
    setUser(null);
    const guest = loadGuestProgress();
    setProgress(guest);
    setModal('NONE');
    engineRef.current?.syncExternalProgress(
      guest.collectedFragments,
      guest.secretsDiscovered,
      isOffline
    );
  }, [isOffline]);

  const handleSaveAndExit = useCallback(() => {
    const snap = engineRef.current?.getHudSnapshot();
    if (snap && userRef.current) {
      syncCheckpointToServer({
        level: snap.levelNumber,
        checkpoint: progressRef.current.checkpoint,
        collectedFragments: progressRef.current.collectedFragments,
        pulsesDelta: 0,
        secretsDiscovered: progressRef.current.secretsDiscovered,
      }).catch(() => {});
    }
    setModal('NONE');
    engineRef.current?.returnToMenu();
  }, []);

  const isMenu = !hud || hud.gameState === 'MENU';
  const isPlaying = hud?.gameState === 'PLAYING';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070B16]">
      {/* Isolated Three.js WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {hud?.webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B16]/95 p-6 text-center">
          <div className="max-w-md rounded-lg bg-[#10182A] border border-[#FF526B]/50 p-6">
            <h2 className="font-display text-xl font-bold text-[#F1F5FF]">WebGL Notice</h2>
            <p className="mt-2 text-sm text-[#A4B0C6]">{hud.webglError}</p>
          </div>
        </div>
      )}

      {/* Initial Styled Engine Loading Screen */}
      {(!hud || !hud.engineReady) && !hud?.webglError && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#070B16] p-6 text-center"
        >
          <div className="font-display text-2xl font-bold tracking-wider text-[#F1F5FF]">
            ECHOES OF THE DARK
          </div>
          <p className="mt-2 text-xs text-[#43E8FF] tracking-widest uppercase">
            Initializing 3D WebGL Sanctum...
          </p>
        </div>
      )}

      {/* Main Menu */}
      {isMenu && hud?.engineReady && modal === 'NONE' && (
        <MainMenuOverlay
          user={user}
          progress={progress}
          isOffline={isOffline}
          judgeMode={judgeMode}
          worldStats={worldStats}
          onToggleJudgeMode={handleToggleJudgeMode}
          onStartShowcaseFlythrough={() => handleStartShowcaseFlythrough(1)}
          onPlayGuestOrContinue={handleStartLevel}
          onOpenModal={(m) => setModal(m)}
          onLogout={handleLogout}
        />
      )}

      {/* Active Gameplay HUD */}
      {isPlaying && hud && (
        <GameHud
          hud={hud}
          settings={settings}
          user={user}
          onToggleMute={() => handleUpdateSettings({ ...settings, muted: !settings.muted })}
          onPause={() => engineRef.current?.pause()}
          onRestartCheckpoint={() => engineRef.current?.restartCheckpoint()}
          onRequestHint={() => {
            void engineRef.current?.requestHint();
          }}
          onSkipTutorial={() => engineRef.current?.skipTutorial()}
          onTogglePhotoMode={() => engineRef.current?.togglePhotoMode()}
          onToggleFlythrough={() => {
            if (hud.showcaseFlythroughRemaining !== null) {
              engineRef.current?.stopShowcaseFlythrough();
            } else {
              engineRef.current?.startShowcaseFlythrough();
            }
          }}
          onCapturePhoto={async () => {
            const blob = await engineRef.current?.capturePhotoBlob();
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `echoes-of-the-dark-l0${hud.levelNumber}.png`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
          onVirtualInput={(opts) => engineRef.current?.setVirtualInput(opts)}
        />
      )}

      {/* Pause, Victory, Level Complete, Settings, How to Play, Controls, About */}
      {hud && (
        <GameModals
          hud={hud}
          modal={modal}
          settings={settings}
          worldStats={worldStats}
          onCloseModal={() => setModal('NONE')}
          onOpenModal={(m) => setModal(m)}
          onResume={() => engineRef.current?.resume()}
          onRestartCheckpoint={() => {
            engineRef.current?.restartCheckpoint();
            engineRef.current?.resume();
          }}
          onSaveAndExit={handleSaveAndExit}
          onMainMenu={() => {
            setModal('NONE');
            engineRef.current?.returnToMenu();
          }}
          onNextLevel={(nextLvl) => handleStartLevel(nextLvl)}
          onReplayGame={() => {
            if (!user) {
              const reset = { ...DEFAULT_PROGRESS };
              setProgress(reset);
              saveGuestProgress(reset);
            }
            handleStartLevel(1);
          }}
          onReplayTrial={() => {
            if (activeTrialRef.current) {
              handleLaunchTrial(activeTrialRef.current);
            }
          }}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      <TrialModal
        open={modal === 'ECHO_TRIALS'}
        onClose={() => setModal('NONE')}
        onLaunchTrial={handleLaunchTrial}
      />

      <CodexModal
        open={modal === 'CODEX'}
        collectedFragments={progress.collectedFragments}
        onClose={() => setModal('NONE')}
      />

      {/* Auth, Migration Prompt, Dashboard & Leaderboard Modals */}
      <AccountModals
        modal={modal}
        user={user}
        progress={progress}
        hasGuestMigration={Boolean(pendingGuestMigration)}
        onClose={() => setModal('NONE')}
        onOpenCodex={() => setModal('CODEX')}
        onAuthSuccess={handleAuthSuccess}
        onConfirmMigrateGuest={handleConfirmMigrateGuest}
        onSkipMigrateGuest={handleSkipMigrateGuest}
        onProfileUpdated={(updated) => setUser(updated)}
      />
    </main>
  );
}
