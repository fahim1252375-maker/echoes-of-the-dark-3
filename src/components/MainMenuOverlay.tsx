import { ModalView, ProgressData, UserProfile } from '../game/types';
import { THEME_CONFIG } from '../game/themeConfig';
import { computeLevelMedal, TOTAL_CAMPAIGN_FRAGMENTS } from '../game/levelValidator';
import { WorldStats } from '../services/progress';
import { TitleLogo } from './TitleLogo';

interface MainMenuOverlayProps {
  user: UserProfile | null;
  progress: ProgressData;
  isOffline: boolean;
  judgeMode: boolean;
  worldStats: WorldStats | null;
  onToggleJudgeMode: () => void;
  onStartShowcaseFlythrough: () => void;
  onPlayGuestOrContinue: (levelNum?: 1 | 2 | 3 | 4 | 5) => void;
  onOpenModal: (modal: ModalView) => void;
  onLogout: () => void;
}

export function MainMenuOverlay({
  user,
  progress,
  isOffline,
  judgeMode,
  worldStats,
  onToggleJudgeMode,
  onStartShowcaseFlythrough,
  onPlayGuestOrContinue,
  onOpenModal,
  onLogout,
}: MainMenuOverlayProps) {
  const resumeLevel = Math.min(5, Math.max(1, progress.currentLevel)) as 1 | 2 | 3 | 4 | 5;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between items-center p-5 sm:p-8">
      {/* Top Status Strip (unboxed clean metadata) */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 text-xs text-[#A4B0C6]">
        <div className="flex flex-wrap items-center gap-2">
          <span>{THEME_CONFIG.eventTitle}</span>
          <span aria-hidden="true">·</span>
          <span className={isOffline ? 'text-[#FFC857]' : 'text-[#43E8FF]'}>
            {isOffline ? 'Local Save Mode' : 'MongoDB Cloud Ready'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onToggleJudgeMode}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
              judgeMode
                ? 'bg-[#FFC857]/15 border-[#FFC857] text-[#FFC857]'
                : 'bg-[#10182A]/85 border-[#3986FF]/35 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#43E8FF]/60'
            }`}
          >
            {judgeMode ? 'Showcase Mode: ON' : 'Judge / Showcase Mode'}
          </button>

          {user ? (
            <>
              <span className="text-[#F1F5FF] font-medium">
                Explorer: <span className="text-[#43E8FF]">{user.username}</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenModal('DASHBOARD')}
                className="text-[#F1F5FF] hover:text-[#43E8FF] underline-offset-4 hover:underline transition-colors"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-[#A4B0C6] hover:text-[#FF526B] transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <span className="font-mono-num">
              Guest Progress: {progress.collectedFragments.length}/{TOTAL_CAMPAIGN_FRAGMENTS} Fragments
            </span>
          )}
        </div>
      </div>

      {/* Center Menu Anchor */}
      <div className="flex flex-col items-center max-w-2xl w-full text-center">
        <div className="animate-float-slow w-full">
          <TitleLogo />
        </div>

        <p className="mt-2 text-sm text-[#A4B0C6] max-w-md">{THEME_CONFIG.menuSubtitle}</p>

        {judgeMode && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-md bg-[#0C1324]/92 border border-[#FFC857]/55 text-xs text-[#FFC857]">
            <span>All 5 Chambers Unlocked · Infinite Echo · Scores Disabled</span>
            <button
              type="button"
              onClick={onStartShowcaseFlythrough}
              className="px-2.5 py-1 rounded bg-[#FFC857] text-[#070B16] font-semibold hover:bg-[#FFD87D] transition-colors"
            >
              20s Auto Fly-Through
            </button>
          </div>
        )}

        {/* Primary Action Cluster */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={() => onPlayGuestOrContinue(resumeLevel)}
            className="min-h-[44px] px-7 py-2.5 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF] transition-colors whitespace-nowrap"
          >
            {judgeMode ? `Showcase Level 0${resumeLevel}` : user ? `Continue (Level 0${resumeLevel})` : 'Play as Guest'}
          </button>

          {!user ? (
            <>
              <button
                type="button"
                onClick={() => onOpenModal('SIGN_IN')}
                className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#10182A]/90 border border-[#3986FF]/40 text-[#F1F5FF] font-medium text-sm hover:border-[#43E8FF]/70 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('REGISTER')}
                className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#10182A]/90 border border-[#9B7BFF]/45 text-[#F1F5FF] font-medium text-sm hover:border-[#9B7BFF] transition-colors whitespace-nowrap"
              >
                Create Account
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenModal('DASHBOARD')}
              className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#10182A]/90 border border-[#3986FF]/40 text-[#F1F5FF] font-medium text-sm hover:border-[#43E8FF]/70 transition-colors whitespace-nowrap"
            >
              Player Dashboard
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenModal('ECHO_TRIALS')}
            className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#10182A]/90 border border-[#FFC857]/50 text-[#FFC857] font-medium text-sm hover:bg-[#FFC857]/10 transition-colors whitespace-nowrap"
          >
            Echo Trials
          </button>
        </div>

        {/* Stage Quick Select */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          {([1, 2, 3, 4, 5] as const).map((lvl) => {
            const completed = progress.completedLevels.includes(lvl);
            const bestTime = progress.bestCompletionTimes?.[String(lvl)];
            const medal = completed && bestTime !== undefined ? computeLevelMedal(lvl, bestTime) : null;
            const medalLabel =
              medal === 'gold'
                ? 'Gold'
                : medal === 'silver'
                  ? 'Silver'
                  : medal === 'bronze'
                    ? 'Bronze'
                    : null;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onPlayGuestOrContinue(lvl)}
                className={`px-3 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
                  judgeMode
                    ? 'bg-[#10182A]/85 border-[#FFC857]/45 text-[#FFC857] hover:bg-[#FFC857]/10'
                    : completed
                      ? 'bg-[#10182A]/85 border-[#43E8FF]/45 text-[#43E8FF] hover:bg-[#43E8FF]/15'
                      : 'bg-[#10182A]/75 border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF] hover:border-[#3986FF]/60'
                }`}
              >
                Level 0{lvl}
                {judgeMode
                  ? ' · Unlocked'
                  : completed
                    ? medalLabel
                      ? ` · ${medalLabel}`
                      : ' · Cleared'
                    : ''}
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation Links */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-sm text-[#A4B0C6]">
          <button
            type="button"
            onClick={() => onOpenModal('CODEX')}
            className="py-1.5 hover:text-[#43E8FF] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
          >
            Codex ({progress.collectedFragments.length}/{TOTAL_CAMPAIGN_FRAGMENTS})
          </button>
          <span aria-hidden="true" className="text-[#3986FF]/35">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenModal('HOW_TO_PLAY')}
            className="py-1.5 hover:text-[#F1F5FF] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
          >
            How to Play
          </button>
          <span aria-hidden="true" className="text-[#3986FF]/35">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenModal('SETTINGS')}
            className="py-1.5 hover:text-[#F1F5FF] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
          >
            Settings
          </button>
          <span aria-hidden="true" className="text-[#3986FF]/35">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenModal('LEADERBOARD')}
            className="py-1.5 hover:text-[#F1F5FF] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
          >
            Leaderboard
          </button>
          <span aria-hidden="true" className="text-[#3986FF]/35">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenModal('ABOUT')}
            className="py-1.5 hover:text-[#F1F5FF] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
          >
            About
          </button>
        </div>
      </div>

      {/* Bottom World Echoes + Control Hint Line */}
      <div className="flex flex-col items-center gap-1.5 text-center text-xs text-[#A4B0C6]/90">
        {worldStats && !worldStats.offline && (
          <div className="font-mono-num text-[11px] text-[#43E8FF]/90">
            World Echoes · {worldStats.totalExplorers} Explorers · {worldStats.totalFragmentsCollected} Fragments ·{' '}
            {worldStats.totalTrialRuns} Trials · {worldStats.totalPulsesEmitted} Sonar Waves
          </div>
        )}
        <div>
          WASD Move · Mouse Camera · Space Jump · E / Hold E Charged Pulse · C Crouch (Silent) · F Interact · H Hint · Esc Pause
        </div>
      </div>
    </div>
  );
}
