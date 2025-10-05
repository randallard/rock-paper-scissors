/**
 * @fileoverview Turn-based game progression engine
 * @module framework/core/engine/turnEngine
 *
 * Manages round progression, turn alternation, and game state transitions.
 *
 * CRITICAL PATTERN: Config-driven turn logic
 * - startingPlayer: who goes first (1 or 2)
 * - alternateStarter: whether to alternate who goes first each round
 * - totalRounds: how many rounds in a complete game
 *
 * This replaces hardcoded turn logic with config-based rules.
 *
 * Pattern from existing code:
 * - src/features/game/utils/gameLogic.ts:31-58 (determineNextPhase)
 * - src/features/game/utils/gameLogic.ts:60-107 (processMove)
 */

import type { GameConfig } from '../config/types';
import type { PlayerNumber } from '../schemas/baseSchema';

/**
 * Determines which player should go first in a given round
 *
 * Respects config.progression.alternateStarter setting.
 *
 * Algorithm:
 * - If alternateStarter is false: always return startingPlayer
 * - If alternateStarter is true: alternate between 1 and 2 each round
 *   - Round 1: startingPlayer
 *   - Round 2: opposite player
 *   - Round 3: startingPlayer again
 *   - etc.
 *
 * @param config - The game configuration
 * @param roundNumber - The round number (1-indexed)
 * @returns The player number who goes first this round
 *
 * @example
 * ```typescript
 * // Config: startingPlayer=1, alternateStarter=true
 * determineRoundStarter(config, 1); // Returns 1
 * determineRoundStarter(config, 2); // Returns 2
 * determineRoundStarter(config, 3); // Returns 1
 * ```
 */
export function determineRoundStarter(
  config: GameConfig,
  roundNumber: number
): PlayerNumber {
  if (!config.progression.alternateStarter) {
    return config.progression.startingPlayer;
  }

  // Alternate each round
  if (roundNumber % 2 === 1) {
    // Odd rounds: original starting player
    return config.progression.startingPlayer;
  } else {
    // Even rounds: opposite player
    return config.progression.startingPlayer === 1 ? 2 : 1;
  }
}

/**
 * Determines if a round is complete
 *
 * A round is complete when both players have made their choices.
 *
 * @param player1Choice - Player 1's choice (undefined if not made)
 * @param player2Choice - Player 2's choice (undefined if not made)
 * @returns True if both choices are present
 */
export function isRoundComplete(
  player1Choice: string | undefined,
  player2Choice: string | undefined
): boolean {
  return player1Choice !== undefined && player2Choice !== undefined;
}

/**
 * Determines if the game is complete
 *
 * A game is complete when all rounds have been played and both players
 * have made choices in the final round.
 *
 * @param currentRound - The current round number
 * @param totalRounds - Total number of rounds in the game
 * @param roundComplete - Whether the current round is complete
 * @returns True if the game has ended
 */
export function isGameComplete(
  currentRound: number,
  totalRounds: number,
  roundComplete: boolean
): boolean {
  return currentRound === totalRounds && roundComplete;
}

/**
 * Determines which player should act next
 *
 * Logic:
 * - If no choices made this round: return the round starter
 * - If round starter has made choice but responder hasn't: return responder
 * - If both have made choices: return undefined (round complete)
 *
 * @param config - The game configuration
 * @param roundNumber - The current round number
 * @param player1Choice - Player 1's choice (undefined if not made)
 * @param player2Choice - Player 2's choice (undefined if not made)
 * @returns The player number who should act next, or undefined if round complete
 *
 * @example
 * ```typescript
 * // Round 1, P1 goes first, no choices yet
 * determineNextPlayer(config, 1, undefined, undefined); // Returns 1
 *
 * // P1 has chosen, P2 hasn't
 * determineNextPlayer(config, 1, 'rock', undefined); // Returns 2
 *
 * // Both have chosen
 * determineNextPlayer(config, 1, 'rock', 'paper'); // Returns undefined
 * ```
 */
