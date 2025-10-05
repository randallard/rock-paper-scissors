/**
 * @fileoverview Dynamic choice board component for config-driven games
 * @module framework/components/DynamicChoiceBoard
 *
 * Renders player choice UI dynamically based on game configuration.
 *
 * CRITICAL PATTERN: Config-driven UI
 * - Hardcoded: <button>Stay Silent</button>, <button>Talk</button> ❌
 * - Dynamic: config.choices.map(choice => <button>{choice.label}</button>) ✅
 *
 * This enables the component to work with ANY game config:
 * - Prisoner's Dilemma: 2 choices (Silent, Talk)
 * - Rock Paper Scissors: 3 choices (Rock, Paper, Scissors)
 * - Custom games: N choices
 *
 * Pattern from existing code: src/features/game/components/ChoiceBoard.tsx
 * But generalized to work with config-driven choices.
 */


import type { GameConfig, ChoiceOption } from '../core/config/types';

/**
 * Props for DynamicChoiceBoard component
 */
export interface DynamicChoiceBoardProps {
  /** Game configuration defining available choices */
  config: GameConfig;

  /** Callback when player makes a choice */
  onChoiceSelected: (choiceId: string) => void;

  /** Whether choices are disabled (e.g., waiting for other player) */
  disabled?: boolean;

  /** Which player is making the choice (for display) */
  playerNumber: 1 | 2;

  /** Optional CSS class for styling */
  className?: string;
}

/**
 * Individual choice button component
 */
interface ChoiceButtonProps {
  choice: ChoiceOption;
  onClick: () => void;
  disabled: boolean;
  showDescription: boolean;
  primaryColor?: string;
}

function ChoiceButton({
  choice,
  onClick,
  disabled,
  showDescription,
  primaryColor,
}: ChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="choice-button"
      style={{
        backgroundColor: disabled ? '#ccc' : primaryColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '1rem',
        margin: '0.5rem',
        borderRadius: '8px',
        border: '2px solid #333',
        fontSize: '1.125rem',
        fontWeight: 'bold',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="choice-content">
        {choice.icon && (
          <span className="choice-icon" style={{ fontSize: '2rem', display: 'block' }}>
            {choice.icon}
          </span>
        )}
        <span className="choice-label">{choice.label}</span>
        {showDescription && choice.description && (
          <p
            className="choice-description"
            style={{
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              opacity: 0.9,
            }}
          >
            {choice.description}
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * Dynamic choice board component
 *
 * Renders choice buttons based on game configuration.
 *
 * Features:
 * - Adapts to any number of choices (2, 3, 4+)
 * - Shows icons and descriptions if configured
 * - Applies theme colors from config
 * - Responsive grid layout
 *
 * @example
 * ```tsx
 * <DynamicChoiceBoard
 *   config={gameConfig}
 *   onChoiceSelected={(choiceId) => handleChoice(choiceId)}
 *   playerNumber={1}
 *   disabled={waitingForOtherPlayer}
 * />
 * ```
 */
export function DynamicChoiceBoard({
  config,
  onChoiceSelected,
  disabled = false,
  playerNumber,
  className = '',
}: DynamicChoiceBoardProps) {
  const showDescriptions = config.ui.showChoiceDescriptions;
  const primaryColor = config.ui.primaryColor || '#3b82f6';

  return (
    <div className={`dynamic-choice-board ${className}`}>
      <h2 style={{ marginBottom: '1rem' }}>
        Your Choice (Player {playerNumber})
      </h2>

      <div
        className="choice-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
          gap: '1rem',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {config.choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            onClick={() => onChoiceSelected(choice.id)}
            disabled={disabled}
            showDescription={showDescriptions}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Displays choice that has been made (waiting state)
 */
export interface ChoiceMadeDisplayProps {
  config: GameConfig;
  choiceId: string;
}

export function ChoiceMadeDisplay({ config, choiceId }: ChoiceMadeDisplayProps) {
  const choice = config.choices.find((c) => c.id === choiceId);

  if (!choice) {
    return <div>Choice made</div>;
  }

  return (
    <div className="choice-made-display" style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>{config.ui.choiceMadeText || 'Choice Made!'}</h2>
      {choice.icon && (
        <div style={{ fontSize: '4rem', margin: '1rem 0' }}>{choice.icon}</div>
      )}
      <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
        You chose: {choice.label}
      </p>
      {choice.description && (
        <p style={{ fontSize: '1rem', opacity: 0.8, marginTop: '0.5rem' }}>
          {choice.description}
        </p>
      )}
      <p style={{ marginTop: '1rem', opacity: 0.7 }}>
        Waiting for other player...
      </p>
    </div>
  );
}
