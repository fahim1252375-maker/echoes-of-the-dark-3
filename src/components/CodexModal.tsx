import { useMemo, useState } from 'react';
import { CODEX_ENTRIES } from '../game/codexData';
import { ModalFrame } from './ModalFrame';

interface CodexModalProps {
  open: boolean;
  collectedFragments: string[];
  onClose: () => void;
}

export function CodexModal({ open, collectedFragments, onClose }: CodexModalProps) {
  const [chapterFilter, setChapterFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  const collectedSet = useMemo(() => new Set(collectedFragments), [collectedFragments]);
  const unlockedCount = useMemo(
    () => CODEX_ENTRIES.filter((entry) => collectedSet.has(entry.id)).length,
    [collectedSet]
  );

  if (!open) return null;

  const filtered =
    chapterFilter === 0
      ? CODEX_ENTRIES
      : CODEX_ENTRIES.filter((entry) => entry.levelNumber === chapterFilter);

  return (
    <ModalFrame labelledBy="modal-codex-title" onClose={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-lg bg-[#0C1324] border border-[#3986FF]/35 p-6">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#3986FF]/20">
          <div>
            <h2 id="modal-codex-title" className="font-display text-xl font-bold text-[#F1F5FF]">
              Subterranean Codex
            </h2>
            <p className="text-xs text-[#A4B0C6] font-mono-num">
              {unlockedCount} / {CODEX_ENTRIES.length} Lore Entries Recovered
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#10182A] border border-[#3986FF]/30 text-xs text-[#F1F5FF] hover:border-[#43E8FF]/60"
          >
            Back
          </button>
        </div>

        {/* Chapter Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1 p-1 bg-[#070B16] rounded-md w-fit">
          {([0, 1, 2, 3, 4, 5] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setChapterFilter(lvl)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                chapterFilter === lvl
                  ? 'bg-[#10182A] text-[#43E8FF]'
                  : 'text-[#A4B0C6] hover:text-[#F1F5FF]'
              }`}
            >
              {lvl === 0 ? 'All Chapters' : `Level 0${lvl}`}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-y-auto space-y-2.5 pr-1">
          {filtered.map((entry, idx) => {
            const unlocked = collectedSet.has(entry.id);
            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-md border transition-colors ${
                  unlocked
                    ? entry.isSecret
                      ? 'bg-[#10182A] border-[#9B7BFF]/45'
                      : 'bg-[#10182A]/90 border-[#43E8FF]/35'
                    : 'bg-[#070B16]/75 border-[#3986FF]/15 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono-num text-[#43E8FF]">
                    L0{entry.levelNumber} · {entry.chapterTitle}
                    {entry.isSecret ? ' · Secret Spur' : ''}
                  </span>
                  <span className={unlocked ? 'text-[#FFC857] font-semibold' : 'text-[#A4B0C6]'}>
                    {unlocked ? `Fragment #${idx + 1} · Decoded` : 'Locked Relic'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#F1F5FF]">
                  {unlocked ? entry.entryTitle : '??? — Unrecovered Echo Fragment'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#A4B0C6]">
                  {unlocked
                    ? entry.excerpt
                    : `Explore Level 0${entry.levelNumber} and recover this ${
                        entry.isSecret ? 'hidden secret' : 'amber'
                      } Echo Fragment to decode its chronicle.`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </ModalFrame>
  );
}
