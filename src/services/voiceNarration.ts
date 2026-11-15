import { GameSettings, NarrationLanguage } from '../game/types';

export interface VoiceOption {
  name: string;
  lang: string;
  label: string;
}

const LANG_PREFIX_MAP: Record<NarrationLanguage, string[]> = {
  en: ['en-US', 'en-GB', 'en'],
  bn: ['bn-BD', 'bn-IN', 'bn'],
  zh: ['zh-CN', 'zh-TW', 'zh-HK', 'zh'],
};

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function listAvailableVoices(): VoiceOption[] {
  if (!isSpeechSupported()) return [];
  try {
    const voices = window.speechSynthesis.getVoices();
    return voices.map((v) => ({
      name: v.name,
      lang: v.lang,
      label: `${v.name} (${v.lang})`,
    }));
  } catch {
    return [];
  }
}

export function stopNarration(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore speech synthesis errors safely
  }
}

export function speakNarration(text: string, settings: GameSettings): void {
  if (!settings.narrationVoice || settings.muted || !text.trim() || !isSpeechSupported()) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredLangs = LANG_PREFIX_MAP[settings.narrationLanguage] ?? ['en'];
    utterance.lang = preferredLangs[0];
    utterance.rate = Math.min(1.5, Math.max(0.7, settings.narrationRate || 1.0));
    utterance.volume = Math.min(1, Math.max(0, settings.masterVolume ?? 0.8));

    let chosenVoice = settings.narrationVoiceName
      ? voices.find((v) => v.name === settings.narrationVoiceName)
      : undefined;

    if (!chosenVoice) {
      for (const prefix of preferredLangs) {
        chosenVoice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
        if (chosenVoice) break;
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Auto-fallback silently to text-only if browser blocks or fails speech
  }
}
