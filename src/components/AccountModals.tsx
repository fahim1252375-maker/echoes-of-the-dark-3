import { useEffect, useState } from 'react';
import {
  AchievementItem,
  AvatarId,
  ModalView,
  ProgressData,
  UserProfile,
} from '../game/types';
import {
  fetchAllAchievements,
  loginAccount,
  registerAccount,
  updatePlayerProfile,
} from '../services/auth';
import { fetchLeaderboard, LeaderboardEntry } from '../services/progress';
import { computeLevelMedal, TOTAL_CAMPAIGN_FRAGMENTS } from '../game/levelValidator';
import { ApiError } from '../services/api';
import { formatTime } from './GameHud';
import { ModalFrame } from './ModalFrame';

const AVATAR_OPTIONS: { id: AvatarId; label: string; color: string }[] = [
  { id: 'cyan-seeker', label: 'Cyan Seeker', color: '#43E8FF' },
  { id: 'violet-warden', label: 'Violet Warden', color: '#9B7BFF' },
  { id: 'amber-echo', label: 'Amber Echo', color: '#FFC857' },
  { id: 'crimson-scout', label: 'Crimson Scout', color: '#FF526B' },
];

export function AvatarCrest({ avatar, size = 36 }: { avatar: string; size?: number }) {
  const match = AVATAR_OPTIONS.find((a) => a.id === avatar) ?? AVATAR_OPTIONS[0];
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="32" height="32" rx="6" fill="#10182A" stroke={match.color} strokeWidth="1.5" />
      <polygon points="18,8 26,18 18,28 10,18" fill={match.color} opacity="0.85" />
      <circle cx="18" cy="18" r="3" fill="#070B16" />
    </svg>
  );
}

interface AccountModalsProps {
  modal: ModalView;
  user: UserProfile | null;
  progress: ProgressData;
  hasGuestMigration: boolean;
  onClose: () => void;
  onOpenCodex?: () => void;
  onAuthSuccess: (user: UserProfile, serverProgress: ProgressData) => void;
  onConfirmMigrateGuest: () => Promise<void>;
  onSkipMigrateGuest: () => void;
  onProfileUpdated: (user: UserProfile) => void;
}

export function AccountModals({
  modal,
  user,
  progress,
  hasGuestMigration,
  onClose,
  onOpenCodex,
  onAuthSuccess,
  onConfirmMigrateGuest,
  onSkipMigrateGuest,
  onProfileUpdated,
}: AccountModalsProps) {
  if (
    modal !== 'SIGN_IN' &&
    modal !== 'REGISTER' &&
    modal !== 'DASHBOARD' &&
    modal !== 'LEADERBOARD' &&
    modal !== 'MIGRATE_PROMPT'
  ) {
    return null;
  }

  return (
    <ModalFrame onClose={modal === 'MIGRATE_PROMPT' ? onSkipMigrateGuest : onClose}>
      {modal === 'SIGN_IN' && <SignInCard onClose={onClose} onSuccess={onAuthSuccess} />}
      {modal === 'REGISTER' && <RegisterCard onClose={onClose} onSuccess={onAuthSuccess} />}
      {modal === 'MIGRATE_PROMPT' && hasGuestMigration && (
        <MigrateCard onConfirm={onConfirmMigrateGuest} onSkip={onSkipMigrateGuest} />
      )}
      {modal === 'DASHBOARD' && user && (
        <DashboardCard
          user={user}
          progress={progress}
          onClose={onClose}
          onOpenCodex={onOpenCodex}
          onProfileUpdated={onProfileUpdated}
        />
      )}
      {modal === 'LEADERBOARD' && <LeaderboardCard user={user} onClose={onClose} />}
    </ModalFrame>
  );
}

