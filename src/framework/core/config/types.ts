/**
 * @fileoverview Core TypeScript types for game configuration
 * @module framework/core/config/types
 *
 * Type definitions for YAML-based game configurations.
 * These types define the structure of game configs loaded from YAML files.
 *
 * CRITICAL: All config data flows through Zod validation before use
 * These TS types provide compile-time safety, Zod provides runtime safety
 */

/**
 * Represents a single choice option available to players
 *
 * @example
 * ```typescript
 * {
 *   id: 'cooperate',
 *   label: 'Cooperate',
 *   description: 'Work together for mutual benefit'
 * }
 * ```
 */
export interface ChoiceOption {
  /** Unique identifier for this choice (used in payoff rules) */
  id: string;

  /** Display label shown to players */
  label: string;

  /** Optional description or tooltip text */
  description?: string;

  /** Optional emoji or icon identifier */
  icon?: string;
}

/**
 * Defines payoff outcome for a specific combination of choices
 *
 * @example
 * ```typescript
 * {
 *   condition: { player1: 'cooperate', player2: 'cooperate' },
 *   outcome: { player1: 3, player2: 3 }
 * }
 * ```
 */
export interface PayoffRule {
  /** Choice IDs for each player that trigger this rule */
  condition: {
    player1: string;
    player2: string;
  };

  /** Points awarded to each player when condition matches */
  outcome: {
    player1: number;
    player2: number;
  };

  /** Optional narrative text describing this outcome */
  outcomeText?: string;
}

/**
 * Metadata about the game
 */
export interface GameMetadata {
  /** Unique game identifier (e.g., 'prisoners-dilemma') */
  id: string;

  /** Display name of the game */
  name: string;

  /** Short description of the game */
  description: string;

  /** Game version for config compatibility checks */
  version: string;

  /** Optional URL to rules or documentation */
  rulesUrl?: string;

  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Configuration for game progression
 */
export interface GameProgression {
  /** Total number of rounds in a complete game */
  totalRounds: number;

  /** Which player starts first (1 or 2) */
  startingPlayer: 1 | 2;

  /** Whether players alternate who goes first each round */
  alternateStarter: boolean;

  /** Whether to show running totals during gameplay */
  showRunningTotal: boolean;
}

/**
 * UI customization options
 */
export interface GameUI {
  /** Primary theme color (hex format) */
  primaryColor?: string;

  /** Secondary theme color (hex format) */
  secondaryColor?: string;

  /** Custom CSS class for styling */
  cssClass?: string;

  /** Whether to show payoff matrix to players */
  showPayoffMatrix: boolean;

  /** Whether to show choice descriptions */
  showChoiceDescriptions: boolean;

  /** Text shown when player makes a choice */
  choiceMadeText?: string;

  /** Text shown on results screen */
  resultsHeaderText?: string;
}

/**
 * Complete game configuration loaded from YAML
 *
 * This is the root type that represents an entire game definition.
 *
 * @example
 * ```typescript
 * const config: GameConfig = {
 *   metadata: {
 *     id: 'prisoners-dilemma',
 *     name: 'Prisoner\'s Dilemma',
 *     description: 'Classic game theory scenario',
 *     version: '1.0.0'
 *   },
 *   choices: [
 *     { id: 'cooperate', label: 'Cooperate' },
 *     { id: 'defect', label: 'Defect' }
 *   ],
 *   payoffRules: [...],
 *   progression: { totalRounds: 5, startingPlayer: 1, alternateStarter: true },
 *   ui: { showPayoffMatrix: true }
 * }
 * ```
 */
export interface GameConfig {
  /** Game metadata and identification */
  metadata: GameMetadata;

  /** Available choices for players */
  choices: ChoiceOption[];

  /** Payoff rules defining outcomes */
  payoffRules: PayoffRule[];

  /** Game progression settings */
  progression: GameProgression;

  /** UI customization options */
  ui: GameUI;
}

/**
 * Error thrown when config validation fails
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly configPath?: string
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Error thrown when config loading fails
 */
export class ConfigLoadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/**
 * Type guard to check if an unknown value is a valid GameConfig structure
 * Note: This only checks structure, not semantics. Use Zod for full validation.
 */
export function isGameConfigLike(value: unknown): value is GameConfig {
  if (typeof value !== 'object' || value === null) return false;

  const config = value as Partial<GameConfig>;

  return (
    typeof config.metadata === 'object' &&
    config.metadata !== null &&
    Array.isArray(config.choices) &&
    Array.isArray(config.payoffRules) &&
    typeof config.progression === 'object' &&
    config.progression !== null &&
    typeof config.ui === 'object' &&
    config.ui !== null
  );
}

/**
 * Helper type for extracting choice IDs from a config
 */
export type ChoiceId<T extends GameConfig> = T['choices'][number]['id'];

/**
 * Helper type for config with string literal choice IDs
 * Useful for compile-time type safety with specific games
 */
export type TypedGameConfig<TChoiceId extends string> = Omit<
  GameConfig,
  'choices' | 'payoffRules'
> & {
  choices: Array<ChoiceOption & { id: TChoiceId }>;
  payoffRules: Array<{
    condition: { player1: TChoiceId; player2: TChoiceId };
    outcome: { player1: number; player2: number };
    outcomeText?: string;
  }>;
};
