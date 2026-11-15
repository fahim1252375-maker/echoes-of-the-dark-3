# Echoes of the Dark — Devpost Submission

## Quick Evaluator Guide (Judge / Showcase Mode)
1. Launch the app — play starts immediately in **Guest Mode** with zero login friction (or create an account to test live MongoDB Atlas persistence, Ghost Replays, and Leaderboard sync).
2. Click **Judge / Showcase Mode** in the top-right corner of the Main Menu:
   - **All 5 Levels Unlocked**: Jump straight to any chamber (`Level 01` – `Level 05`).
   - **Infinite Echo Energy**: Experiment freely with tap & charged (`Hold E`) 3D sonar waves, Mirror Crystals, and Glyph Pads.
   - **20s Auto Fly-Through**: Click **20s Auto Fly-Through** from the menu banner or top-right HUD during gameplay for a hands-free orbital camera showcase with rhythmic sonar waves across the chamber.
   - **Score Isolation**: Judge / Showcase Mode automatically disables leaderboard, checkpoint, and ghost submissions so public rankings stay clean.
3. Try **Echo Trials** from the Main Menu to play today's **Daily UTC Seed** or generate an AI-themed seeded chamber with share codes (e.g., `ECHO-481927-EXPERT`).

---

## Inspiration & Theme Expression
Most 3D exploration games take sight for granted. We asked: *What happens when geometry only exists for the brief seconds an acoustic wave washes over it?* Inspired by echolocation, tactile minimalism, and atmospheric puzzle-platformers, **Echoes of the Dark** turns sound into both your lantern and your risk — because emitting louder sonar pulses also alerts sound-sensitive sentinels lurking in the dark.

Our narrative configuration (`OFFICIAL_THEME` in `src/game/themeConfig.ts`) keeps the game's core sonar-and-story loop adaptable: when `OFFICIAL_THEME` is populated, the menu subtitle, About panel, and Victory epilogue frame the journey around that theme; when empty, it preserves clean neutral wording focused on discovery through sound.

## What It Does
- **Acoustic 3D Exploration (5 Campaign Chambers)**: Navigate a subterranean civilization across 5 escalating handcrafted stages (`23` Echo Fragments, Bronze/Silver/Gold speed medals, `9` unlockable achievements).
- **Rich Sonar Puzzle Mechanics**:
  - **Charged Sonar Pulses** (`Hold E`) reaching `1.8×` radius.
  - **Glyph Pads & Resonance Doors** unlocking color-coded barriers on pulse impact.
  - **Mirror Crystals** projecting sustained directional light beams across gaps.
  - **Sound-Attracted Drones & Silent Crouch** (`C`) creating stealth-vs-vision tension.
  - **Crumbling Obsidian Slabs** testing timing and movement.
- **Gemini AI Integration (`@google/genai`)**:
  - **Echo Trials**: Server-side Gemini generates structured chamber blueprints (`Type.OBJECT` schema) combined with a deterministic `mulberry32` seed builder and BFS reachability verification.
  - **Echo Keeper Narration & `[H]` Adaptive Hints**: Context-aware poetic whispers and gameplay hints — strictly server-side with prompt-injection sanitization and deterministic offline fallbacks.
- **Ghost Replays & Speedrun Mode**: 10 Hz quantized binary ghost recordings (`<= 40 KB`) rendered as a translucent cyan 3D explorer with live `Δ time` splits.
- **Accessibility-First Engineering**: Colorblind sonar palettes, High Contrast mode, HUD scaling (`80%–140%`), directional spatial audio subtitles, full keyboard rebinding + Gamepad support, ARIA-compliant `ModalFrame` focus traps, and auto-FPS quality downgrade.

## How We Built It
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, custom Three.js WebGL engine (`Game3DEngine`), custom GLSL expanding sonar dome shaders, `InstancedMesh` cave scenery, and a zero-asset Web Audio API synthesizer with procedural impulse-response `ConvolverNode` cavern reverb.
- **Backend**: Node.js, Express, Mongoose / MongoDB Atlas, JWT (`bcryptjs` cost 12), `helmet` CSP, `express-validator`, rate limiting, and `@google/genai` server routes.
- **Verification**: Breadth-First Search (`levelValidator.ts`) verifies jump reachability across every campaign level and procedural Echo Trial seed; automated Node `tsx --test` suite tests auth, progress, AI fallbacks, BFS trial generation, ghost binary roundtrips, stats, and production security rules.

## Challenges We Ran Into
- Balancing darkness vs. readability across monitor calibrations and color vision profiles without washing out the mystery — solved via custom GLSL sonar ring uniforms, High Contrast baseline outlines, and 3 colorblind presets.
- Keeping procedural Echo Trial layouts genuinely fun and *always* solvable — solved by constraining Gemini's output to verified room archetypes (`bridge`, `glyph_gate`, `mirror_vault`, `drone_hall`, `crumble_span`, `seal_shrine`) paired with deterministic geometry placement and a live BFS reachability validator.
- Making ghost replays lightweight enough for fast API sync — solved with fixed-point Int16 quantization and packed flags (`11` bytes/frame at 10 Hz, capped cleanly under `40 KB`).

## Accomplishments That We're Proud Of
- Zero-asset 3D engine & procedural spatial audio that builds to a compact static HTML5 bundle (`echoes-of-the-dark-itch.zip`) while seamlessly upgrading to full cloud persistence, global "World Echoes" stats, and Gemini AI when backed by Express + MongoDB Atlas.
- Complete offline/no-key resilience: every AI endpoint, database query, and leaderboard degrades gracefully without breaking gameplay.

## What's Next
- Community Trial Browser with upvoted player-shared seed codes.
- Co-op Dual-Explorer Echo Resonance mode over WebSockets where two players harmonize overlapping sonar waves.
