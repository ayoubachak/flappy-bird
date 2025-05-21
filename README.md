# Flappy Bird Angular Game

A fully functional Flappy Bird game implemented in Angular with configurable physics and logic, plus an AI training mode using the NEAT algorithm.

## Features

- Classic Flappy Bird gameplay
- Configurable physics parameters:
  - Gravity
  - Jump force
  - Pipe gap
  - Pipe speed
  - Game speed
- Score tracking
- Game over screen
- AI Training mode with NEAT algorithm
  - Neural network visualization
  - Training statistics
  - Multiple AI birds learning simultaneously

## How to run

1. Install dependencies:
```
npm install
npm install neataptic
```

2. Start the development server:
```
npm start
```

3. Open your browser and navigate to `http://localhost:4200/`

## How to play

- Click or press Space to make the bird jump
- Navigate through the pipes without hitting them
- Each pipe you pass increases your score

## Game Controls

- **Click/Space**: Jump
- **P key**: Pause game
- **Settings Button**: Access game physics configuration
- **Watch AI Learn**: Switch to AI training mode

## Physics Configuration

You can adjust various game parameters:
- **Gravity**: How quickly the bird falls
- **Jump Force**: How high the bird jumps
- **Pipe Gap**: Space between top and bottom pipes
- **Pipe Speed**: How fast pipes move across the screen
- **Pipe Spawn Rate**: Time between new pipes appearing
- **Game Speed**: Overall game speed multiplier

## AI Training Mode

The AI training mode uses the NEAT (NeuroEvolution of Augmenting Topologies) algorithm to evolve neural networks that learn to play the game. Features include:

- Population of 50 birds learning simultaneously
- Neural network visualization showing connections and node types
- Statistics panel tracking:
  - Generations
  - Fitness scores
  - Population metrics
- Training controls:
  - Pause/resume training
  - Reset training
  - Adjust simulation speed

### AI Implementation

The AI birds receive these inputs:
- Bird's vertical position
- Bird's velocity
- Distance to the next pipe
- Height of the next pipe
- Gap size

Based on these inputs, the neural network outputs a decision to jump or not jump.
