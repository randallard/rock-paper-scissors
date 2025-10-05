/**
 * @fileoverview Base Zod schemas with branded types for type safety
 * @module framework/core/schemas/baseSchema
 *
 * Foundational schemas used across all games.
 *
 * CRITICAL PATTERN: Branded Types for IDs
 * - Prevents mixing up player IDs, game IDs, etc.
 * - TypeScript treats branded string as distinct type
 * - Runtime: still a string, but compile-time: type-safe
 *
 * Example:
 * ```typescript
 * const playerId: PlayerId = 'abc-123' as PlayerId; // ❌ Type error
 * const playerId: PlayerId = PlayerIdSchema.parse(uuid()); // ✅ Validated
 * ```
 *
 * Pattern from existing codebase: src/features/game/schemas/gameSchema.ts:20-23
 */

import { z } from 'zod';

/**
 * Branded type for Player IDs
 *
 * CRITICAL: Use .brand() to create nominal types
 * This prevents accidentally using a game ID where a player ID is expected
 *
 * Pattern from existing code:
 * ```typescript
 * export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
 * export type PlayerId = z.infer<typeof PlayerIdSchema>;
 * ```
 */
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export type PlayerId = z.infer<typeof PlayerIdSchema>;

/**
 * Branded type for Game IDs
 *
 * Each game instance gets a unique UUID identifier
 */
export const GameIdSchema = z.string().uuid().brand<'GameId'>();
export type GameId = z.infer<typeof GameIdSchema>;

/**
 * Schema for player number (1 or 2)
 *
 * Used throughout the codebase for identifying which player is acting
 */
export const PlayerNumberSchema = z.union([z.literal(1), z.literal(2)]);
export type PlayerNumber = z.infer<typeof PlayerNumberSchema>;

/**
 * Schema for ISO 8601 datetime strings
 *
 * CRITICAL: Always use z.string().datetime() for timestamps
 * Never use Date objects in serialized state (they don't survive JSON.stringify)
 */
export const DateTimeSchema = z.string().datetime();
export type DateTime = z.infer<typeof DateTimeSchema>;

/**
 * Helper function to create a new Player ID
 *
 * @returns Validated and branded player ID
 */
export function createPlayerId(): PlayerId {
  return PlayerIdSchema.parse(crypto.randomUUID());
}

/**
 * Helper function to create a new Game ID
 *
 * @returns Validated and branded game ID
 */
export function createGameId(): GameId {
  return GameIdSchema.parse(crypto.randomUUID());
}

/**
 * Helper function to create current timestamp
 *
 * @returns ISO 8601 datetime string
 */
export function createTimestamp(): DateTime {
  return DateTimeSchema.parse(new Date().toISOString());
}

/**
 * Type guard to check if a value is a valid Player ID
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return PlayerIdSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid Game ID
 */
export function isGameId(value: unknown): value is GameId {
  return GameIdSchema.safeParse(value).success;
}

/**
 * Type guard to check if a value is a valid player number
 */
export function isPlayerNumber(value: unknown): value is PlayerNumber {
  return PlayerNumberSchema.safeParse(value).success;
}
