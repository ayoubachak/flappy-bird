import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DEFAULT_GAME_CONFIG, GameConfig } from './models/game-config.model';

export interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameConfig: GameConfig = DEFAULT_GAME_CONFIG;
  private gameLoopSubject = new Subject<void>();
  private gameOver = new BehaviorSubject<boolean>(false);
  private score = new BehaviorSubject<number>(0);
  private birdPosition = new BehaviorSubject<{ x: number, y: number }>(this.gameConfig.birdPosition);
  private pipes = new BehaviorSubject<Pipe[]>([]);
  private birdVelocity = 0;
  private gameStarted = false;
  
  // Sound properties
  private volume: number = 0.7;
  private soundEnabled: boolean = true;
  private sounds: { [key: string]: HTMLAudioElement } = {};

  gameOver$ = this.gameOver.asObservable();
  score$ = this.score.asObservable();
  birdPosition$ = this.birdPosition.asObservable();
  pipes$ = this.pipes.asObservable();
  
  constructor() {
    this.initSounds();
  }
  
  private initSounds(): void {
    // Initialize sound effects
    this.sounds = {
      jump: new Audio('assets/sounds/jump.mp3'),
      score: new Audio('assets/sounds/score.mp3'),
      hit: new Audio('assets/sounds/hit.mp3'),
      die: new Audio('assets/sounds/die.mp3')
    };
    
    // Set initial volume for all sounds
    this.setVolume(this.volume);
  }
  
  setVolume(volume: number): void {
    this.volume = volume;
    
    // Update all sound volumes
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }
  
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }
  
  private playSound(soundName: string): void {
    if (!this.soundEnabled || this.volume === 0) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.error('Error playing sound:', err));
    }
  }
  
  updateConfig(config: Partial<GameConfig>): void {
    this.gameConfig = { ...this.gameConfig, ...config };
    
    // Reset bird position when config changes
    if (!this.gameStarted) {
      this.birdPosition.next(this.gameConfig.birdPosition);
    }
  }
  
  getConfig(): GameConfig {
    return { ...this.gameConfig };
  }

  startGame(): void {
    if (this.gameStarted) return;
    
    this.resetGame();
    this.gameStarted = true;
    
    // Game loop
    interval(16) // ~60fps
      .pipe(takeUntil(this.gameLoopSubject))
      .subscribe(() => this.gameLoop());
    
    // Pipe generator
    interval(this.gameConfig.pipeSpawnRate)
      .pipe(takeUntil(this.gameLoopSubject))
      .subscribe(() => this.generatePipe());
  }
  
  stopGame(): void {
    this.gameStarted = false;
    this.gameLoopSubject.next();
  }
  
  resetGame(): void {
    this.stopGame();
    this.gameOver.next(false);
    this.score.next(0);
    this.birdPosition.next({ ...this.gameConfig.birdPosition });
    this.pipes.next([]);
    this.birdVelocity = 0;
  }
  
  jump(): void {
    if (!this.gameStarted) {
      this.startGame();
      return;
    }
    
    if (this.gameOver.value) {
      this.resetGame();
      this.startGame();
      return;
    }
    
    this.birdVelocity = this.gameConfig.jumpForce;
    this.playSound('jump');
  }
  
  private gameLoop(): void {
    // Update bird position
    const currentPosition = this.birdPosition.value;
    this.birdVelocity += this.gameConfig.gravity;
    
    const newY = currentPosition.y + this.birdVelocity;
    this.birdPosition.next({ ...currentPosition, y: newY });
    
    // Update pipes position
    const currentPipes = this.pipes.value;
    const updatedPipes = currentPipes
      .map(pipe => ({
        ...pipe,
        x: pipe.x - this.gameConfig.pipeSpeed * this.gameConfig.gameSpeed
      }))
      .filter(pipe => pipe.x > -this.gameConfig.pipeWidth);
    
    // Check for score increments (when bird passes a pipe)
    updatedPipes.forEach(pipe => {
      if (!pipe.passed && pipe.x < this.gameConfig.birdPosition.x - this.gameConfig.pipeWidth / 2) {
        pipe.passed = true;
        this.score.next(this.score.value + 1);
        this.playSound('score');
      }
    });
    
    this.pipes.next(updatedPipes);
    
    // Check collision with ground
    if (newY > 400 - this.gameConfig.birdSize / 2 || newY < this.gameConfig.birdSize / 2) {
      this.endGame();
      return;
    }
    
    // Check collision with pipes
    if (this.checkPipeCollision()) {
      this.endGame();
    }
  }
  
  private generatePipe(): void {
    if (this.gameOver.value) return;
    
    const minTopHeight = 50;
    const maxTopHeight = 300 - this.gameConfig.pipeGap - minTopHeight;
    const topHeight = Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) + minTopHeight;
    
    const newPipe: Pipe = {
      x: 600, // canvas width
      topHeight,
      passed: false
    };
    
    const currentPipes = this.pipes.value;
    this.pipes.next([...currentPipes, newPipe]);
  }
  
  private checkPipeCollision(): boolean {
    const bird = {
      x: this.gameConfig.birdPosition.x,
      y: this.birdPosition.value.y,
      radius: this.gameConfig.birdSize / 2
    };
    
    return this.pipes.value.some(pipe => {
      // Bird is within pipe's x-range
      if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + this.gameConfig.pipeWidth) {
        // Check if bird is colliding with top pipe
        if (bird.y - bird.radius < pipe.topHeight) {
          return true;
        }
        
        // Check if bird is colliding with bottom pipe
        if (bird.y + bird.radius > pipe.topHeight + this.gameConfig.pipeGap) {
          return true;
        }
      }
      return false;
    });
  }
  
  private endGame(): void {
    this.playSound('hit');
    setTimeout(() => this.playSound('die'), 500);
    this.gameOver.next(true);
    this.stopGame();
  }
}
