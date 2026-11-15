import { useEffect, useState } from 'react';
import { Level3DDefinition, TrialDifficulty } from '../game/types';
import {
  fetchDailyTrial,
  fetchTrialBlueprint,
  fetchTrialFromImage,
  TrialFetchResult,
  VisionTrialResult,
} from '../services/ai';
import {
  formatShareCode,
  generateValidatedTrialLevel,
  getDailyUtcTrialInfo,
  parseShareCode,
} from '../game/trialGenerator';
import { ModalFrame } from './ModalFrame';

interface TrialModalProps {
  open: boolean;
  onClose: () => void;
  onLaunchTrial: (level: Level3DDefinition) => void;
}

export function TrialModal({ open, onClose, onLaunchTrial }: TrialModalProps) {
  const [dailyData, setDailyData] = useState<TrialFetchResult | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [difficulty, setDifficulty] = useState<TrialDifficulty>('Explorer');
  const [themeHint, setThemeHint] = useState('');
  const [shareCodeInput, setShareCodeInput] = useState('');
  const [forging, setForging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionTrialResult | null>(null);
  const [visionNotice, setVisionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingDaily(true);
    setError(null);
    setVisionNotice(null);
    fetchDailyTrial()
      .then((res) => {
        if (active) setDailyData(res);
      })
      .finally(() => {
        if (active) setLoadingDaily(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const dailyFallback = getDailyUtcTrialInfo();
  const displayDailyCode = dailyData?.shareCode ?? dailyFallback.shareCode;
  const displayDailyDiff = dailyData?.difficulty ?? dailyFallback.difficulty;
  const displayDailyTitle = dailyData?.blueprint.title ?? 'Loading Daily Chamber...';

  const handleLaunchDaily = async () => {
    setForging(true);
    setError(null);
    try {
      const data = dailyData ?? (await fetchDailyTrial());
      const level = generateValidatedTrialLevel(data.seed, data.difficulty, data.blueprint, {
        isDaily: true,
        dateUtc: data.dateUtc ?? dailyFallback.dateUtc,
        source: data.source,
      });
      onLaunchTrial(level);
    } finally {
      setForging(false);
    }
  };

  const handleForgeCustom = async () => {
    setForging(true);
    setError(null);
    try {
      const seed = Math.floor(100000 + Math.random() * 900000000);
      const data = await fetchTrialBlueprint(seed, difficulty, themeHint.trim() || undefined);
      const level = generateValidatedTrialLevel(data.seed, data.difficulty, data.blueprint, {
        isDaily: false,
        source: data.source,
      });
      onLaunchTrial(level);
    } catch {
      setError('Unable to forge trial right now.');
    } finally {
      setForging(false);
    }
  };

  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setVisionNotice(null);
    setUploadingImage(true);
    try {
      const result = await fetchTrialFromImage(file, difficulty);
      setVisionResult(result);
      if (result.source === 'gemini-vision') {
        setVisionNotice(`Gemini Vision generated "${result.blueprint.title}" (${result.shareCode}).`);
      } else {
        setVisionNotice(
          result.fallbackReason ||
            `Procedural chamber "${result.blueprint.title}" seeded from image (${result.shareCode}).`
        );
      }
    } catch (err) {
      setVisionResult(null);
      setError(err instanceof Error ? err.message : 'Unable to process uploaded image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLaunchVisionTrial = () => {
    if (!visionResult) return;
    const level = generateValidatedTrialLevel(
      visionResult.seed,
      visionResult.difficulty,
      visionResult.blueprint,
      {
        isDaily: false,
        source: visionResult.source === 'gemini-vision' ? 'gemini' : 'fallback',
      }
    );
    onLaunchTrial(level);
  };

  const handleLaunchShareCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseShareCode(shareCodeInput);
    if (!parsed) {
      setError('Enter a valid code like ECHO-4F9K2A-EXPLORER or numeric seed.');
      return;
    }
    setForging(true);
    try {
      const data = await fetchTrialBlueprint(parsed.seed, parsed.difficulty);
      const level = generateValidatedTrialLevel(parsed.seed, parsed.difficulty, data.blueprint, {
        isDaily: false,
        source: data.source,
      });
      onLaunchTrial(level);
    } finally {
      setForging(false);
    }
  };

  return (
    <ModalFrame labelledBy="modal-trials-title" onClose={onClose}>
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#3986FF]/20">
          <div>
            <h2 id="modal-trials-title" className="font-display text-xl font-bold text-[#F1F5FF]">
              Echo Trials
            </h2>
            <p className="text-xs text-[#A4B0C6]">
              AI-curated &amp; deterministic procedural caverns verified for reachability
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF]"
          >
            Back
          </button>
        </div>

        <div className="mt-4 overflow-y-auto space-y-5 pr-1">
          {/* Daily UTC Trial */}
          <div className="p-4 rounded-md bg-[#070B16] border border-[#43E8FF]/40">
            <div className="flex items-center justify-between gap-2 text-xs text-[#43E8FF]">
              <span>Daily UTC Trial · {dailyFallback.dateUtc}</span>
              <span className="font-mono-num">{displayDailyDiff}</span>
            </div>
            <div className="mt-1 text-base font-semibold text-[#F1F5FF]">
              {loadingDaily ? 'Synchronizing Daily Chamber...' : displayDailyTitle}
            </div>
            {dailyData?.blueprint.ambientPrompt && (
              <p className="mt-1 text-xs text-[#A4B0C6] leading-snug">
                {dailyData.blueprint.ambientPrompt}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono-num text-xs text-[#A4B0C6]">{displayDailyCode}</span>
              <button
                type="button"
                disabled={forging || loadingDaily}
                onClick={() => void handleLaunchDaily()}
                className="min-h-[40px] px-5 py-2 rounded-md bg-[#43E8FF] text-[#070B16] font-semibold text-xs hover:bg-[#73EFFF] disabled:opacity-50"
              >
                {forging ? 'Generating...' : 'Play Daily Trial'}
              </button>
            </div>
          </div>

          {/* Custom AI / Seeded Trial Forge */}
          <div className="space-y-3 border-t border-[#3986FF]/20 pt-4">
            <div className="text-xs font-semibold text-[#F1F5FF]">Forge Custom Trial</div>
            <div className="flex flex-wrap items-center gap-2">
              {(['Novice', 'Explorer', 'Expert'] as TrialDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    difficulty === d
                      ? 'bg-[#10182A] border-[#9B7BFF] text-[#F1F5FF]'
                      : 'bg-[#070B16] border-[#3986FF]/25 text-[#A4B0C6] hover:text-[#F1F5FF]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                maxLength={50}
                value={themeHint}
                onChange={(e) => setThemeHint(e.target.value)}
                placeholder="Optional AI theme (e.g. Sunken Choir, Crystal Maze)"
                className="flex-1 px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-xs text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
              />
              <button
                type="button"
                disabled={forging || uploadingImage}
                onClick={() => void handleForgeCustom()}
                className="min-h-[40px] px-4 py-2 rounded-md bg-[#9B7BFF] text-[#070B16] font-semibold text-xs hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                {forging ? 'Forging...' : 'Generate AI Trial'}
              </button>
            </div>
          </div>

          {/* Photo or Sketch to Echo Trial */}
          <div className="space-y-2.5 border-t border-[#3986FF]/20 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-[#F1F5FF]">
                  Photo or Sketch to Echo Trial
                </div>
                <p className="text-[11px] text-[#A4B0C6]">
                  PNG, JPEG, or WebP up to 2 MB (never saved to disk or database)
                </p>
              </div>
              <label className="min-h-[38px] px-3.5 py-2 rounded-md bg-[#10182A] border border-[#43E8FF]/45 text-[#43E8FF] text-xs font-semibold hover:bg-[#43E8FF]/10 cursor-pointer whitespace-nowrap">
                {uploadingImage ? 'Analyzing Image...' : 'Upload a photo or sketch'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingImage || forging}
                  onChange={(e) => void handleImageFileSelected(e)}
                  className="hidden"
                />
              </label>
            </div>

            {visionNotice && (
              <div className="p-3 rounded-md bg-[#070B16] border border-[#43E8FF]/35 text-xs space-y-2">
                <div className="text-[#43E8FF]">{visionNotice}</div>
                {visionResult && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[#A4B0C6]">
                      {visionResult.blueprint.rooms.length} rooms · {visionResult.difficulty} ·{' '}
                      {visionResult.source === 'gemini-vision' ? 'Gemini Vision' : 'Procedural'}
                    </span>
                    <button
                      type="button"
                      onClick={handleLaunchVisionTrial}
                      className="px-4 py-1.5 rounded bg-[#43E8FF] text-[#070B16] font-semibold hover:bg-[#73EFFF]"
                    >
                      Enter Chamber
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Share Code Loader */}
          <form onSubmit={handleLaunchShareCode} className="space-y-2 border-t border-[#3986FF]/20 pt-4">
            <label className="block text-xs font-semibold text-[#F1F5FF]">
              Load by Share Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareCodeInput}
                onChange={(e) => setShareCodeInput(e.target.value)}
                placeholder={formatShareCode(4819273, 'Explorer')}
                className="flex-1 px-3 py-2 rounded-md bg-[#070B16] border border-[#3986FF]/30 text-xs font-mono-num text-[#F1F5FF] focus:outline-none focus:border-[#43E8FF]"
              />
              <button
                type="submit"
                disabled={forging || uploadingImage}
                className="min-h-[40px] px-4 py-2 rounded-md bg-[#10182A] border border-[#3986FF]/40 text-xs font-medium text-[#F1F5FF] hover:border-[#43E8FF]/70 whitespace-nowrap"
              >
                Launch Seed
              </button>
            </div>
            {error && <p className="text-xs text-[#FF526B]">{error}</p>}
          </form>
        </div>
      </div>
    </ModalFrame>
  );
}
