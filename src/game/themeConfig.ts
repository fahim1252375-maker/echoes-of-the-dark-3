/**
 * Narrative & Theme Configuration
 *
 * Set OFFICIAL_THEME to the exact announced Devpost / hackathon theme.
 * When empty, the game uses theme-neutral wording without inventing a theme.
 */
export const OFFICIAL_THEME = '';

const normalizedTheme = OFFICIAL_THEME.trim();
const hasOfficialTheme = normalizedTheme.length > 0;

export const THEME_CONFIG = {
  officialThemeStatus: (hasOfficialTheme ? 'ANNOUNCED' : 'PENDING_ANNOUNCEMENT') as
    | 'PENDING_ANNOUNCEMENT'
    | 'ANNOUNCED',
  officialThemeText: hasOfficialTheme
    ? normalizedTheme
    : 'No official theme locked yet — neutral acoustic exploration foundation.',
  themeExplanation: hasOfficialTheme
    ? `How Echoes of the Dark expresses "${normalizedTheme}": every pulse from the Echo Core turns unseen silence into fleeting geometry, connecting exploration, memory, and sound-driven survival.`
    : 'The Echo Core sonar mechanic turns darkness into discovery: each acoustic wave briefly reveals hidden architecture, challenges players to balance sound against stealth, and uncovers a forgotten subterranean world.',
  eventTitle: 'Echoes of the Dark · 3D Sonar Puzzle-Adventure',
  gameTitle: 'ECHOES OF THE DARK',
  tagline: 'In a world without light, every echo tells a story.',
  menuSubtitle: hasOfficialTheme
    ? `Theme: ${normalizedTheme} — Every echo reveals a forgotten world.`
    : 'Every echo reveals a forgotten world.',
  victoryTitle: 'BEYOND THE DARK',
  victoryMessage: hasOfficialTheme
    ? `You restored the Echo Core across the sunken civilization, fulfilling "${normalizedTheme}" through sound, memory, and courage.`
    : 'You restored the Echo Core across the sunken civilization, illuminating ancient sanctuaries through sound, memory, and courage.',
};
