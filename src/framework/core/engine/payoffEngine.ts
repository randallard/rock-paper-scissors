/**
 * @fileoverview Config-driven payoff calculation engine
 * @module framework/core/engine/payoffEngine
 *
 * Calculates game payoffs based on configuration rules.
 *
 * CRITICAL PATTERN: No hardcoded game logic
 * - Bad:  if (p1 === 'silent' && p2 === 'silent') return { p1: 3, p2: 3 } ❌
 * - Good: Look up payoff rule from config for ANY choice combination ✅
 *
 * This enables the framework to support ANY game defined in YAML.
 *
 * Pattern from existing code: src/features/game/utils/gameLogic.ts:60-107
 * But generalized to work with any config, not just Prisoner's Dilemma.
 */

import type { GameConfig, PayoffRule } from '../config/types';

/**
 * Result of a payoff calculation
 */
export interface PayoffResult {
  /** Points awarded to player 1 */
  player1Score: number;

  /** Points awarded to player 2 */
  player2Score: number;

  /** Optional narrative text describing this outcome */
  outcomeText?: string;

  /** The rule that was matched */
  matchedRule: PayoffRule;
}

/**
 * Error thrown when payoff calculation fails
 */
export class PayoffCalculationError extends Error {
  constructor(
    message: string,
    public readonly player1Choice: string,
    public readonly player2Choice: string
  ) {
    super(message);
    this.name = 'PayoffCalculationError';
  }
}

/**
 * Calculates payoff for a round based on both players' choices
 *
 * Algorithm:
 * 1. Validate choices exist in config
 * 2. Find matching payoff rule for choice combination
 * 3. Return scores and outcome text
 *
 * CRITICAL: This is a pure function with NO side effects
 * - Same inputs always produce same outputs
 * - No mutations, no external state access
 *
 * @param config - The game configuration
 * @param player1Choice - Player 1's choice ID
 * @param player2Choice - Player 2's choice ID
 * @returns Payoff result with scores and text
 * @throws {PayoffCalculationError} If choices are invalid or no rule matches
 *
 * @example
 * ```typescript
 * const result = calculatePayoff(
 *   config,
 *   'silent',  // Player 1 stays silent
 *   'talk'     // Player 2 talks
 * );
 * // result = { player1Score: 0, player2Score: 5, outcomeText: '...', matchedRule: {...} }
 * ```
 */
export function calculatePayoff(
  config: GameConfig,
  player1Choice: string,
  player2Choice: string
): PayoffResult {
  // Validate choices exist in config
  const validChoiceIds = new Set(config.choices.map((c) => c.id));

  if (!validChoiceIds.has(player1Choice)) {
    throw new PayoffCalculationError(
      `Invalid choice for player 1: "${player1Choice}"`,
      player1Choice,
      player2Choice
    );
  }

  if (!validChoiceIds.has(player2Choice)) {
    throw new PayoffCalculationError(
      `Invalid choice for player 2: "${player2Choice}"`,
      player1Choice,
      player2Choice
    );
  }

  // Find matching payoff rule
  const matchedRule = config.payoffRules.find(
    (rule) =>
      rule.condition.player1 === player1Choice &&
      rule.condition.player2 === player2Choice
  );

  if (!matchedRule) {
    throw new PayoffCalculationError(
      `No payoff rule found for combination: player1="${player1Choice}", player2="${player2Choice}"`,
      player1Choice,
      player2Choice
    );
  }

  return {
    player1Score: matchedRule.outcome.player1,
    player2Score: matchedRule.outcome.player2,
    outcomeText: matchedRule.outcomeText,
    matchedRule,
  };
}

/**
 * Gets all possible payoffs for a specific player 1 choice
 *
 * Useful for UI hints or strategy displays
 *
 * @param config - The game configuration
 * @param player1Choice - Player 1's choice ID
 * @returns Array of possible payoffs for each player 2 choice
 *
 * @example
 * ```typescript
 * const outcomes = getPayoffsForChoice(config, 'rock');
 * // [
 * //   { p2Choice: 'rock', p1Score: 0, p2Score: 0 },
 * //   { p2Choice: 'paper', p1Score: -1, p2Score: 1 },
 * //   { p2Choice: 'scissors', p1Score: 1, p2Score: -1 }
 * // ]
 * ```
 */
export function getPayoffsForChoice(
  config: GameConfig,
  player1Choice: string
): Array<{
  player2Choice: string;
  player1Score: number;
  player2Score: number;
  outcomeText?: string;
}> {
  const results: Array<{
    player2Choice: string;
    player1Score: number;
    player2Score: number;
    outcomeText?: string;
  }> = [];

  for (const choice of config.choices) {
    try {
      const payoff = calculatePayoff(config, player1Choice, choice.id);
      results.push({
        player2Choice: choice.id,
        player1Score: payoff.player1Score,
        player2Score: payoff.player2Score,
        outcomeText: payoff.outcomeText,
      });
    } catch {
      // Skip invalid combinations
      continue;
    }
  }

  return results;
}

/**
 * Builds a complete payoff matrix for UI display
 *
 * Returns a 2D structure showing all possible outcomes.
 *
 * @param config - The game configuration
 * @returns Nested array representing the payoff matrix
 *
 * @example
 * ```typescript
 * const matrix = buildPayoffMatrix(config);
 * // matrix[0][0] = { p1Choice: 'rock', p2Choice: 'rock', p1Score: 0, p2Score: 0 }
 * // matrix[0][1] = { p1Choice: 'rock', p2Choice: 'paper', p1Score: -1, p2Score: 1 }
 * // ...
 * ```
 */
export function buildPayoffMatrix(config: GameConfig): Array<
  Array<{
    player1Choice: string;
    player2Choice: string;
    player1Score: number;
    player2Score: number;
    outcomeText?: string;
  }>
> {
  const matrix: Array<
    Array<{
      player1Choice: string;
      player2Choice: string;
      player1Score: number;
      player2Score: number;
      outcomeText?: string;
    }>
  > = [];

  for (const p1Choice of config.choices) {
    const row: Array<{
      player1Choice: string;
      player2Choice: string;
      player1Score: number;
      player2Score: number;
      outcomeText?: string;
    }> = [];

    for (const p2Choice of config.choices) {
      try {
        const payoff = calculatePayoff(config, p1Choice.id, p2Choice.id);
        row.push({
          player1Choice: p1Choice.id,
          player2Choice: p2Choice.id,
          player1Score: payoff.player1Score,
          player2Score: payoff.player2Score,
          outcomeText: payoff.outcomeText,
        });
      } catch {
        // Should never happen if config is valid, but handle gracefully
        row.push({
          player1Choice: p1Choice.id,
          player2Choice: p2Choice.id,
          player1Score: 0,
          player2Score: 0,
          outcomeText: 'Invalid combination',
        });
      }
    }

    matrix.push(row);
  }

  return matrix;
}

/**
 * Validates that all choice combinations have payoff rules
 *
 * This is called during config loading, but can also be used for runtime checks.
 *
 * @param config - The game configuration
 * @returns True if all combinations are covered
 */
export function validatePayoffCoverage(config: GameConfig): boolean {
  for (const p1Choice of config.choices) {
    for (const p2Choice of config.choices) {
      try {
        calculatePayoff(config, p1Choice.id, p2Choice.id);
      } catch {
        return false;
      }
    }
  }
  return true;
}
