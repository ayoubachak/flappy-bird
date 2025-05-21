import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent } from 'rxjs';
import { GameService, Pipe } from './game.service';
import { GameConfig, DEFAULT_GAME_CONFIG } from './models/game-config.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) gameCanvas!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  public gameConfig!: GameConfig;
  private subscriptions: Subscription[] = [];
  private resizeObserver!: ResizeObserver;
  
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
  
  // Game objects
  birdPosition = { x: 0, y: 0 };
  pipes: Pipe[] = [];
  
  constructor(private gameService: GameService) { }

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
      this.gameService.pipes$.subscribe(pipes => this.pipes = pipes)
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
    this.gamePaused = true;
    this.gameService.stopGame();
  }
  
  resumeGame(): void {
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
    this.gameService.updateConfig(this.gameConfig);
    if (this.soundEnabled) {
      // Apply volume setting
      this.gameService.setVolume(this.volume);
    } else {
      // Mute all sounds
      this.gameService.setVolume(0);
    }
  }
  
  // Game rendering
  private startGameLoop(): void {
    requestAnimationFrame(() => this.render());
  }
  
  private render(): void {
    const canvas = this.gameCanvas.nativeElement;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (sky)
    this.ctx.fillStyle = 'skyblue';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    this.ctx.fillStyle = '#7B5315';
    this.ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    
    // Calculate responsive bird position based on canvas size
    const canvasRatio = {
      x: canvas.width / 600, // Original design width
      y: canvas.height / 400 // Original design height
    };
    
    // Draw bird
    this.ctx.fillStyle = 'yellow';
    this.ctx.beginPath();
    const birdX = this.birdPosition.x * canvasRatio.x;
    const birdY = this.birdPosition.y * canvasRatio.y;
    const birdSize = this.gameConfig.birdSize * Math.min(canvasRatio.x, canvasRatio.y);
    this.ctx.arc(birdX, birdY, birdSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw pipes with responsive sizing
    this.pipes.forEach(pipe => {
      this.ctx.fillStyle = 'green';
      
      const pipeX = pipe.x * canvasRatio.x;
      const pipeWidth = this.gameConfig.pipeWidth * canvasRatio.x;
      const scaledTopHeight = pipe.topHeight * canvasRatio.y;
      const scaledGap = this.gameConfig.pipeGap * canvasRatio.y;
      
      // Top pipe
      this.ctx.fillRect(
        pipeX,
        0,
        pipeWidth,
        scaledTopHeight
      );
      
      // Bottom pipe
      this.ctx.fillRect(
        pipeX,
        scaledTopHeight + scaledGap,
        pipeWidth,
        canvas.height - scaledTopHeight - scaledGap
      );
    });
    
    // Draw score
    this.ctx.fillStyle = 'white';
    this.ctx.font = `${Math.max(24 * Math.min(canvasRatio.x, canvasRatio.y), 16)}px Arial`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 10, 30 * canvasRatio.y);
    
    // Continue game loop
    requestAnimationFrame(() => this.render());
  }
}
