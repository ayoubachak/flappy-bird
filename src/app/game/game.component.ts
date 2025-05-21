import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent } from 'rxjs';
import { GameService, Pipe } from './game.service';
import { GameConfig, DEFAULT_GAME_CONFIG } from './models/game-config.model';
import { AssetService } from './services/asset.service';
import { 
  BackgroundSkin, 
  BirdSkin, 
  DEFAULT_ASSETS, 
  GameAssets, 
  PipeSkin 
} from './models/game-assets.model';
import { AITrainingComponent } from './ai-training/ai-training.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [AssetService],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) gameCanvas!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  public gameConfig!: GameConfig;
  private subscriptions: Subscription[] = [];
  private resizeObserver!: ResizeObserver;
  private lastFrameTime: number = 0;
  
  // Game state
  score = 0;
  gameOver = false;
  gameStarted = false;
  gamePaused = false;
  showSettings = false;
  
  // Menu state
  difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  soundEnabled = true;
  volume = 0.7;
  showAdvancedSettings = false;
  
  // Asset selection
  selectedAssets: GameAssets = DEFAULT_ASSETS;
  
  // Enum exports for template
  BirdSkin = BirdSkin;
  PipeSkin = PipeSkin;
  BackgroundSkin = BackgroundSkin;
  
  // Bird animation
  birdRotation = 0;
  
  // Game objects
  birdPosition = { x: 0, y: 0 };
  pipes: Pipe[] = [];
  
  constructor(
    private gameService: GameService,
    private assetService: AssetService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const canvas = this.gameCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    this.gameConfig = this.gameService.getConfig();
    
    // Subscribe to game state
    this.subscriptions.push(
      this.gameService.score$.subscribe(score => this.score = score),
      this.gameService.gameOver$.subscribe(gameOver => {
        this.gameOver = gameOver;
        if (gameOver) {
          this.gameStarted = false;
        }
      }),
      this.gameService.birdPosition$.subscribe(position => this.birdPosition = position),
      this.gameService.pipes$.subscribe(pipes => this.pipes = pipes),
      
      // Subscribe to asset changes
      this.assetService.getAssets().subscribe(assets => {
        this.selectedAssets = { ...assets };
      })
    );
    
    // Set default difficulty
    this.applyDifficultyPreset(this.difficulty);
    
    // Start render loop
    this.startGameLoop();
  }

  ngAfterViewInit(): void {
    // Set up resize observer for responsive canvas
    this.setupResponsiveCanvas();
    
    // Initial resize
    this.resizeCanvas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  // Responsive canvas setup
  private setupResponsiveCanvas(): void {
    // Listen for window resize events
    const resizeSubscription = fromEvent(window, 'resize')
      .subscribe(() => this.resizeCanvas());
    this.subscriptions.push(resizeSubscription);
    
    // Use ResizeObserver for container resizing
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    
    // Observe the game container
    const container = this.gameCanvas.nativeElement.parentElement;
    if (container) {
      this.resizeObserver.observe(container);
    }
  }
  
  private resizeCanvas(): void {
    const canvas = this.gameCanvas.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      // Set canvas dimensions to match container (full screen)
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Update game service with new dimensions
      this.gameService.updateConfig({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
    }
  }
  
  // Input handling
  @HostListener('window:keydown.space', ['$event'])
  onSpacePress(event: Event): void {
    event.preventDefault();
    if (this.gamePaused) return;
    this.handleJump();
  }
  
  @HostListener('window:keydown.p', ['$event'])
  onPauseKeyPress(event: Event): void {
    event.preventDefault();
    if (!this.gameStarted || this.gameOver) return;
    
    // Toggle the pause state
    if (this.gamePaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }
  
  @HostListener('window:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    // Only handle clicks on the canvas, not on buttons
    if (event.target === this.gameCanvas.nativeElement && !this.gamePaused) {
      this.handleJump();
    }
  }
  
  @HostListener('window:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    // Only handle touches on the canvas, not on buttons
    if (event.target === this.gameCanvas.nativeElement && !this.gamePaused) {
      this.handleJump();
    }
  }
  
  // Game control methods
  private handleJump(): void {
    if (this.gameOver) {
      this.restartGame();
      return;
    }
    
    if (!this.gameStarted) {
      this.startGame();
      return;
    }
    
    this.gameService.jump();
  }
  
  startGame(): void {
    this.gameStarted = true;
    this.gamePaused = false;
    this.gameService.startGame();
  }
  
  pauseGame(): void {
    if (!this.gameStarted || this.gameOver) return;
    
    this.gamePaused = true;
    this.gameService.stopGame();
  }
  
  resumeGame(): void {
    if (!this.gameStarted || this.gameOver) return;
    
    this.gamePaused = false;
    this.gameService.startGame();
  }
  
  restartGame(): void {
    this.gameStarted = true;
    this.gamePaused = false;
    this.gameOver = false;
    this.gameService.resetGame();
    this.gameService.startGame();
  }
  
  returnToMainMenu(): void {
    this.gameStarted = false;
    this.gamePaused = false;
    this.gameOver = false;
    this.gameService.resetGame();
  }
  
  // Settings methods
  toggleSettings(): void {
    this.showSettings = !this.showSettings;
    if (this.showSettings) {
      this.gameService.stopGame();
    } else if (this.gameStarted && !this.gameOver) {
      this.resumeGame();
    }
  }
  
  toggleAdvancedSettings(): void {
    this.showAdvancedSettings = !this.showAdvancedSettings;
  }
  
  setDifficulty(level: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = level;
    this.applyDifficultyPreset(level);
  }
  
  applyDifficultyPreset(level: 'easy' | 'medium' | 'hard'): void {
    // Apply difficulty presets
    switch (level) {
      case 'easy':
        this.gameConfig = {
          ...DEFAULT_GAME_CONFIG,
          gravity: 0.3,
          pipeGap: 180,
          pipeSpeed: 1.5,
          pipeSpawnRate: 2000,
          gameSpeed: 0.8
        };
        break;
      case 'medium':
        this.gameConfig = {
          ...DEFAULT_GAME_CONFIG
        };
        break;
      case 'hard':
        this.gameConfig = {
          ...DEFAULT_GAME_CONFIG,
          gravity: 0.7,
          pipeGap: 120,
          pipeSpeed: 3,
          pipeSpawnRate: 1200,
          gameSpeed: 1.2
        };
        break;
    }
  }
  
  applySettings(): void {
    // Update game settings
    this.gameService.updateConfig(this.gameConfig);
    
    // Update sound settings
    if (this.soundEnabled) {
      this.gameService.setVolume(this.volume);
    } else {
      this.gameService.setVolume(0);
    }
    
    // Update asset settings
    this.assetService.updateAssets(this.selectedAssets);
    
    this.toggleSettings();
  }
  
  // Game rendering
  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
  
  private gameLoop(timestamp: number): void {
    // Calculate delta time for smooth animations
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Update game elements
    this.updateGameElements(deltaTime);
    
    // Render the frame
    this.render();
    
    // Continue the loop
    requestAnimationFrame((newTimestamp) => this.gameLoop(newTimestamp));
  }
  
  private updateGameElements(deltaTime: number): void {
    if (!this.gameStarted || this.gamePaused || this.gameOver) return;
    
    // Update bird animation
    this.assetService.updateBirdAnimation(deltaTime);
    
    // Update base scroll speed
    const baseScrollSpeed = this.gameConfig.pipeSpeed * this.gameConfig.gameSpeed;
    this.assetService.updateBaseScroll(baseScrollSpeed);
    
    // Update bird rotation based on velocity
    const velocity = this.gameService.getBirdVelocity();
    this.birdRotation = Math.max(-0.5, Math.min(Math.PI / 4, velocity * 0.04));
  }
  
  private render(): void {
    const canvas = this.gameCanvas.nativeElement;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background with repeating pattern if needed
    this.assetService.renderBackground(this.ctx, canvas.width, canvas.height);
    
    // Calculate responsive bird position based on canvas size
    const canvasRatio = {
      x: canvas.width / 600, // Original design width
      y: canvas.height / 400 // Original design height
    };
    
    // Draw pipes with sprites
    this.pipes.forEach(pipe => {
      const pipeX = pipe.x * canvasRatio.x;
      const pipeWidth = this.gameConfig.pipeWidth * canvasRatio.x;
      const scaledTopHeight = pipe.topHeight * canvasRatio.y;
      const bottomY = scaledTopHeight + (this.gameConfig.pipeGap * canvasRatio.y);
      
      this.assetService.renderPipe(
        this.ctx,
        pipeX,
        scaledTopHeight,
        bottomY,
        pipeWidth,
        canvas.height
      );
    });
    
    // Draw base with scrolling effect
    this.assetService.renderBase(this.ctx, canvas.width, canvas.height);
    
    // Draw bird with sprite and rotation
    const birdX = this.birdPosition.x * canvasRatio.x;
    const birdY = this.birdPosition.y * canvasRatio.y;
    const birdSize = this.gameConfig.birdSize * Math.min(canvasRatio.x, canvasRatio.y);
    
    this.assetService.renderBird(
      this.ctx,
      birdX,
      birdY,
      this.birdRotation,
      birdSize
    );
  }

  // Navigate to AI Training mode
  startAITraining(): void {
    // Stop any existing game
    this.gameService.stopGame();
    
    // Navigate to the AI training component
    // For simplicity, we'll just reload the app with a special parameter
    // In a real app with proper routing, use this.router.navigate(['ai-training'])
    window.location.href = '?mode=ai-training';
  }
}
