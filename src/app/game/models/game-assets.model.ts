export interface GameAssets {
  bird: BirdSkin;
  pipes: PipeSkin;
  background: BackgroundSkin;
}

export enum BirdSkin {
  YELLOW = 'yellow',
  RED = 'red',
  BLUE = 'blue'
}

export enum PipeSkin {
  GREEN = 'green',
  RED = 'red'
}

export enum BackgroundSkin {
  DAY = 'day',
  NIGHT = 'night'
}

export interface BirdSpriteFrames {
  upflap: string;
  midflap: string;
  downflap: string;
}

export interface SpriteInfo {
  src: string;
  width?: number;
  height?: number;
}

// Bird animation frames for each color
export const BIRD_SPRITES: Record<BirdSkin, BirdSpriteFrames> = {
  [BirdSkin.YELLOW]: {
    upflap: 'assets/sprites/bird/yellowbird-upflap.png',
    midflap: 'assets/sprites/bird/yellowbird-midflap.png',
    downflap: 'assets/sprites/bird/yellowbird-downflap.png'
  },
  [BirdSkin.RED]: {
    upflap: 'assets/sprites/bird/redbird-upflap.png',
    midflap: 'assets/sprites/bird/redbird-midflap.png',
    downflap: 'assets/sprites/bird/redbird-downflap.png'
  },
  [BirdSkin.BLUE]: {
    upflap: 'assets/sprites/bird/bluebird-upflap.png',
    midflap: 'assets/sprites/bird/bluebird-midflap.png',
    downflap: 'assets/sprites/bird/bluebird-downflap.png'
  }
};

// Sprite paths for all game assets
export const SPRITE_PATHS = {
  backgrounds: {
    [BackgroundSkin.DAY]: { src: 'assets/sprites/background/background-day.png' },
    [BackgroundSkin.NIGHT]: { src: 'assets/sprites/background/background-night.png' }
  },
  pipes: {
    [PipeSkin.GREEN]: { src: 'assets/sprites/pipe/pipe-green.png' },
    [PipeSkin.RED]: { src: 'assets/sprites/pipe/pipe-red.png' }
  },
  base: { src: 'assets/sprites/base/base.png' }
};

export interface AudioFiles {
  wav: string;
  ogg: string;
}

// Audio paths with multiple formats for browser compatibility
export const AUDIO_PATHS = {
  die: {
    wav: 'assets/audio/die.wav',
    ogg: 'assets/audio/die.ogg'
  },
  hit: {
    wav: 'assets/audio/hit.wav',
    ogg: 'assets/audio/hit.ogg'
  },
  point: {
    wav: 'assets/audio/point.wav',
    ogg: 'assets/audio/point.ogg'
  },
  swoosh: {
    wav: 'assets/audio/swoosh.wav',
    ogg: 'assets/audio/swoosh.ogg'
  },
  wing: {
    wav: 'assets/audio/wing.wav',
    ogg: 'assets/audio/wing.ogg'
  }
};

export const DEFAULT_ASSETS: GameAssets = {
  bird: BirdSkin.YELLOW,
  pipes: PipeSkin.GREEN,
  background: BackgroundSkin.DAY
}; 