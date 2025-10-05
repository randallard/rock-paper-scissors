/**
 * @fileoverview Game configuration loader with Zod validation
 * @module framework/core/config/loader
 *
 * Loads and validates game configurations from YAML files.
 *
 * Pipeline: YAML file -> Parse -> Validate (Zod) -> TypeScript GameConfig
 *
 * CRITICAL: All external config data MUST be validated with Zod
 * Never trust YAML files - they could be modified by users
 */

import { z } from 'zod';
import type {
  GameConfig,
  ChoiceOption,
  PayoffRule,
  GameMetadata,
  GameProgression,
  GameUI,
} from './types';
import { ConfigValidationError, ConfigLoadError } from './types';

/**
 * Zod schema for choice options
 *
 * Validates:
 * - id is non-empty string
 * - label is non-empty string
 * - description and icon are optional strings
 */
const ChoiceOptionSchema = z.object({
  id: z.string().min(1, 'Choice ID cannot be empty'),
  label: z.string().min(1, 'Choice label cannot be empty'),
  description: z.string().optional(),
  icon: z.string().optional(),
}) satisfies z.ZodType<ChoiceOption>;

/**
 * Zod schema for payoff rules
 *
 * Validates:
 * - condition has player1 and player2 choice IDs
 * - outcome has numeric scores for both players
 * - outcomeText is optional
 */
const PayoffRuleSchema = z.object({
  condition: z.object({
    player1: z.string().min(1),
    player2: z.string().min(1),
  }),
  outcome: z.object({
    player1: z.number(),
    player2: z.number(),
  }),
  outcomeText: z.string().optional(),
}) satisfies z.ZodType<PayoffRule>;

/**
 * Zod schema for game metadata
 */
const GameMetadataSchema = z.object({
  id: z.string().min(1, 'Game ID cannot be empty'),
  name: z.string().min(1, 'Game name cannot be empty'),
  description: z.string().min(1, 'Game description cannot be empty'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format (e.g., 1.0.0)'),
  rulesUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
}) satisfies z.ZodType<GameMetadata>;

/**
 * Zod schema for game progression
 */
const GameProgressionSchema = z.object({
  totalRounds: z.number().int().min(1, 'Must have at least 1 round'),
  startingPlayer: z.union([z.literal(1), z.literal(2)]),
  alternateStarter: z.boolean(),
  showRunningTotal: z.boolean(),
}) satisfies z.ZodType<GameProgression>;

/**
 * Zod schema for UI customization
 */
const GameUISchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cssClass: z.string().optional(),
  showPayoffMatrix: z.boolean(),
  showChoiceDescriptions: z.boolean(),
  choiceMadeText: z.string().optional(),
  resultsHeaderText: z.string().optional(),
}) satisfies z.ZodType<GameUI>;

/**
 * Complete game configuration schema
 *
 * This is the root schema that validates entire game configs.
 *
 * CRITICAL: After Zod validation, additional semantic validation occurs:
 * - All payoff rule choice IDs must exist in choices array
 * - Payoff rules must cover all possible choice combinations
 */
export const GameConfigSchema = z.object({
  metadata: GameMetadataSchema,
  choices: z.array(ChoiceOptionSchema).min(2, 'Must have at least 2 choices'),
  payoffRules: z.array(PayoffRuleSchema).min(1, 'Must have at least 1 payoff rule'),
  progression: GameProgressionSchema,
  ui: GameUISchema,
}) satisfies z.ZodType<GameConfig>;

/**
 * Validates semantic correctness of a game config
 *
 * Checks beyond basic Zod validation:
 * 1. All payoff rule choice IDs exist in choices array
 * 2. All possible choice combinations have payoff rules
 * 3. No duplicate payoff rules
 *
 * @param config - The config to validate (already Zod-validated)
 * @throws {ConfigValidationError} If semantic validation fails
 */
function validateGameConfigSemantics(config: GameConfig): void {
  const errors: string[] = [];

  // Extract all choice IDs
  const choiceIds = new Set(config.choices.map((c) => c.id));

  // Validate payoff rule choice IDs exist
  for (const rule of config.payoffRules) {
    if (!choiceIds.has(rule.condition.player1)) {
      errors.push(
        `Payoff rule references unknown choice ID: "${rule.condition.player1}"`
      );
    }
    if (!choiceIds.has(rule.condition.player2)) {
      errors.push(
        `Payoff rule references unknown choice ID: "${rule.condition.player2}"`
      );
    }
  }

  // Check for duplicate payoff rules
  const seenCombinations = new Set<string>();
  for (const rule of config.payoffRules) {
    const key = `${rule.condition.player1}:${rule.condition.player2}`;
    if (seenCombinations.has(key)) {
      errors.push(`Duplicate payoff rule for combination: ${key}`);
    }
    seenCombinations.add(key);
  }

  // Validate all combinations are covered
  const expectedCombinations = config.choices.length * config.choices.length;
  if (config.payoffRules.length !== expectedCombinations) {
    errors.push(
      `Expected ${expectedCombinations} payoff rules (${config.choices.length} × ${config.choices.length}), ` +
        `but found ${config.payoffRules.length}. Every choice combination must have a payoff rule.`
    );
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(
      'Game config semantic validation failed',
      errors
    );
  }
}

/**
 * Loads and validates a game configuration from a YAML import
 *
 * Pipeline:
 * 1. Parse YAML (handled by Vite plugin)
 * 2. Validate with Zod schema
 * 3. Validate semantics (choice IDs, payoff coverage)
 * 4. Return typed GameConfig
 *
 * @param yamlData - Parsed YAML data from import
 * @param configPath - Optional path for error reporting
 * @returns Validated GameConfig
 * @throws {ConfigLoadError} If loading fails
 * @throws {ConfigValidationError} If validation fails
 *
 * @example
 * ```typescript
 * import prisonersDilemmaYaml from '/games/configs/prisoners-dilemma.yaml';
 *
 * const config = loadGameConfig(prisonersDilemmaYaml, 'prisoners-dilemma.yaml');
 * // config is now fully validated and type-safe
 * ```
 */
export function loadGameConfig(
  yamlData: unknown,
  configPath?: string
): GameConfig {
  try {
    // Step 1: Zod validation
    const config = GameConfigSchema.parse(yamlData);

    // Step 2: Semantic validation
    validateGameConfigSemantics(config);

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      throw new ConfigValidationError(
        `Config validation failed: ${configPath || 'unknown'}`,
        errorMessages,
        configPath
      );
    }

    if (error instanceof ConfigValidationError) {
      // Re-throw semantic validation errors
      throw error;
    }

    // Unknown error during loading
    throw new ConfigLoadError(
      `Failed to load config: ${configPath || 'unknown'}`,
      error
    );
  }
}

/**
 * Validates a config object without loading from file
 *
 * Useful for testing and runtime validation
 *
 * @param config - Config object to validate
 * @returns Validated GameConfig
 * @throws {ConfigValidationError} If validation fails
 */
export function validateGameConfig(config: unknown): GameConfig {
  return loadGameConfig(config, 'runtime-validation');
}

/**
 * Type guard to safely check if a value is a validated GameConfig
 */
export function isValidGameConfig(value: unknown): value is GameConfig {
  try {
    validateGameConfig(value);
    return true;
  } catch {
    return false;
  }
}
