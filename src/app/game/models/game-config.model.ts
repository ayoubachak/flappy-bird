export interface GameConfig {
  gravity: number;
  birdSize: number;
  birdPosition: { x: number, y: number };
  jumpForce: number;
  pipeWidth: number;
  pipeGap: number;
  pipeSpeed: number;
  pipeSpawnRate: number; // in milliseconds
  gameSpeed: number;
  canvasWidth?: number; // Add canvas dimensions for responsive design
  canvasHeight?: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gravity: 0.5,
  birdSize: 30,
  birdPosition: { x: 50, y: 200 },
  jumpForce: -10,
  pipeWidth: 60,
  pipeGap: 150,
  pipeSpeed: 2,
  pipeSpawnRate: 1500,
  gameSpeed: 1
}; 