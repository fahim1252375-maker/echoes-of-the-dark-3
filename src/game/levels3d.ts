import { Level3DDefinition } from './types';

/**
 * Jump Physics Reference:
 * - GRAVITY = 24 u/s^2, JUMP_VELOCITY = 10.6 u/s => max jump height = 2.34 units
 * - Walk speed = 6.8 u/s, Sprint speed = 9.8 u/s => flat walk jump distance ~6.0 units
 * All horizontal gaps <= 3.6 units and vertical step-ups <= 1.5 units for smooth 3D playability.
 */
export const LEVELS_3D: Level3DDefinition[] = [
  // =========================================================================
  // LEVEL 01 — THE AWAKENING (Beginner)
  // =========================================================================
  {
    levelNumber: 1,
    id: 'level-1',
    name: 'The Awakening',
    subtitle: 'Level 01 · Forgotten Cavern Entrance',
    difficulty: 'Beginner',
    objective: 'Emit Echo Pulses [E] to reveal hidden bridges, tune the Rune Pedestal [F], and enter the Ancient Door.',
    spawn: { x: 0, y: 0.1, z: 14 },
    ambientColor: 0x0b162b,
    fogDensity: 0.022,
    platforms: [
      // Starting stone courtyard (y top = 0)
      { id: 'l1_start', x: 0, y: -1, z: 12, w: 12, h: 2, d: 12, kind: 'solid' },

      // Hidden bridge stepping stones leading forward (-Z)
      { id: 'l1_hid_1', x: 0, y: -0.5, z: 2.2, w: 4.5, h: 1, d: 4.2, kind: 'hidden' },
      { id: 'l1_hid_2', x: 0, y: 0.0, z: -4.8, w: 4.5, h: 1, d: 4.2, kind: 'hidden' },

      // Central sanctuary courtyard (y top = 1.0)
      { id: 'l1_mid', x: 0, y: 0.0, z: -14.5, w: 11, h: 2, d: 10, kind: 'solid' },

      // Optional secret side alcove to the left (-X)
      { id: 'l1_sec_1', x: -8.6, y: 0.5, z: -14.5, w: 3.6, h: 1, d: 3.6, kind: 'secret' },
      { id: 'l1_sec_2', x: -14.5, y: 1.2, z: -14.5, w: 4.5, h: 1, d: 4.5, kind: 'secret' },

      // Hidden ascending path toward Ancient Door (+X and -Z)
      { id: 'l1_hid_3', x: 0, y: 1.2, z: -23.0, w: 4.4, h: 1, d: 4.0, kind: 'hidden' },
      { id: 'l1_hid_4', x: 0, y: 1.8, z: -29.8, w: 4.4, h: 1, d: 4.0, kind: 'hidden' },

      // Ancient Door Sanctuary (y top = 2.5)
      { id: 'l1_exit_plat', x: 0, y: 1.5, z: -38.5, w: 11, h: 2, d: 9, kind: 'solid' },
    ],
    hazards: [
      // Spike cluster on edge of mid sanctuary
      { id: 'l1_sp_1', x: 3.4, y: 1.0, z: -14.5, radius: 1.1, height: 1.0, kind: 'spikes' },
    ],
    fragments: [
      { id: 'l1_f1', x: 0, y: 1.8, z: -4.8, isSecret: false },
      { id: 'l1_f2', x: -14.5, y: 3.0, z: -14.5, isSecret: true },
      { id: 'l1_f3', x: 0, y: 3.6, z: -29.8, isSecret: false },
    ],
    mechanisms: [
      { id: 'l1_mech_1', x: -3.2, y: 1.0, z: -16.5, label: 'Awakening Rune' },
    ],
    checkpoints: [
      { id: 'l1_cp_1', x: 0, y: 1.0, z: -12.0 },
    ],
    statues: [
      {
        id: 'l1_statue',
        x: 3.6,
        y: 0.0,
        z: 9.0,
        rotY: -0.7,
        inscription:
          'Ancient Watcher: "Press E to awaken your Echo Core. What the eye forgets, the wave remembers."',
      },
    ],
    waterfalls: [
      { x: -14, y: 6, z: -22, width: 6, height: 18, rotY: 0.5 },
    ],
    exit: {
      x: 0,
      y: 2.5,
      z: -41.5,
      requiredMechanisms: 1,
    },
    medalThresholds: { gold: 45, silver: 75, bronze: 120 },
    secretZoneCenter: { x: -14.5, y: 1.7, z: -14.5 },
  },

  // =========================================================================
  // LEVEL 02 — THE LOST TEMPLE (Intermediate)
  // =========================================================================
  {
    levelNumber: 2,
    id: 'level-2',
    name: 'The Lost Temple',
    subtitle: 'Level 02 · Sunken Waterfalls & Moving Machinery',
    difficulty: 'Intermediate',
    objective: 'Cross the broken bridges, awaken both Temple Seals [F], and avoid sentinel drones.',
    spawn: { x: 0, y: 0.1, z: 18 },
    ambientColor: 0x091a2e,
    fogDensity: 0.02,
    platforms: [
      // Temple threshold
      { id: 'l2_start', x: 0, y: -1, z: 16, w: 11, h: 2, d: 10, kind: 'solid' },

      // Moving horizontal bridge
      {
        id: 'l2_mov_1',
        x: 0,
        y: -0.4,
        z: 6.5,
        w: 4.5,
        h: 1,
        d: 4.5,
        kind: 'moving',
        moveAxis: 'x',
        moveRange: 3.6,
        moveSpeed: 1.25,
        movePhase: 0,
      },

      // Broken temple landing
      { id: 'l2_mid_1', x: 0, y: 0, z: -2.5, w: 9, h: 2, d: 8, kind: 'solid' },

      // Left Wing (Mechanism Alpha + Secret Alcove)
      { id: 'l2_left_1', x: -7.5, y: 0.4, z: -2.5, w: 3.8, h: 1, d: 3.8, kind: 'hidden' },
      { id: 'l2_left_2', x: -14.0, y: 0.8, z: -2.5, w: 6.5, h: 1.6, d: 6.5, kind: 'solid' },
      { id: 'l2_left_sec', x: -14.0, y: 1.7, z: -10.2, w: 4.2, h: 1, d: 4.2, kind: 'secret' },

      // Right Wing (Mechanism Beta + Moving Elevator)
      { id: 'l2_right_1', x: 7.5, y: 0.4, z: -2.5, w: 3.8, h: 1, d: 3.8, kind: 'hidden' },
      { id: 'l2_right_2', x: 14.2, y: 0.8, z: -2.5, w: 6.5, h: 1.6, d: 6.5, kind: 'solid' },
      {
        id: 'l2_mov_elev',
        x: 14.2,
        y: 1.8,
        z: -9.5,
        w: 4.4,
        h: 1,
        d: 4.4,
        kind: 'moving',
        moveAxis: 'y',
        moveRange: 1.3,
        moveSpeed: 1.35,
        movePhase: 0.6,
      },
      { id: 'l2_right_3', x: 14.2, y: 2.5, z: -16.5, w: 5.5, h: 1.4, d: 5.5, kind: 'hidden' },

      // Forward bridge across chasm
      { id: 'l2_fwd_1', x: 0, y: 0.8, z: -10.8, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },
      { id: 'l2_fwd_2', x: 0, y: 1.4, z: -17.8, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },
      {
        id: 'l2_mov_2',
        x: 0,
        y: 2.0,
        z: -25.2,
        w: 4.5,
        h: 1,
        d: 4.5,
        kind: 'moving',
        moveAxis: 'x',
        moveRange: 3.2,
        moveSpeed: 1.45,
        movePhase: 1.4,
      },

      // Temple Exit Altar
      { id: 'l2_exit_plat', x: 0, y: 2.0, z: -34.5, w: 11, h: 2, d: 9, kind: 'solid' },
    ],
    hazards: [
      { id: 'l2_sp_1', x: -1.6, y: 1.0, z: -4.2, radius: 1.0, height: 1.0, kind: 'spikes' },
      {
        id: 'l2_dr_1',
        x: 0,
        y: 2.4,
        z: -14.2,
        radius: 0.85,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.8,
        moveSpeed: 1.85,
        movePhase: 0,
      },
      {
        id: 'l2_dr_2',
        x: 14.2,
        y: 3.8,
        z: -13.0,
        radius: 0.85,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.2,
        moveSpeed: 2.0,
        movePhase: 1.1,
      },
    ],
    fragments: [
      { id: 'l2_f1', x: 0, y: 1.4, z: 6.5, isSecret: false },
      { id: 'l2_f2', x: -14.0, y: 3.4, z: -10.2, isSecret: true },
      { id: 'l2_f3', x: 14.2, y: 4.5, z: -16.5, isSecret: false },
      { id: 'l2_f4', x: 0, y: 3.7, z: -25.2, isSecret: false },
    ],
    mechanisms: [
      { id: 'l2_mech_1', x: -14.0, y: 1.6, z: -2.5, label: 'West Temple Seal' },
      { id: 'l2_mech_2', x: 14.2, y: 3.2, z: -16.5, label: 'East Temple Seal' },
    ],
    checkpoints: [
      { id: 'l2_cp_1', x: 0, y: 1.0, z: -1.2 },
    ],
    statues: [
      {
        id: 'l2_statue',
        x: -3.5,
        y: 0.0,
        z: 13.5,
        rotY: 0.6,
        inscription:
          'Temple Scribe: "Two seals rest on opposing wings. Listen for moving stonework in the mist."',
      },
    ],
    waterfalls: [
      { x: -18, y: 7, z: -14, width: 7, height: 22, rotY: 1.2 },
      { x: 18, y: 7, z: -20, width: 7, height: 22, rotY: -1.1 },
    ],
    exit: {
      x: 0,
      y: 3.0,
      z: -37.5,
      requiredMechanisms: 2,
    },
    medalThresholds: { gold: 65, silver: 110, bronze: 170 },
    secretZoneCenter: { x: -14.0, y: 2.2, z: -10.2 },
  },

  // =========================================================================
  // LEVEL 03 — THE HEART OF DARKNESS (Advanced)
  // =========================================================================
  {
    levelNumber: 3,
    id: 'level-3',
    name: 'The Heart of Darkness',
    subtitle: 'Level 03 · Central Sanctum of the Abyss',
    difficulty: 'Advanced',
    objective: 'Restore all three Resonance Cores [F] around the Heart Sanctum to unlock the final exit.',
    spawn: { x: 0, y: 0.1, z: 22 },
    ambientColor: 0x0e1028,
    fogDensity: 0.018,
    platforms: [
      // Arrival bridge
      { id: 'l3_start', x: 0, y: -1, z: 20, w: 10, h: 2, d: 10, kind: 'solid' },
      { id: 'l3_ent_1', x: 0, y: -0.4, z: 11.2, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },
      { id: 'l3_ent_2', x: 0, y: 0.2, z: 4.2, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },

      // Central Grand Citadel Plaza (y top = 1.0)
      { id: 'l3_hub', x: 0, y: 0.0, z: -5.5, w: 14, h: 2, d: 13, kind: 'solid' },

      // West Resonator Path (Core 1)
      {
        id: 'l3_w_mov',
        x: -10.5,
        y: 0.6,
        z: -5.5,
        w: 4.2,
        h: 1,
        d: 4.2,
        kind: 'moving',
        moveAxis: 'z',
        moveRange: 3.2,
        moveSpeed: 1.5,
        movePhase: 0,
      },
      { id: 'l3_w_plat', x: -18.0, y: 1.0, z: -5.5, w: 6.5, h: 1.6, d: 6.5, kind: 'solid' },
      { id: 'l3_w_sec', x: -18.0, y: 2.0, z: -13.2, w: 4.2, h: 1, d: 4.2, kind: 'secret' },

      // East Resonator Path (Core 2)
      { id: 'l3_e_1', x: 9.8, y: 0.7, z: -5.5, w: 3.8, h: 1, d: 3.8, kind: 'hidden' },
      { id: 'l3_e_2', x: 16.5, y: 1.4, z: -5.5, w: 6.5, h: 1.6, d: 6.5, kind: 'solid' },
      { id: 'l3_e_3', x: 16.5, y: 2.2, z: -13.2, w: 4.6, h: 1, d: 4.6, kind: 'hidden' },

      // North Spire Path (Core 3 + Final Ascent)
      { id: 'l3_n_1', x: 0, y: 1.0, z: -15.8, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },
      {
        id: 'l3_n_mov',
        x: 0,
        y: 2.2,
        z: -23.0,
        w: 4.6,
        h: 1,
        d: 4.6,
        kind: 'moving',
        moveAxis: 'y',
        moveRange: 1.4,
        moveSpeed: 1.6,
        movePhase: 0.5,
      },
      { id: 'l3_n_mid', x: 0, y: 2.8, z: -31.2, w: 9, h: 1.8, d: 8, kind: 'solid' },
      { id: 'l3_n_step', x: 0, y: 3.6, z: -39.2, w: 4.5, h: 1, d: 4.5, kind: 'hidden' },

      // Final Heart Sanctum Altar (y top = 5.0)
      { id: 'l3_exit_plat', x: 0, y: 4.0, z: -48.0, w: 12, h: 2, d: 10, kind: 'solid' },
    ],
    hazards: [
      { id: 'l3_sp_1', x: -3.2, y: 1.0, z: -8.0, radius: 1.0, height: 1.0, kind: 'spikes' },
      { id: 'l3_sp_2', x: 3.2, y: 1.0, z: -8.0, radius: 1.0, height: 1.0, kind: 'spikes' },
      {
        id: 'l3_dr_w',
        x: -14.2,
        y: 2.3,
        z: -5.5,
        radius: 0.85,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'z',
        moveRange: 3.5,
        moveSpeed: 2.1,
        movePhase: 0.3,
      },
      {
        id: 'l3_dr_e',
        x: 16.5,
        y: 3.4,
        z: -9.5,
        radius: 0.85,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.2,
        moveSpeed: 2.15,
        movePhase: 1.2,
      },
      {
        id: 'l3_dr_n',
        x: 0,
        y: 4.9,
        z: -35.2,
        radius: 0.9,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 4.0,
        moveSpeed: 2.2,
        movePhase: 0.7,
      },
    ],
    fragments: [
      { id: 'l3_f1', x: 0, y: 2.0, z: 4.2, isSecret: false },
      { id: 'l3_f2', x: -18.0, y: 3.7, z: -13.2, isSecret: true },
      { id: 'l3_f3', x: 16.5, y: 4.0, z: -13.2, isSecret: false },
      { id: 'l3_f4', x: 0, y: 5.3, z: -31.2, isSecret: false },
      { id: 'l3_f5', x: 0, y: 5.5, z: -39.2, isSecret: false },
    ],
    mechanisms: [
      { id: 'l3_mech_1', x: -18.0, y: 1.8, z: -5.5, label: 'West Resonance Core' },
      { id: 'l3_mech_2', x: 16.5, y: 2.2, z: -5.5, label: 'East Resonance Core' },
      { id: 'l3_mech_3', x: 0, y: 3.7, z: -31.2, label: 'Sanctum Crown Core' },
    ],
    checkpoints: [
      { id: 'l3_cp_1', x: 0, y: 1.0, z: -3.2 },
      { id: 'l3_cp_2', x: -2.4, y: 3.7, z: -30.5 },
    ],
    statues: [
      {
        id: 'l3_statue',
        x: 3.6,
        y: 0.0,
        z: 18.0,
        rotY: -0.75,
        inscription:
          'Heart Architect: "Three Resonance Cores sustain the Sanctum. Unify their song to part the final shadow."',
      },
    ],
    waterfalls: [
      { x: -24, y: 9, z: -20, width: 8, height: 26, rotY: 1.0 },
      { x: 24, y: 9, z: -20, width: 8, height: 26, rotY: -1.0 },
    ],
    exit: {
      x: 0,
      y: 5.0,
      z: -51.2,
      requiredMechanisms: 3,
    },
    medalThresholds: { gold: 90, silver: 150, bronze: 230 },
    secretZoneCenter: { x: -18.0, y: 2.5, z: -13.2 },
  },

  // =========================================================================
  // LEVEL 04 — THE SINGING CAVERNS (Advanced)
  // Mechanics: Charged Pulse, Glyph Pads + Resonance Doors, Mirror Crystals, Crumbling Spans, Sound-Attracted Drone
  // =========================================================================
  {
    levelNumber: 4,
    id: 'level-4',
    name: 'The Singing Caverns',
    subtitle: 'Level 04 · Resonant Vaults & Mirror Spires',
    difficulty: 'Advanced',
    objective: 'Resonate Glyph Pads with [E], refract Mirror beams, cross crumbling spans, and unlock both Chime Seals.',
    spawn: { x: 0, y: 0.1, z: 22 },
    ambientColor: 0x0a1c2d,
    fogDensity: 0.019,
    platforms: [
      { id: 'l4_start', x: 0, y: -1, z: 20, w: 10, h: 2, d: 10, kind: 'solid' },
      { id: 'l4_c1', x: 0, y: -0.4, z: 11.2, w: 4.4, h: 1, d: 4.4, kind: 'crumbling' },
      { id: 'l4_h1', x: 0, y: 0.2, z: 4.0, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },

      // Central Resonance Rotunda (y top = 1.0)
      { id: 'l4_hub', x: 0, y: 0.0, z: -5.5, w: 12, h: 2, d: 10, kind: 'solid' },

      // East Mirror Gallery (Behind Cyan Door)
      { id: 'l4_e1', x: 9.4, y: 0.6, z: -5.5, w: 4.6, h: 1, d: 4.6, kind: 'solid' },
      { id: 'l4_e2', x: 9.4, y: 1.0, z: -13.2, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },
      { id: 'l4_e3', x: 9.4, y: 1.5, z: -20.5, w: 5.8, h: 1.4, d: 5.8, kind: 'solid' },

      // West Crumbling Span & Secret Vault
      { id: 'l4_w1', x: -9.2, y: 0.6, z: -5.5, w: 4.2, h: 1, d: 4.2, kind: 'crumbling' },
      { id: 'l4_w2', x: -16.4, y: 1.1, z: -5.5, w: 6.2, h: 1.4, d: 6.2, kind: 'solid' },
      { id: 'l4_w_sec', x: -16.4, y: 1.8, z: -13.2, w: 4.4, h: 1, d: 4.4, kind: 'secret' },
      { id: 'l4_w3', x: -16.4, y: 1.6, z: 2.2, w: 5.6, h: 1.4, d: 5.6, kind: 'solid' },

      // North Amber Vault & Exit Bridge
      { id: 'l4_n1', x: 0, y: 1.0, z: -14.2, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },
      { id: 'l4_n2', x: 0, y: 1.4, z: -21.8, w: 7.4, h: 1.4, d: 7.4, kind: 'solid' },
      { id: 'l4_n3', x: 0, y: 2.0, z: -29.6, w: 4.5, h: 1, d: 4.5, kind: 'crumbling' },
      { id: 'l4_exit_plat', x: 0, y: 2.0, z: -38.0, w: 11, h: 2, d: 9, kind: 'solid' },
    ],
    hazards: [
      { id: 'l4_sp_1', x: -3.6, y: 1.0, z: -8.2, radius: 1.0, height: 1.0, kind: 'spikes' },
      {
        id: 'l4_dr_1',
        x: 0,
        y: 3.3,
        z: -22.2,
        radius: 0.85,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.2,
        moveSpeed: 1.9,
        movePhase: 0.4,
        soundSensitive: true,
      },
    ],
    glyphPads: [
      { id: 'l4_pad_cyan', x: 4.2, y: 1.0, z: -5.5, color: 'cyan', doorId: 'l4_door_cyan' },
      { id: 'l4_pad_amber', x: 2.2, y: 2.1, z: -22.8, color: 'amber', doorId: 'l4_door_amber' },
    ],
    resonanceDoors: [
      { id: 'l4_door_cyan', x: 6.2, y: 2.6, z: -5.5, w: 0.8, h: 3.4, d: 4.6, color: 'cyan' },
      { id: 'l4_door_amber', x: 0, y: 3.7, z: -25.4, w: 4.8, h: 3.4, d: 0.8, color: 'amber' },
    ],
    mirrorCrystals: [
      { id: 'l4_mir_1', x: 9.4, y: 2.4, z: -5.5, dirX: 0, dirY: 0.05, dirZ: -1, length: 20 },
    ],
    fragments: [
      { id: 'l4_f1', x: -16.4, y: 3.5, z: -5.5, isSecret: false },
      { id: 'l4_f2', x: 9.4, y: 3.3, z: -13.2, isSecret: false },
      { id: 'l4_f3', x: -16.4, y: 4.0, z: -13.2, isSecret: true },
      { id: 'l4_f4', x: 0, y: 3.9, z: -21.8, isSecret: false },
      { id: 'l4_f5', x: 0, y: 4.4, z: -29.6, isSecret: false },
    ],
    mechanisms: [
      { id: 'l4_mech_1', x: 9.4, y: 2.2, z: -20.5, label: 'East Cavern Chime' },
      { id: 'l4_mech_2', x: -16.4, y: 2.3, z: 2.2, label: 'West Cavern Chime' },
    ],
    checkpoints: [
      { id: 'l4_cp_1', x: 0, y: 1.0, z: -2.5 },
      { id: 'l4_cp_2', x: -2.1, y: 2.1, z: -19.8 },
    ],
    statues: [
      {
        id: 'l4_statue',
        x: 3.4,
        y: 0.0,
        z: 18.0,
        rotY: -0.65,
        inscription:
          'Cavern Cantor: "Stand atop colored Glyph Pads when you pulse. Crouch [C] so listening drones lose your step."',
      },
    ],
    waterfalls: [
      { x: -22, y: 8, z: -12, width: 7, height: 24, rotY: 1.1 },
      { x: 18, y: 8, z: -15, width: 7, height: 24, rotY: -1.1 },
    ],
    exit: {
      x: 0,
      y: 3.0,
      z: -41.0,
      requiredMechanisms: 2,
    },
    medalThresholds: { gold: 105, silver: 170, bronze: 260 },
    secretZoneCenter: { x: -16.4, y: 2.3, z: -13.2 },
  },

  // =========================================================================
  // LEVEL 05 — THE SILENT CORE (Expert)
  // Full synthesis of Charged Pulses, triple Resonance Doors, Mirror beams, Crumbling bridges, Stealth Drones
  // =========================================================================
  {
    levelNumber: 5,
    id: 'level-5',
    name: 'The Silent Core',
    subtitle: 'Level 05 · Abyssal Observatory',
    difficulty: 'Expert',
    objective:
      'Activate all 3 Abyssal Seals, stun the Silent Warden 3 times via Charged Mirror Beams [Hold E], crouch [C] to freeze it, and escape.',
    spawn: { x: 0, y: 0.1, z: 24 },
    ambientColor: 0x0d0b24,
    fogDensity: 0.017,
    platforms: [
      // Starting Atrium
      { id: 'l5_start', x: 0, y: -1, z: 22, w: 10, h: 2, d: 10, kind: 'solid' },
      { id: 'l5_c1', x: 0, y: -0.3, z: 13.0, w: 4.2, h: 1, d: 4.2, kind: 'crumbling' },
      { id: 'l5_h1', x: 0, y: 0.3, z: 5.8, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },

      // Core Nexus Plaza (y top = 1.0)
      { id: 'l5_hub', x: 0, y: 0.0, z: -4.2, w: 13, h: 2, d: 11, kind: 'solid' },

      // West Mirror + Cyan Door Wing
      { id: 'l5_w1', x: -9.8, y: 0.6, z: -4.2, w: 4.2, h: 1, d: 4.2, kind: 'crumbling' },
      { id: 'l5_w2', x: -17.0, y: 1.1, z: -4.2, w: 6.4, h: 1.4, d: 6.4, kind: 'solid' },
      { id: 'l5_w3', x: -17.0, y: 1.6, z: -12.2, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },
      { id: 'l5_w4', x: -17.0, y: 2.0, z: -19.8, w: 5.8, h: 1.4, d: 5.8, kind: 'solid' },

      // East Violet Wing
      { id: 'l5_e1', x: 9.8, y: 0.6, z: -4.2, w: 4.2, h: 1, d: 4.2, kind: 'hidden' },
      { id: 'l5_e2', x: 17.0, y: 1.1, z: -4.2, w: 6.4, h: 1.4, d: 6.4, kind: 'solid' },
      {
        id: 'l5_e_mov',
        x: 17.0,
        y: 1.8,
        z: -12.0,
        w: 4.4,
        h: 1,
        d: 4.4,
        kind: 'moving',
        moveAxis: 'y',
        moveRange: 1.2,
        moveSpeed: 1.5,
        movePhase: 0.3,
      },
      { id: 'l5_e3', x: 17.0, y: 2.4, z: -19.6, w: 5.8, h: 1.4, d: 5.8, kind: 'solid' },
      { id: 'l5_e_sec', x: 24.4, y: 2.8, z: -19.6, w: 4.4, h: 1, d: 4.4, kind: 'secret' },

      // North Gauntlet toward Silent Core Portal
      { id: 'l5_n1', x: 0, y: 1.0, z: -13.2, w: 4.4, h: 1, d: 4.4, kind: 'crumbling' },
      { id: 'l5_n2', x: 0, y: 1.5, z: -20.8, w: 8.6, h: 1.4, d: 8.0, kind: 'solid' },
      { id: 'l5_n3', x: 0, y: 2.2, z: -28.6, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },
      { id: 'l5_n4', x: 0, y: 2.8, z: -36.2, w: 4.4, h: 1, d: 4.4, kind: 'crumbling' },
      { id: 'l5_n5', x: 0, y: 3.2, z: -44.2, w: 8.0, h: 1.6, d: 7.4, kind: 'solid' },
      { id: 'l5_n6', x: 0, y: 3.8, z: -51.8, w: 4.4, h: 1, d: 4.4, kind: 'hidden' },
      { id: 'l5_exit_plat', x: 0, y: 4.0, z: -63.0, w: 16, h: 2, d: 15, kind: 'solid' },
    ],
    hazards: [
      { id: 'l5_sp_1', x: -3.5, y: 1.0, z: -6.8, radius: 1.0, height: 1.0, kind: 'spikes' },
      { id: 'l5_sp_2', x: 3.5, y: 1.0, z: -6.8, radius: 1.0, height: 1.0, kind: 'spikes' },
      {
        id: 'l5_dr_1',
        x: 0,
        y: 3.4,
        z: -21.2,
        radius: 0.9,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.4,
        moveSpeed: 2.0,
        movePhase: 0.2,
        soundSensitive: true,
      },
      {
        id: 'l5_dr_2',
        x: 0,
        y: 5.2,
        z: -44.2,
        radius: 0.9,
        height: 1.4,
        kind: 'drone',
        moveAxis: 'x',
        moveRange: 3.2,
        moveSpeed: 2.15,
        movePhase: 1.4,
        soundSensitive: true,
      },
    ],
    glyphPads: [
      { id: 'l5_pad_cyan', x: -4.2, y: 1.0, z: -4.2, color: 'cyan', doorId: 'l5_door_cyan' },
      { id: 'l5_pad_violet', x: 4.2, y: 1.0, z: -4.2, color: 'violet', doorId: 'l5_door_violet' },
      { id: 'l5_pad_amber', x: 2.2, y: 4.0, z: -44.5, color: 'amber', doorId: 'l5_door_amber' },
    ],
    resonanceDoors: [
      { id: 'l5_door_cyan', x: -6.6, y: 2.6, z: -4.2, w: 0.8, h: 3.4, d: 4.6, color: 'cyan' },
      { id: 'l5_door_violet', x: 6.6, y: 2.6, z: -4.2, w: 0.8, h: 3.4, d: 4.6, color: 'violet' },
      { id: 'l5_door_amber', x: 0, y: 5.6, z: -47.9, w: 5.0, h: 3.4, d: 0.8, color: 'amber' },
    ],
    mirrorCrystals: [
      { id: 'l5_mir_w', x: -17.0, y: 2.8, z: -4.2, dirX: 0, dirY: 0.06, dirZ: -1, length: 20 },
      { id: 'l5_mir_n', x: 0, y: 4.8, z: -41.2, dirX: 0, dirY: 0.04, dirZ: -1, length: 18 },
      { id: 'l5_mir_boss_w', x: -6.8, y: 6.2, z: -61.5, dirX: 1, dirY: 0, dirZ: 0, length: 13.6 },
      { id: 'l5_mir_boss_e', x: 6.8, y: 6.2, z: -64.0, dirX: -1, dirY: 0, dirZ: 0, length: 13.6 },
    ],
    fragments: [
      { id: 'l5_f1', x: 0, y: 2.2, z: 5.8, isSecret: false },
      { id: 'l5_f2', x: -17.0, y: 3.5, z: -12.2, isSecret: false },
      { id: 'l5_f3', x: 24.4, y: 5.0, z: -19.6, isSecret: true },
      { id: 'l5_f4', x: 0, y: 4.0, z: -20.8, isSecret: false },
      { id: 'l5_f5', x: 0, y: 4.8, z: -36.2, isSecret: false },
      { id: 'l5_f6', x: 0, y: 6.2, z: -51.8, isSecret: false },
    ],
    mechanisms: [
      { id: 'l5_mech_1', x: -17.0, y: 2.7, z: -19.8, label: 'Abyssal West Seal' },
      { id: 'l5_mech_2', x: 17.0, y: 3.1, z: -19.6, label: 'Abyssal East Seal' },
      { id: 'l5_mech_3', x: -2.2, y: 4.0, z: -44.2, label: 'Silent Core Heart' },
    ],
    checkpoints: [
      { id: 'l5_cp_1', x: 0, y: 1.0, z: -1.8 },
      { id: 'l5_cp_2', x: -2.4, y: 2.2, z: -18.8 },
      { id: 'l5_cp_3', x: 2.2, y: 4.0, z: -42.0 },
      { id: 'l5_cp_4', x: -5.5, y: 5.0, z: -57.2 },
      { id: 'l5_cp_5', x: 5.5, y: 5.0, z: -57.2 },
    ],
    statues: [
      {
        id: 'l5_statue_1',
        x: 3.6,
        y: 0.0,
        z: 19.5,
        rotY: -0.7,
        inscription:
          'Silent Warden: "Hold [E] to focus a Charged Pulse. Its wider ring awakens distant mirrors and hidden glyphs."',
      },
      {
        id: 'l5_statue_2',
        x: -2.8,
        y: 2.2,
        z: -18.0,
        rotY: 0.5,
        inscription:
          'Core Chronicler: "Step gently with [C]. The Silent Core’s sentinels hunt only what shatters the quiet."',
      },
    ],
    waterfalls: [
      { x: -26, y: 10, z: -26, width: 9, height: 30, rotY: 1.0 },
      { x: 26, y: 10, z: -26, width: 9, height: 30, rotY: -1.0 },
    ],
    bossWarden: {
      id: 'l5_warden',
      x: 0,
      y: 6.2,
      z: -63.0,
      patrolRadius: 3.6,
      arenaCenterX: 0,
      arenaCenterZ: -63.0,
      arenaHalfWidth: 7.0,
      arenaHalfDepth: 6.4,
      maxStuns: 3,
    },
    exit: {
      x: 0,
      y: 5.0,
      z: -69.2,
      requiredMechanisms: 3,
    },
    medalThresholds: { gold: 130, silver: 210, bronze: 320 },
    secretZoneCenter: { x: 24.4, y: 3.3, z: -19.6 },
  },
];

