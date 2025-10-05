/**
 * @fileoverview Rock Paper Scissors game using configurable framework
 * @module App
 */

import { useState, useEffect, useCallback } from 'react';
import rpsConfig from '/games/configs/rock-paper-scissors.yaml';
import { useConfigLoader } from './framework/hooks/useConfigLoader';
import { DynamicChoiceBoard, ChoiceMadeDisplay } from './framework/components/DynamicChoiceBoard';
import { DynamicPayoffMatrix, PayoffSummary } from './framework/components/DynamicPayoffMatrix';
import { calculatePayoff } from './framework/core/engine/payoffEngine';
import { determineRoundStarter } from './framework/core/engine/turnEngine';
import { createGameId } from './framework/core/schemas/baseSchema';

/**
 * Simple game state structure
 */
interface GameState {
  gameId: string;
  currentRound: number;
  player1Choice?: string;
  player2Choice?: string;
  player1Total: number;
  player2Total: number;
  rounds: Array<{
    player1Choice: string;
    player2Choice: string;
    player1Score: number;
    player2Score: number;
  }>;
}

function App() {
  const { config, loading, error } = useConfigLoader(rpsConfig);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [urlState, setUrlState] = useState<GameState | null>(null);

  // Load game from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedState = urlParams.get('s');

    if (encodedState && config) {
      try {
        // For now, just parse from URL params directly (simplified)
        const decodedState = JSON.parse(atob(encodedState));
        setUrlState(decodedState);
        setGameState(decodedState);
      } catch (err) {
        console.error('Failed to load game from URL:', err);
      }
    }
  }, [config]);

  // Update URL when game state changes
  useEffect(() => {
    if (gameState && !urlState) {
      const encoded = btoa(JSON.stringify(gameState));
      const newUrl = `${window.location.pathname}?s=${encoded}`;
      window.history.pushState({}, '', newUrl);
    }
  }, [gameState, urlState]);

  const startNewGame = useCallback(() => {
    if (!config) return;

    const newGame: GameState = {
      gameId: createGameId(),
      currentRound: 1,
      player1Total: 0,
      player2Total: 0,
      rounds: [],
    };

    setGameState(newGame);
    setUrlState(null);
    window.history.pushState({}, '', window.location.pathname);
  }, [config]);

  const makeChoice = useCallback((playerNum: 1 | 2, choiceId: string) => {
    if (!gameState || !config) return;

    const newState = { ...gameState };

    if (playerNum === 1) {
      newState.player1Choice = choiceId;
    } else {
      newState.player2Choice = choiceId;
    }

    // Check if round is complete
    if (newState.player1Choice && newState.player2Choice) {
      const payoff = calculatePayoff(config, newState.player1Choice, newState.player2Choice);

      // Add to rounds history
      newState.rounds.push({
        player1Choice: newState.player1Choice,
        player2Choice: newState.player2Choice,
        player1Score: payoff.player1Score,
        player2Score: payoff.player2Score,
      });

      // Update totals
      newState.player1Total += payoff.player1Score;
      newState.player2Total += payoff.player2Score;

      // Move to next round
      if (newState.currentRound < config.progression.totalRounds) {
        newState.currentRound += 1;
        newState.player1Choice = undefined;
        newState.player2Choice = undefined;
      }
    }

    setGameState(newState);
    setUrlState(null);
  }, [gameState, config]);

  const copyUrlToClipboard = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading game...</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          Error loading game: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  // No game state - show welcome screen
  if (!gameState) {
    return (
      <div style={styles.container}>
        <div style={styles.welcome}>
          <h1 style={styles.title}>{config.metadata.name}</h1>
          <p style={styles.description}>{config.metadata.description}</p>

          <DynamicPayoffMatrix config={config} />

          <button onClick={startNewGame} style={styles.button}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Check if game is complete
  const isComplete = gameState.currentRound > config.progression.totalRounds;
  const roundComplete = !!(gameState.player1Choice && gameState.player2Choice);
  const currentRoundStarter = determineRoundStarter(config, gameState.currentRound);

  // Game complete
  if (isComplete) {
    const winner = gameState.player1Total > gameState.player2Total ? 'Player 1' :
                   gameState.player2Total > gameState.player1Total ? 'Player 2' :
                   'Tie';

    return (
      <div style={styles.container}>
        <div style={styles.gameBox}>
          <h1 style={styles.title}>Game Over!</h1>

          <div style={styles.totals}>
            <div>
              <h3>Player 1</h3>
              <div style={styles.totalValue}>{gameState.player1Total}</div>
            </div>
            <div>
              <h3>Player 2</h3>
              <div style={styles.totalValue}>{gameState.player2Total}</div>
            </div>
          </div>

          <h2 style={styles.winner}>Winner: {winner}</h2>

          <div style={styles.history}>
            <h3>Round History</h3>
            {gameState.rounds.map((round, idx) => (
              <div key={idx} style={styles.historyRound}>
                <strong>Round {idx + 1}:</strong>{' '}
                P1 chose {round.player1Choice} ({round.player1Score > 0 ? '+' : ''}{round.player1Score}),{' '}
                P2 chose {round.player2Choice} ({round.player2Score > 0 ? '+' : ''}{round.player2Score})
              </div>
            ))}
          </div>

          <button onClick={startNewGame} style={styles.button}>
            New Game
          </button>
        </div>
      </div>
    );
  }

  // Round in progress
  return (
    <div style={styles.container}>
      <div style={styles.gameBox}>
        <h1 style={styles.title}>{config.metadata.name}</h1>
        <p style={styles.roundInfo}>
          Round {gameState.currentRound} of {config.progression.totalRounds}
        </p>

        <div style={styles.totals}>
          <div>
            <span>Player 1: </span>
            <span style={styles.totalValue}>{gameState.player1Total}</span>
          </div>
          <div>
            <span>Player 2: </span>
            <span style={styles.totalValue}>{gameState.player2Total}</span>
          </div>
        </div>

        {/* Show round history */}
        {gameState.rounds.length > 0 && (
          <div style={styles.history}>
            <h3>Previous Rounds</h3>
            {gameState.rounds.map((round, idx) => (
              <PayoffSummary
                key={idx}
                config={config}
                player1Choice={round.player1Choice}
                player2Choice={round.player2Choice}
              />
            ))}
          </div>
        )}

        {/* Current round */}
        {!gameState.player1Choice && !gameState.player2Choice && (
          <>
            {currentRoundStarter === 1 ? (
              <DynamicChoiceBoard
                config={config}
                onChoiceSelected={(choice) => makeChoice(1, choice)}
                playerNumber={1}
              />
            ) : (
              <DynamicChoiceBoard
                config={config}
                onChoiceSelected={(choice) => makeChoice(2, choice)}
                playerNumber={2}
              />
            )}
          </>
        )}

        {gameState.player1Choice && !gameState.player2Choice && (
          <>
            {urlState ? (
              <DynamicChoiceBoard
                config={config}
                onChoiceSelected={(choice) => makeChoice(2, choice)}
                playerNumber={2}
              />
            ) : (
              <div style={styles.waiting}>
                <ChoiceMadeDisplay config={config} choiceId={gameState.player1Choice} />
                <button onClick={copyUrlToClipboard} style={styles.button}>
                  Copy URL for Player 2
                </button>
              </div>
            )}
          </>
        )}

        {!gameState.player1Choice && gameState.player2Choice && (
          <>
            {urlState ? (
              <DynamicChoiceBoard
                config={config}
                onChoiceSelected={(choice) => makeChoice(1, choice)}
                playerNumber={1}
              />
            ) : (
              <div style={styles.waiting}>
                <ChoiceMadeDisplay config={config} choiceId={gameState.player2Choice} />
                <button onClick={copyUrlToClipboard} style={styles.button}>
                  Copy URL for Player 1
                </button>
              </div>
            )}
          </>
        )}

        {roundComplete && (
          <div style={styles.waiting}>
            <h2>Round Complete!</h2>
            <PayoffSummary
              config={config}
              player1Choice={gameState.player1Choice!}
              player2Choice={gameState.player2Choice!}
            />
            <button onClick={copyUrlToClipboard} style={styles.button}>
              Copy URL to Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loading: {
    textAlign: 'center' as const,
    fontSize: '1.5rem',
    marginTop: '100px',
  },
  error: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#ef4444',
    marginTop: '100px',
  },
  welcome: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  gameBox: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#f39c12',
  },
  description: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    color: '#bbb',
  },
  roundInfo: {
    fontSize: '1.1rem',
    marginBottom: '20px',
    color: '#3498db',
    textAlign: 'center' as const,
  },
  totals: {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: '#16213e',
    border: '2px solid #0f3460',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '30px',
  },
  totalValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#f39c12',
    marginLeft: '10px',
  },
  button: {
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    padding: '15px 30px',
    fontSize: '1.1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
  },
  waiting: {
    textAlign: 'center' as const,
    marginTop: '30px',
  },
  history: {
    backgroundColor: '#16213e',
    border: '2px solid #0f3460',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  },
  historyRound: {
    padding: '10px',
    borderBottom: '1px solid #0f3460',
    marginBottom: '10px',
  },
  winner: {
    fontSize: '2rem',
    color: '#10b981',
    textAlign: 'center' as const,
    marginTop: '20px',
  },
};

export default App;
