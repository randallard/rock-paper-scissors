/**
 * @fileoverview Dynamic payoff matrix component for config-driven games
 * @module framework/components/DynamicPayoffMatrix
 *
 * Displays game payoff outcomes in matrix format.
 *
 * CRITICAL PATTERN: Config-driven matrix generation
 * - Uses buildPayoffMatrix from payoffEngine to generate all outcomes
 * - Adapts to any number of choices (2x2, 3x3, NxN matrix)
 * - Shows player scores for each combination
 *
 * This enables strategic planning by showing all possible outcomes.
 *
 * Pattern from existing code: src/features/game/components/PayoffMatrix.tsx
 * But generalized to work with any game configuration.
 */


import type { GameConfig } from '../core/config/types';
import { buildPayoffMatrix } from '../core/engine/payoffEngine';

/**
 * Props for DynamicPayoffMatrix component
 */
export interface DynamicPayoffMatrixProps {
  /** Game configuration */
  config: GameConfig;

  /** Optional CSS class for styling */
  className?: string;

  /** Whether to show the matrix (controlled by config.ui.showPayoffMatrix by default) */
  show?: boolean;
}

/**
 * Dynamic payoff matrix component
 *
 * Renders a table showing all possible outcomes based on game configuration.
 *
 * Features:
 * - Adapts to any matrix size (2x2, 3x3, etc.)
 * - Color-codes positive/negative outcomes
 * - Shows both players' scores
 * - Responsive design
 *
 * @example
 * ```tsx
 * <DynamicPayoffMatrix
 *   config={gameConfig}
 *   show={gameConfig.ui.showPayoffMatrix}
 * />
 * ```
 */
export function DynamicPayoffMatrix({
  config,
  className = '',
  show,
}: DynamicPayoffMatrixProps) {
  // Determine if matrix should be shown
  const shouldShow = show !== undefined ? show : config.ui.showPayoffMatrix;

  if (!shouldShow) {
    return null;
  }

  // Build complete payoff matrix from config
  const matrix = buildPayoffMatrix(config);

  return (
    <div className={`dynamic-payoff-matrix ${className}`}>
      <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>
        Payoff Matrix
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          opacity: 0.8,
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        Shows (Player 1 score, Player 2 score) for each combination
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            margin: '0 auto',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '0.5rem',
                  backgroundColor: '#f5f5f5',
                }}
              >
                {/* Empty corner cell */}
              </th>
              {config.choices.map((choice) => (
                <th
                  key={choice.id}
                  style={{
                    border: '1px solid #ccc',
                    padding: '0.5rem',
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                  }}
                >
                  {choice.icon && <span style={{ marginRight: '0.25rem' }}>{choice.icon}</span>}
                  Player 2: {choice.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => {
              const p1Choice = config.choices[rowIndex];
              if (!p1Choice) return null;

              return (
                <tr key={p1Choice.id}>
                  <th
                    style={{
                      border: '1px solid #ccc',
                      padding: '0.5rem',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold',
                      textAlign: 'left',
                    }}
                  >
                    {p1Choice.icon && <span style={{ marginRight: '0.25rem' }}>{p1Choice.icon}</span>}
                    Player 1: {p1Choice.label}
                  </th>
                  {row.map((cell, colIndex) => {
                    // Color code based on outcomes
                    const p1Score = cell.player1Score;
                    const p2Score = cell.player2Score;

                    // Simple heuristic: green if positive, red if negative, gray if zero
                    const getScoreColor = (score: number) => {
                      if (score > 0) return '#10b981'; // green
                      if (score < 0) return '#ef4444'; // red
                      return '#6b7280'; // gray
                    };

                    return (
                      <td
                        key={colIndex}
                        style={{
                          border: '1px solid #ccc',
                          padding: '0.5rem',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <span style={{ color: getScoreColor(p1Score), fontWeight: 'bold' }}>
                            {p1Score}
                          </span>
                          {', '}
                          <span style={{ color: getScoreColor(p2Score), fontWeight: 'bold' }}>
                            {p2Score}
                          </span>
                        </div>
                        {cell.outcomeText && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              marginTop: '0.25rem',
                              opacity: 0.7,
                            }}
                          >
                            {cell.outcomeText}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        style={{
          fontSize: '0.75rem',
          opacity: 0.6,
          marginTop: '1rem',
          textAlign: 'center',
        }}
      >
        Higher scores are better. Green = positive, Red = negative, Gray = zero
      </p>
    </div>
  );
}

/**
 * Simplified payoff summary component
 *
 * Shows just the outcome text for a specific combination
 * Useful for displaying after both players have chosen
 */
export interface PayoffSummaryProps {
  config: GameConfig;
  player1Choice: string;
  player2Choice: string;
}

export function PayoffSummary({
  config,
  player1Choice,
  player2Choice,
}: PayoffSummaryProps) {
  // Find the matching payoff rule
  const rule = config.payoffRules.find(
    (r) =>
      r.condition.player1 === player1Choice &&
      r.condition.player2 === player2Choice
  );

  if (!rule) {
    return <div>No outcome found for this combination</div>;
  }

  const getScoreColor = (score: number) => {
    if (score > 0) return '#10b981';
    if (score < 0) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="payoff-summary" style={{ textAlign: 'center', padding: '1rem' }}>
      {rule.outcomeText && (
        <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
          {rule.outcomeText}
        </p>
      )}
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        <span>Player 1: </span>
        <span style={{ color: getScoreColor(rule.outcome.player1) }}>
          {rule.outcome.player1 > 0 ? '+' : ''}
          {rule.outcome.player1}
        </span>
        <span style={{ margin: '0 1rem' }}>|</span>
        <span>Player 2: </span>
        <span style={{ color: getScoreColor(rule.outcome.player2) }}>
          {rule.outcome.player2 > 0 ? '+' : ''}
          {rule.outcome.player2}
        </span>
      </div>
    </div>
  );
}