export function determineNextPlayer(
  config: GameConfig,
  roundNumber: number,
  player1Choice: string | undefined,
  player2Choice: string | undefined
): PlayerNumber | undefined {
  const starter = determineRoundStarter(config, roundNumber);

  // No choices yet - starter goes first
  if (!player1Choice && !player2Choice) {
    return starter;
  }

  // Determine responder (opposite of starter)
  const responder: PlayerNumber = starter === 1 ? 2 : 1;

  // Check if starter has made choice
  const starterChoice = starter === 1 ? player1Choice : player2Choice;
  const responderChoice = responder === 1 ? player1Choice : player2Choice;

  if (!starterChoice) {
    // Starter hasn't chosen yet
    return starter;
  }

  if (!responderChoice) {
    // Starter has chosen, responder hasn't
    return responder;
  }

  // Both have chosen - round complete
  return undefined;
}

/**
 * Calculates the next round number
 *
 * @param currentRound - The current round number
 * @param totalRounds - Total rounds in the game
 * @returns Next round number, or current if game is complete
 */
export function calculateNextRound(
  currentRound: number,
  totalRounds: number
): number {
  if (currentRound >= totalRounds) {
    return currentRound; // Game complete, don't advance
  }
  return currentRound + 1;
}

/**
 * Determines starter for a rematch game
 *
 * CRITICAL: For rematch, the player who DIDN'T start in the previous game
 * should start in the rematch. This is the role reversal pattern.
 *
 * @param previousStartingPlayer - Who started the previous game
 * @returns Who should start the rematch
 */
export function determineRematchStarter(
  previousStartingPlayer: PlayerNumber
): PlayerNumber {
  return previousStartingPlayer === 1 ? 2 : 1;
}

/**
 * Helper to get the opposite player number
 *
 * @param player - Player number (1 or 2)
 * @returns The other player number
 */
export function getOpponentPlayer(player: PlayerNumber): PlayerNumber {
  return player === 1 ? 2 : 1;
}

/**
 * Validates that a player is allowed to make a move
 *
 * Checks:
 * 1. Game is not complete
 * 2. It's this player's turn
 * 3. Player hasn't already made a choice this round
 *
 * @param config - The game configuration
 * @param currentRound - The current round number
 * @param player - The player attempting to move
 * @param player1Choice - Player 1's current choice
 * @param player2Choice - Player 2's current choice
 * @returns True if move is valid
 */
export function canPlayerMove(
  config: GameConfig,
  currentRound: number,
  player: PlayerNumber,
  player1Choice: string | undefined,
  player2Choice: string | undefined
): boolean {
  // Check if game is complete
  if (currentRound > config.progression.totalRounds) {
    return false;
  }

  // Check if this round is already complete
  if (isRoundComplete(player1Choice, player2Choice)) {
    return false;
  }

  // Check if it's this player's turn
  const nextPlayer = determineNextPlayer(
    config,
    currentRound,
    player1Choice,
    player2Choice
  );

  if (nextPlayer !== player) {
    return false;
  }

  // Check if player has already made a choice
  const playerChoice = player === 1 ? player1Choice : player2Choice;
  if (playerChoice !== undefined) {
    return false;
  }

  return true;
}

/**
 * Gets a human-readable description of the current turn state
 *
 * Useful for UI messages
 *
 * @param config - The game configuration
 * @param roundNumber - The current round number
 * @param player1Choice - Player 1's choice
 * @param player2Choice - Player 2's choice
 * @returns Description string
 */
export function getTurnDescription(
  config: GameConfig,
  roundNumber: number,
  player1Choice: string | undefined,
  player2Choice: string | undefined
): string {
  if (isGameComplete(roundNumber, config.progression.totalRounds, isRoundComplete(player1Choice, player2Choice))) {
    return 'Game complete';
  }

  const nextPlayer = determineNextPlayer(
    config,
    roundNumber,
    player1Choice,
    player2Choice
  );

  if (nextPlayer === undefined) {
    return 'Round complete - advancing to next round';
  }

  const starter = determineRoundStarter(config, roundNumber);
  if (nextPlayer === starter && !player1Choice && !player2Choice) {
    return `Round ${roundNumber}: Player ${nextPlayer} goes first`;
  }

  return `Round ${roundNumber}: Waiting for Player ${nextPlayer}`;
}
