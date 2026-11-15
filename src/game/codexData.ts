export interface CodexEntry {
  id: string;
  levelNumber: 1 | 2 | 3 | 4 | 5;
  chapterTitle: string;
  entryTitle: string;
  isSecret: boolean;
  excerpt: string;
}

export const CODEX_ENTRIES: CodexEntry[] = [
  // Level 1: Cavern of Awakening (3)
  {
    id: 'l1_f1',
    levelNumber: 1,
    chapterTitle: 'Cavern of Awakening',
    entryTitle: 'The First Resonance',
    isSecret: false,
    excerpt:
      'Before the sun vanished above the basalt roof, the subterranean guild tuned every arch to a single pitch so the blind could walk home by sound alone.',
  },
  {
    id: 'l1_f2',
    levelNumber: 1,
    chapterTitle: 'Cavern of Awakening',
    entryTitle: 'Side-Spur Whisper',
    isSecret: true,
    excerpt:
      'Masaryk’s surveyors carved hidden ledges along the western chasm—not for haste, but for quiet refuge when cave-ins muted the main bridge.',
  },
  {
    id: 'l1_f3',
    levelNumber: 1,
    chapterTitle: 'Cavern of Awakening',
    entryTitle: 'Seal of the Threshold',
    isSecret: false,
    excerpt:
      'The Awakening Rune did not summon light; it taught fallen stone how to answer a traveler’s pulse for three fleeting heartbeats.',
  },

  // Level 2: Sunken Temple (4)
  {
    id: 'l2_f1',
    levelNumber: 2,
    chapterTitle: 'Sunken Temple',
    entryTitle: 'Litany of the Tide',
    isSecret: false,
    excerpt:
      'Water still falls through the temple’s fractured shafts, beating a metronome older than the lanterns that once hung beside the altar.',
  },
  {
    id: 'l2_f2',
    levelNumber: 2,
    chapterTitle: 'Sunken Temple',
    entryTitle: 'Violet Choir Loft',
    isSecret: true,
    excerpt:
      'Acousticians built a suspended violet bridge north of the West Wing so apprentices could test long-range echo reflection across dead water.',
  },
  {
    id: 'l2_f3',
    levelNumber: 2,
    chapterTitle: 'Sunken Temple',
    entryTitle: 'The Twin Locks',
    isSecret: false,
    excerpt:
      'West and East seals were wired in opposite keys; only a pilgrim who crossed both swinging spans could harmonize the north gate.',
  },
  {
    id: 'l2_f4',
    levelNumber: 2,
    chapterTitle: 'Sunken Temple',
    entryTitle: 'Driftstone Gears',
    isSecret: false,
    excerpt:
      'Beneath the drifting platforms, counterweights driven by underground streams still turn in patient loops, indifferent to centuries of dark.',
  },

  // Level 3: Abyssal Citadel (5)
  {
    id: 'l3_f1',
    levelNumber: 3,
    chapterTitle: 'Abyssal Citadel',
    entryTitle: 'Note from the Heart Architect',
    isSecret: false,
    excerpt:
      'We forged Sentinels from brass and quartz to guard the Resonance Cores. When silence fell, they forgot who was citizen and who was intruder.',
  },
  {
    id: 'l3_f2',
    levelNumber: 3,
    chapterTitle: 'Abyssal Citadel',
    entryTitle: 'Uncharted Parapet',
    isSecret: true,
    excerpt:
      'A secret spur juts out behind the West Core pedestal—the watchmaker’s private balcony, where no Sentinel patrol route was ever inscribed.',
  },
  {
    id: 'l3_f3',
    levelNumber: 3,
    chapterTitle: 'Abyssal Citadel',
    entryTitle: 'East Battlement',
    isSecret: false,
    excerpt:
      'Explorers learned to sprint between crystalline fangs only after listening closely enough to tell an echo from a blade.',
  },
  {
    id: 'l3_f4',
    levelNumber: 3,
    chapterTitle: 'Abyssal Citadel',
    entryTitle: 'The Vertical Ascent',
    isSecret: false,
    excerpt:
      'At the center of the North Spire, a single stone lift connects the lower archive to the high gallery where the third Resonance Core waits.',
  },
  {
    id: 'l3_f5',
    levelNumber: 3,
    chapterTitle: 'Abyssal Citadel',
    entryTitle: 'Citadel Requiem',
    isSecret: false,
    excerpt:
      'When all three cores hum in unison, the obsidian bridge stops trembling and points straight toward the old mirror aqueducts below.',
  },

  // Level 4: Resonant Chasm (5)
  {
    id: 'l4_f1',
    levelNumber: 4,
    chapterTitle: 'Resonant Chasm',
    entryTitle: 'Grammar of Glyphs',
    isSecret: false,
    excerpt:
      'Color was never meant for sight alone in the Chasm; each Glyph Pad vibrates at a distinct harmonic frequency that shatters matching locks.',
  },
  {
    id: 'l4_f2',
    levelNumber: 4,
    chapterTitle: 'Resonant Chasm',
    entryTitle: 'Shatterstone Diary',
    isSecret: false,
    excerpt:
      'Thin limestone bridges grown over ancient vents fracture after a single stride, yet slow mineral accretion reforms them moments later.',
  },
  {
    id: 'l4_f3',
    levelNumber: 4,
    chapterTitle: 'Resonant Chasm',
    entryTitle: 'Behind the Breaking Span',
    isSecret: true,
    excerpt:
      'Only travelers who cross the Western Crumble without looking down discover the violet spur tucked behind its trembling pillars.',
  },
  {
    id: 'l4_f4',
    levelNumber: 4,
    chapterTitle: 'Resonant Chasm',
    entryTitle: 'Mirror Prism Index',
    isSecret: false,
    excerpt:
      'Faceted quartz monoliths turn acoustic shock into a focused ribbon of cool phosphor—proof that sound can carve a lantern out of air.',
  },
  {
    id: 'l4_f5',
    levelNumber: 4,
    chapterTitle: 'Resonant Chasm',
    entryTitle: 'The Whispering Step',
    isSecret: false,
    excerpt:
      'Here the first blind-patrol drones appeared. Apprentices passed a simple proverb down: bend your knees near stone, and let silence shield you.',
  },

  // Level 5: Heart of Silence (6)
  {
    id: 'l5_f1',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'The Charged Chord',
    isSecret: false,
    excerpt:
      'Near the Silent Core, ambient darkness swallows ordinary pulses; explorers had to compress their breath and release double-strength waves.',
  },
  {
    id: 'l5_f2',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'Western Mirror Array',
    isSecret: false,
    excerpt:
      'Two sister mirrors flank the Nexus Plaza, designed to relay reflected beams across the final abyss toward the chamber of the Warden.',
  },
  {
    id: 'l5_f3',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'Eastern Abyssal Alcove',
    isSecret: true,
    excerpt:
      'Beyond the East Wing elevator lies an unlit stone shelf left by the last Chronicler, containing the blueprint of the Silent Warden.',
  },
  {
    id: 'l5_f4',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'Harmonic Conclave',
    isSecret: false,
    excerpt:
      'Cyan and Violet seals balanced the Nexus like two halves of a lung; opening one without the other tore the gallery’s acoustic chord.',
  },
  {
    id: 'l5_f5',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'Anatomy of the Warden',
    isSecret: false,
    excerpt:
      'The Silent Warden hunts every pulse and hurried bootstep, yet freezes in reverence before stillness—only concentrated Mirror light can stagger its armor.',
  },
  {
    id: 'l5_f6',
    levelNumber: 5,
    chapterTitle: 'Heart of Silence',
    entryTitle: 'Song Returned to Stone',
    isSecret: false,
    excerpt:
      'When the final resonance rings clear, the cavern does not blind the world with artificial fire; it restores every echo to its true home.',
  },
];
