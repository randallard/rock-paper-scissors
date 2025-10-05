# Rock Paper Scissors - Correspondence Game

A URL-based Rock Paper Scissors game built with the configurable correspondence games framework.

## Features

- ✅ **Config-driven**: Powered by YAML configuration
- ✅ **URL-based gameplay**: Share links to play asynchronously
- ✅ **Framework components**: Uses DynamicChoiceBoard and DynamicPayoffMatrix
- ✅ **3 rounds**: Quick games with running totals
- ✅ **Zero-sum scoring**: Winner gets +1, loser gets -1, ties get 0

## Quick Start

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5174/rock-paper-scissors/`

### How to Play

1. **Player 1** starts the game and makes their choice (Rock, Paper, or Scissors)
2. Copy the URL and send it to **Player 2**
3. **Player 2** opens the URL and makes their choice
4. Results are revealed and totals are updated
5. Repeat for 3 rounds
6. Winner is determined by highest total score

## Game Configuration

The game is defined in `games/configs/rock-paper-scissors.yaml`:

```yaml
metadata:
  id: rock-paper-scissors
  name: "Rock Paper Scissors"
  version: "1.0.0"

choices:
  - id: rock
    label: "Rock"
    icon: "🪨"
  - id: paper
    label: "Paper"
    icon: "📄"
  - id: scissors
    label: "Scissors"
    icon: "✂️"

# 9 payoff rules (3×3 combinations)
# Rock beats scissors, scissors beats paper, paper beats rock
```

## Framework Components Used

### DynamicChoiceBoard
Renders choice buttons dynamically based on config:
- Adapts to any number of choices
- Shows icons and descriptions
- Applies theme colors

### DynamicPayoffMatrix
Displays payoff outcomes:
- Color-coded scores (green=positive, red=negative)
- Shows all possible combinations
- Outcome text for each scenario

### Game Engines
- **PayoffEngine**: Calculates scores from config rules
- **TurnEngine**: Manages round progression

## Project Structure

```
rock-paper-scissors/
├── src/
│   ├── App.tsx                 # Main game logic
│   ├── main.tsx                # React entry point
│   ├── framework/              # Configurable framework
│   │   ├── core/
│   │   │   ├── config/         # YAML loader & validation
│   │   │   ├── schemas/        # Zod schemas
│   │   │   └── engine/         # Game logic engines
│   │   ├── components/         # Dynamic UI components
│   │   ├── hooks/              # React hooks
│   │   └── storage/            # Encryption utilities
│   └── shared/
│       └── utils/
│           └── constants.ts    # Game secret
│
├── games/configs/
│   └── rock-paper-scissors.yaml
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Available Scripts

```bash
npm run dev          # Start dev server (port 5174)
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript validation
```

## Deployment

### GitHub Pages (Automated)

Simply run:
```bash
npm run deploy
```

This will:
1. Build the project
2. Push the `dist/` folder to the `gh-pages` branch
3. GitHub Pages will automatically serve from that branch

**First-time setup**: Make sure GitHub Pages is enabled in your repo settings and set to deploy from the `gh-pages` branch.

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Push the `dist/` directory to the `gh-pages` branch:
   ```bash
   git subtree push --prefix dist origin gh-pages
   ```

**Note**: The `vite.config.ts` is already configured with the correct base path: `/rock-paper-scissors/`

## Customization

### Change Number of Rounds

Edit `games/configs/rock-paper-scissors.yaml`:

```yaml
progression:
  totalRounds: 5  # Change to any number
```

### Add New Choices

To create Rock-Paper-Scissors-Lizard-Spock:

1. Add new choices to `choices` array
2. Add all payoff rules (5×5 = 25 combinations)
3. Framework handles the rest automatically!

### Theme Colors

```yaml
ui:
  primaryColor: "#ef4444"      # Red theme
  secondaryColor: "#f59e0b"    # Orange accent
```

## Architecture

This game demonstrates the configurable framework's capabilities:

- **No hardcoded game logic** - everything from YAML
- **Dynamic UI generation** - adapts to config
- **Type-safe** - Zod validation at runtime
- **Reusable** - same components work for any game

## Related Games

- [Prisoner's Dilemma](../prisoners-dilemma/) - 2 choices, 5 rounds
- Create your own game using this framework!

## License

MIT

---

Built with the [Correspondence Games Framework](https://github.com/your-org/correspondence-games-framework)
