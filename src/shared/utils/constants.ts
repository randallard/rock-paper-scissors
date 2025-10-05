/**
 * @fileoverview Global constants for the Prisoner's Dilemma game
 * @module shared/utils/constants
 */

/**
 * Game secret key for AES encryption
 * CRITICAL: This key is used for encrypting game state in URLs
 * SECURITY NOTE: This is client-side encryption for state obfuscation, not true security
 */
export const GAME_SECRET = 'prisoners-dilemma-2024-v1';

/**
 * Current game version for backward compatibility
 */
export const GAME_VERSION = '1.0.0' as const;

/**
 * Maximum number of rounds in a game
 */
export const MAX_ROUNDS = 5 as const;

/**
 * Target maximum URL length to ensure cross-browser compatibility
 * Most browsers support ~2000 characters, we target 1500 for safety
 */
export const MAX_URL_LENGTH = 1500 as const;

/**
 * Payoff matrix values for the Prisoner's Dilemma
 * Based on classic game theory values
 */
export const PAYOFF_MATRIX = {
  /** Both players cooperate (silent) */
  BOTH_SILENT: { p1Gold: 3, p2Gold: 3 },
  /** P1 silent, P2 talks */
  P1_SILENT_P2_TALK: { p1Gold: 0, p2Gold: 5 },
  /** P1 talks, P2 silent */
  P1_TALK_P2_SILENT: { p1Gold: 5, p2Gold: 0 },
  /** Both players defect (talk) */
  BOTH_TALK: { p1Gold: 1, p2Gold: 1 },
} as const;

/**
 * Player identifiers
 */
export const PLAYER = {
  P1: 'p1',
  P2: 'p2',
} as const;

/**
 * Game phases
 */
export const PHASE = {
  SETUP: 'setup',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const;

/**
 * Choice types
 */
export const CHOICE = {
  SILENT: 'silent',
  TALK: 'talk',
} as const;
