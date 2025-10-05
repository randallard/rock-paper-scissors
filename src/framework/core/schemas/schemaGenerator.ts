/**
 * @fileoverview Dynamic Zod schema generation based on game config
 * @module framework/core/schemas/schemaGenerator
 *
 * Generates runtime Zod schemas that adapt to game configuration.
 *
 * CRITICAL PATTERN: Config-driven type safety
 * - Hardcoded schemas (gameSchema.ts): "silent" | "talk" ❌
 * - Dynamic schemas (this file): choiceId1 | choiceId2 | ... ✅
 *
 * This enables the framework to validate ANY game's state structure
 * based on its YAML config, not hardcoded assumptions.
 */

import { z } from 'zod';
import type { GameConfig } from '../config/types';
import { PlayerIdSchema, GameIdSchema } from './baseSchema';

/**
 * Generates a Zod enum schema for valid choice IDs based on config
 *
 * Example:
 * Config with choices: [{ id: 'rock' }, { id: 'paper' }, { id: 'scissors' }]
 * Returns: z.enum(['rock', 'paper', 'scissors'])
 *
 * @param config - The game configuration
 * @returns Zod enum schema for choice IDs
 */
export function generateChoiceIdSchema(config: GameConfig) {
  const choiceIds = config.choices.map((c) => c.id);

  if (choiceIds.length < 1) {
    throw new Error('Config must have at least 1 choice');
  }

  // z.enum requires at least 1 value and wants tuple type
  return z.enum(choiceIds as [string, ...string[]]);
}

/**
 * Generates schema for a single round based on config
 *
 * Adapts to:
 * - Available choice IDs from config
 * - Number of players (currently hardcoded to 2)
 *
 * @param config - The game configuration
 * @returns Zod schema for a game round
 */
export function generateRoundSchema(config: GameConfig) {
  const choiceSchema = generateChoiceIdSchema(config);

  return z.object({
    player1Choice: choiceSchema,
    player2Choice: choiceSchema,
    player1Score: z.number(),
    player2Score: z.number(),
    outcomeText: z.string().optional(),
  });
}

/**
 * Generates schema for round history based on config
 *
 * @param config - The game configuration
 * @returns Zod schema for array of rounds
 */
export function generateRoundHistorySchema(config: GameConfig) {
  return z.array(generateRoundSchema(config));
}

/**
 * Generates schema for complete game state based on config
 *
 * This is the dynamic equivalent of the hardcoded GameStateSchema.
 *
 * Validates:
 * - Game ID matches config
 * - Player IDs are branded UUIDs
 * - Current round is within total rounds
 * - Round history contains valid choices for this game
 * - Pending choice (if exists) is valid for this game
 *
 * CRITICAL: Uses branded types from base schema (PlayerIdBrand, GameIdBrand)
 * for additional type safety beyond runtime validation
 *
 * @param config - The game configuration
 * @returns Zod schema for complete game state
 */
export function generateGameStateSchema(config: GameConfig) {
  const choiceSchema = generateChoiceIdSchema(config);
  const roundHistorySchema = generateRoundHistorySchema(config);

  return z.object({
    // Game identification
    gameId: GameIdSchema,
    gameType: z.literal(config.metadata.id),
    gameVersion: z.literal(config.metadata.version),

    // Player information
    player1Id: PlayerIdSchema,
    player2Id: PlayerIdSchema.optional(),
    player1Name: z.string().min(1),
    player2Name: z.string().optional(),

    // Game progress
    currentRound: z
      .number()
      .int()
      .min(1)
      .max(config.progression.totalRounds),
    totalRounds: z.literal(config.progression.totalRounds),

    // Round state
    roundHistory: roundHistorySchema,

    // Current round state
    currentStarter: z.union([z.literal(1), z.literal(2)]),
    pendingChoice: z
      .object({
        playerId: PlayerIdSchema,
        choice: choiceSchema,
      })
      .optional(),

    // Totals
    player1Total: z.number(),
    player2Total: z.number(),

    // Timestamps
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });
}

/**
 * Generates schema for game history entry based on config
 *
 * Used for localStorage history validation
 *
 * @param config - The game configuration
 * @returns Zod schema for history entry
 */
export function generateGameHistoryEntrySchema(config: GameConfig) {
  const roundHistorySchema = generateRoundHistorySchema(config);

  return z.object({
    gameId: GameIdSchema,
    gameType: z.literal(config.metadata.id),
    playerNames: z.object({
      player1: z.string(),
      player2: z.string(),
    }),
    totals: z.object({
      player1: z.number(),
      player2: z.number(),
    }),
    rounds: roundHistorySchema,
    completedAt: z.string().datetime(),
  });
}

/**
 * Generates complete localStorage history schema based on config
 *
 * @param config - The game configuration
 * @returns Zod schema for localStorage history
 */
export function generateGameHistorySchema(config: GameConfig) {
  const historyEntrySchema = generateGameHistoryEntrySchema(config);

  return z.object({
    playerName: z.string().min(1),
    games: z.array(historyEntrySchema),
    lastUpdated: z.string().datetime(),
  });
}

/**
 * Type utility to extract the TypeScript type from a generated schema
 *
 * Example:
 * ```typescript
 * const schema = generateGameStateSchema(config);
 * type GameState = z.infer<typeof schema>;
 * ```
 */
export type InferSchemaType<T extends z.ZodType> = z.infer<T>;

/**
 * Cache for generated schemas to avoid regenerating on every call
 *
 * Key: config.metadata.id
 * Value: Generated schemas for that game
 */
const schemaCache = new Map<
  string,
  {
    choiceIdSchema: ReturnType<typeof generateChoiceIdSchema>;
    roundSchema: ReturnType<typeof generateRoundSchema>;
    gameStateSchema: ReturnType<typeof generateGameStateSchema>;
    gameHistorySchema: ReturnType<typeof generateGameHistorySchema>;
  }
>();

/**
 * Gets or generates schemas for a game config (with caching)
 *
 * PERFORMANCE: Generating Zod schemas has overhead. Cache by game ID.
 *
 * @param config - The game configuration
 * @returns Object with all generated schemas
 */
export function getGameSchemas(config: GameConfig) {
  const cacheKey = `${config.metadata.id}-${config.metadata.version}`;

  let cached = schemaCache.get(cacheKey);
  if (!cached) {
    cached = {
      choiceIdSchema: generateChoiceIdSchema(config),
      roundSchema: generateRoundSchema(config),
      gameStateSchema: generateGameStateSchema(config),
      gameHistorySchema: generateGameHistorySchema(config),
    };
    schemaCache.set(cacheKey, cached);
  }

  return cached;
}

/**
 * Clears the schema cache
 *
 * Call this if game configs are hot-reloaded during development
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}