function SignInCard({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: UserProfile, progress: ProgressData) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginAccount({ email, password });
      onSuccess(res.user, res.progress);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
        <h2 className="font-display text-xl font-bold text-[#F1F5FF]">Sign In</h2>
        <button type="button" onClick={onClose} className="text-xs text-[#A4B0C6] hover:text-[#F1F5FF]">
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs text-[#A4B0C6] mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="explorer@echoes.game"
            className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A4B0C6] mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
          />
        </div>

        {error && <p className="text-xs text-[#FF526B]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[42px] px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function RegisterCard({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (user: UserProfile, progress: ProgressData) => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('cyan-seeker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await registerAccount({ username, email, password, avatar });
      onSuccess(res.user, res.progress);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-[#0C1324] border border-[#9B7BFF]/40 p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
        <h2 className="font-display text-xl font-bold text-[#F1F5FF]">Create Account</h2>
        <button type="button" onClick={onClose} className="text-xs text-[#A4B0C6] hover:text-[#F1F5FF]">
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <div>
          <label className="block text-xs text-[#A4B0C6] mb-1">Username (3–24 characters)</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={24}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="EchoWanderer"
            className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#A4B0C6] mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="explorer@echoes.game"
            className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#A4B0C6] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ chars"
              className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A4B0C6] mb-1">Confirm Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="w-full px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-sm text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#A4B0C6] mb-1.5">Explorer Crest</label>
          <div className="grid grid-cols-2 gap-2">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAvatar(opt.id)}
                className={`flex items-center gap-2 p-2 rounded-md border text-xs transition-colors ${
                  avatar === opt.id
                    ? 'bg-[#10182A] border-[#43E8FF] text-[#F1F5FF]'
                    : 'bg-[#070B16] border-[#3986FF]/20 text-[#A4B0C6]'
                }`}
              >
                <AvatarCrest avatar={opt.id} size={24} />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-[#FF526B]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[42px] px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

function MigrateCard({
  onConfirm,
  onSkip,
}: {
  onConfirm: () => Promise<void>;
  onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="w-full max-w-md rounded-lg bg-[#0C1324] border border-[#43E8FF]/45 p-6 text-center">
      <h2 className="font-display text-xl font-bold text-[#F1F5FF]">Transfer Guest Progress?</h2>
      <p className="mt-2 text-sm text-[#A4B0C6] leading-relaxed">
        You have local guest progress saved on this device. Would you like to merge your collected Echo Fragments and completed levels into your account?
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
          }}
          className="flex-1 min-h-[42px] px-4 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-sm hover:bg-[#73EFFF]"
        >
          {busy ? 'Transferring...' : 'Transfer Progress'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="flex-1 min-h-[42px] px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/35 text-[#F1F5FF] text-sm"
        >
          Keep Account Only
        </button>
      </div>
    </div>
  );
}

function DashboardCard({
  user,
  progress,
  onClose,
  onOpenCodex,
  onProfileUpdated,
}: {
  user: UserProfile;
  progress: ProgressData;
  onClose: () => void;
  onOpenCodex?: () => void;
  onProfileUpdated: (user: UserProfile) => void;
}) {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAllAchievements()
      .then((res) => {
        if (active) setAchievements(res.achievements);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const bestSum = Object.values(progress.bestCompletionTimes || {}).reduce((a, b) => a + b, 0);

  const handleAvatarChange = async (avatar: AvatarId) => {
    setSavingAvatar(true);
    try {
      const res = await updatePlayerProfile({ avatar });
      onProfileUpdated(res.user);
    } catch {
      // ignore offline
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#3986FF]/20">
        <div className="flex items-center gap-3">
          <AvatarCrest avatar={user.avatar} size={42} />
          <div>
            <h2 className="font-display text-xl font-bold text-[#F1F5FF]">{user.username}</h2>
            <p className="text-xs text-[#A4B0C6]">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCodex && (
            <button
              type="button"
              onClick={onOpenCodex}
              className="px-3.5 py-1.5 rounded-md bg-[#10182A] border border-[#43E8FF]/45 text-xs text-[#43E8FF] hover:bg-[#43E8FF]/10"
            >
              Codex ({progress.collectedFragments.length}/{TOTAL_CAMPAIGN_FRAGMENTS})
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF] hover:border-[#43E8FF]/60"
          >
            Back
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-y-auto space-y-5 pr-1">
        {/* Player Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Current Stage" value={`Level 0${progress.currentLevel}`} accent="#43E8FF" />
          <StatTile
            label="Echo Fragments"
            value={`${progress.collectedFragments.length} / ${TOTAL_CAMPAIGN_FRAGMENTS}`}
            accent="#FFC857"
          />
          <StatTile label="Total Score" value={String(progress.totalScore)} accent="#F1F5FF" />
          <StatTile
            label="Playtime / Best"
            value={`${formatTime(progress.totalPlaytime)} / ${bestSum > 0 ? formatTime(bestSum) : '--:--'}`}
            accent="#9B7BFF"
          />
        </div>

        {/* Completed Stages */}
        <div className="text-xs text-[#A4B0C6] flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span>Completed Stages:</span>
          {([1, 2, 3, 4, 5] as const).map((lvl) => {
            const cleared = progress.completedLevels.includes(lvl);
            const best = progress.bestCompletionTimes?.[String(lvl)];
            const medal = cleared && best !== undefined ? computeLevelMedal(lvl, best) : null;
            return (
              <span
                key={lvl}
                className={cleared ? 'text-[#43E8FF] font-semibold' : 'text-[#A4B0C6]/50'}
              >
                L0{lvl} {cleared ? (medal ? `(${medal.toUpperCase()})` : '(Cleared)') : '(Open)'}
              </span>
            );
          })}
        </div>

        {/* Avatar Switcher */}
        <div>
          <div className="text-xs font-medium text-[#A4B0C6] mb-2">
            Explorer Crest {savingAvatar ? '· Saving...' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={savingAvatar}
                onClick={() => handleAvatarChange(opt.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  user.avatar === opt.id
                    ? 'bg-[#10182A] border-[#43E8FF] text-[#F1F5FF]'
                    : 'bg-[#070B16] border-[#3986FF]/20 text-[#A4B0C6]'
                }`}
              >
                <AvatarCrest avatar={opt.id} size={20} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="border-t border-[#3986FF]/20 pt-4">
          <h3 className="text-sm font-semibold text-[#F1F5FF] mb-3">Achievements</h3>
          {loading ? (
            <p className="text-xs text-[#A4B0C6]">Loading achievements...</p>
          ) : achievements.length === 0 ? (
            <p className="text-xs text-[#A4B0C6]">Connect to MongoDB backend to track cloud achievements.</p>
          ) : (
            <div className="space-y-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                    a.unlocked
                      ? 'bg-[#10182A]/90 border-[#43E8FF]/45'
                      : 'bg-[#070B16]/70 border-[#3986FF]/15 opacity-65'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-[#F1F5FF]">{a.title}</div>
                    <div className="text-xs text-[#A4B0C6]">{a.description}</div>
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      a.unlocked ? 'text-[#43E8FF]' : 'text-[#A4B0C6]'
                    }`}
                  >
                    {a.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="p-3 rounded-md bg-[#070B16] border border-[#3986FF]/20">
      <div className="text-[11px] text-[#A4B0C6]">{label}</div>
      <div className="mt-1 text-base font-semibold font-mono-num" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function LeaderboardCard({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  const [category, setCategory] = useState<'score' | 'time' | 'fragments' | 'daily'>('score');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeaderboard(category)
      .then((res) => {
        if (!active) return;
        setOffline(res.offline);
        setEntries(res.entries);
      })
      .catch(() => {
        if (active) setOffline(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <div className="w-full max-w-2xl max-h-[86vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#3986FF]/20">
        <h2 className="font-display text-xl font-bold text-[#F1F5FF]">Global Leaderboard</h2>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF] hover:border-[#43E8FF]/60"
        >
          Back
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1 p-1 bg-[#070B16] rounded-md w-fit">
        {(
          [
            { id: 'score', label: 'Highest Score' },
            { id: 'time', label: 'Fastest Completion' },
            { id: 'fragments', label: 'Most Fragments' },
            { id: 'daily', label: 'Daily Trial' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              category === tab.id ? 'bg-[#10182A] text-[#43E8FF]' : 'text-[#A4B0C6] hover:text-[#F1F5FF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-y-auto flex-1">
        {loading ? (
          <p className="text-sm text-[#A4B0C6] py-6 text-center">Loading rankings...</p>
        ) : offline ? (
          <p className="text-sm text-[#FFC857] py-6 text-center">
            Leaderboard requires an active MongoDB Atlas connection. Local guest saves remain available offline.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#A4B0C6] py-6 text-center">
            No registered explorers have completed a run yet. Sign in and finish a stage to claim rank #1!
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-[#A4B0C6] border-b border-[#3986FF]/20">
              <tr>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Explorer</th>
                <th className="py-2 pr-3 text-right">Stages</th>
                <th className="py-2 pr-3 text-right">Fragments</th>
                <th className="py-2 pr-3 text-right">Best Time</th>
                <th className="py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3986FF]/10">
              {entries.map((row) => {
                const isMe = user && row.userId === user.id;
                return (
                  <tr key={row.userId} className={isMe ? 'bg-[#43E8FF]/10 text-[#F1F5FF]' : 'text-[#F1F5FF]'}>
                    <td className="py-2.5 pr-3 font-mono-num text-[#43E8FF]">#{row.rank}</td>
                    <td className="py-2.5 pr-3 flex items-center gap-2">
                      <AvatarCrest avatar={row.avatar} size={22} />
                      <span className="font-medium">{row.username}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono-num">
                      {category === 'daily' ? 'Daily' : `${row.completedCount}/5`}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono-num text-[#FFC857]">
                      {category === 'daily' ? row.fragmentsCount : `${row.fragmentsCount}/${TOTAL_CAMPAIGN_FRAGMENTS}`}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono-num text-[#A4B0C6]">
                      {row.bestTotalTime !== null ? formatTime(row.bestTotalTime) : '--:--'}
                    </td>
                    <td className="py-2.5 text-right font-mono-num font-semibold">{row.totalScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
