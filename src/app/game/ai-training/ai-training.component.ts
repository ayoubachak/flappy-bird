import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService, AIStats, BirdAgent } from '../services/ai.service';
import { AssetService } from '../services/asset.service';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../models/game-config.model';
import { NeuralNetworkVisualizerComponent } from '../ai-visualization/neural-network-visualizer.component';
import { AIStatsVisualizerComponent } from '../ai-visualization/ai-stats-visualizer.component';
import { Subscription } from 'rxjs';

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

// Add an interface for the rectangle type
interface CollisionRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

@Component({
  selector: 'app-ai-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NeuralNetworkVisualizerComponent,
    AIStatsVisualizerComponent
  ],
  template: `
    <div class="ai-training-container">
      <div class="game-container">
        <canvas #gameCanvas class="game-canvas"></canvas>
        
        <!-- Floating mobile UI elements (no backgrounds) -->
        <div class="mobile-only mobile-generation-display">
          <span>Gen: {{aiStats?.generation || 0}}</span>
          <span>Birds: {{aiStats?.aliveCount || 0}}/{{aiStats?.population || 0}}</span>
        </div>
        
        <div class="mobile-only mobile-controls">
          <button (click)="togglePause()" class="mobile-button">
            {{ isPaused ? '▶' : '❚❚' }}
          </button>
          <button (click)="forceNextGeneration()" class="mobile-button">
            Next Gen
          </button>
          <button (click)="exitAIMode()" class="mobile-button">
            Exit
          </button>
        </div>
      </div>
      
      <div class="visualization-panel desktop-only">
        <div class="network-visualization">
          <app-neural-network-visualizer 
            [network]="selectedAgentBrain">
          </app-neural-network-visualizer>
        </div>
        
        <div class="stats-visualization">
          <app-ai-stats-visualizer 
            [stats]="aiStats">
          </app-ai-stats-visualizer>
        </div>
        
        <div class="game-controls">
          <button (click)="togglePause()" class="control-button">
            {{ isPaused ? 'Resume' : 'Pause' }}
          </button>
          <button (click)="resetTraining()" class="control-button">
            Reset Training
          </button>
          <button (click)="exitAIMode()" class="control-button">
            Back to Main Menu
          </button>
          
          <div class="speed-control">
            <label for="simulationSpeed">Simulation Speed:</label>
            <input 
              type="range" 
              id="simulationSpeed" 
              [(ngModel)]="simulationSpeed" 
              min="1" 
              max="10" 
              step="1"
            >
            <span>{{ simulationSpeed }}x</span>
      </div>
      
          <button (click)="forceKillAllBirds()" class="control-button emergency-button">
            Emergency: Kill All Birds
          </button>
          
          <button (click)="forceNextGeneration()" class="control-button next-gen-button">
            Force Next Generation
          </button>
        </div>
      </div>
      
      <!-- Mobile-only neural network display (no backgrounds) -->
<div class="mobile-only mobile-neural-network" [class.hidden]="hideMobileNetwork">
  <app-neural-network-visualizer [network]="selectedAgentBrain"></app-neural-network-visualizer>
</div>
<!-- Mobile toggle for neural network -->
<button class="mobile-only mobile-network-toggle" (click)="toggleMobileNetwork()">
  {{ hideMobileNetwork ? 'Show' : 'Hide' }} NN
</button>
    </div>
  `,
  styles: [`
    .ai-training-container {
      width: 100%;
      height: 100vh;
      display: flex;
      background-color: #87CEEB;
      overflow: hidden;
    }
    
    .game-container {
      flex: 2;
      position: relative;
      height: 100%;
    }
    
    .game-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .game-controls {
      margin-top: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .control-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      padding: 8px 15px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .control-button:hover {
      background-color: #45a049;
    }
    
    .speed-control {
      display: flex;
      flex-direction: column;
      color: white;
      margin-top: 10px;
    }
    
    .speed-control label {
      margin-bottom: 5px;
    }
    
    .speed-control span {
      text-align: center;
      margin-top: 5px;
    }
    
    .visualization-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 20px;
      overflow: auto;
      position: relative;
    }
    
    .network-visualization,
    .stats-visualization {
      flex: 1;
    }
    
    .emergency-button {
      background-color: #f44336;
      margin-top: 20px;
    }
    
    .emergency-button:hover {
      background-color: #d32f2f;
    }
    
    .next-gen-button {
      background-color: #2196F3;
      margin-top: 10px;
    }
    
    .next-gen-button:hover {
      background-color: #0b7dda;
    }
    
    /* By default, hide all mobile elements */
    .mobile-only {
      display: none;
    }
    
    /* Mobile generation display - floating with no background */
    .mobile-generation-display {
      position: absolute;
      top: 15px;
      right: 15px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .mobile-generation-display span {
      background-color: rgba(0, 0, 0, 0.5);
      padding: 3px 6px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    
    /* Mobile controls - minimal buttons */
.mobile-controls {
  position: absolute;
  bottom: 15px;
  right: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  /* Ensure controls don't overlap with neural network */
  width: auto;
}
    
    .mobile-button {
      width: 50px;
      height: 50px;
      border-radius: 25px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      font-size: 14px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    
    .mobile-button:active {
      transform: scale(0.95);
    }
    
    /* Mobile neural network */
.mobile-neural-network {
  position: absolute;
  bottom: 80px;
  left: 15px;
  width: 45%;
  height: 35%;
  pointer-events: none;
  z-index: 90;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.mobile-neural-network.hidden {
  opacity: 0;
  visibility: hidden;
}

.mobile-network-toggle {
  position: absolute;
  bottom: 15px;
  left: 15px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 12px;
  z-index: 100;
}

.mobile-neural-network::before {
  content: "Neural Network";
  position: absolute;
  top: 5px;
  left: 10px;
  font-size: 10px;
  color: white;
  z-index: 91;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 3px;
}

.mobile-neural-network ::ng-deep .network-visualizer-container {
      background-color: transparent !important;
      border-radius: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    
    .mobile-neural-network ::ng-deep h3,
    .mobile-neural-network ::ng-deep .network-legend {
      display: none !important;
    }
    
    .mobile-neural-network ::ng-deep .canvas-container {
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
}

.mobile-neural-network ::ng-deep canvas {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
}

.mobile-neural-network ::ng-deep .drag-instructions {
  display: none !important;
}
    
    /* Media query for mobile */
    @media (max-width: 768px) {
      .ai-training-container {
        flex-direction: column;
      }
      
      .game-container {
        flex: 1;
        height: 100vh;
      }
      
      .desktop-only {
        display: none !important;
      }
      
      .mobile-only {
        display: block;
      }
    }
    
    /* Tablet/desktop layout */
    @media (min-width: 769px) {
      .desktop-only {
        display: flex;
      }
      
      .mobile-only {
        display: none !important;
      }
    }
  `]
})
export class AITrainingComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) gameCanvas!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private gameConfig: GameConfig = { ...DEFAULT_GAME_CONFIG };
  private lastFrameTime = 0;
  private frameCount = 0;
  private agents: BirdAgent[] = [];
  private pipes: Pipe[] = [];
  private nextPipeIndex = 0;
  private subscriptions: Subscription[] = [];
  private pipeSpawnTimer = 0;
  
  isPaused = false;
simulationSpeed = 3;
aiStats: AIStats | null = null;
selectedAgentBrain: any = null;
selectedAgentId = 0;
hideMobileNetwork = false;
  
  constructor(
    private aiService: AIService,
    private assetService: AssetService
  ) { }
  
  ngOnInit(): void {
    const canvas = this.gameCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    this.resizeCanvas();
    
    // Subscribe to AI stats
    this.subscriptions.push(
      this.aiService.aiStats$.subscribe(stats => {
        this.aiStats = stats;
      })
    );
    
    // Get initial agents
    this.agents = this.aiService.getAgents();
    if (this.agents.length > 0) {
      this.selectedAgentId = this.agents[0].id;
      this.updateSelectedAgentBrain();
    }
    
    // Start the game loop
    this.startGameLoop();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private resizeCanvas(): void {
    const canvas = this.gameCanvas.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Update game config with new dimensions
      this.gameConfig = {
        ...this.gameConfig,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      };
    }
  }
  
  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
  }
  
  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
  
  private gameLoop(timestamp: number): void {
    // Calculate delta time
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Skip updates if paused
    if (!this.isPaused) {
      // Run multiple updates based on simulation speed
      for (let i = 0; i < this.simulationSpeed; i++) {
        this.update(deltaTime / this.simulationSpeed);
      }
    }
    
    // Always render
    this.render();
    
    // Continue loop
    requestAnimationFrame((newTimestamp) => this.gameLoop(newTimestamp));
  }
  
  private update(deltaTime: number): void {
    this.frameCount++;
    
    // Count alive birds for debugging
    const aliveCount = this.agents.filter(a => a.alive).length;
    
    // CRITICAL FIX: Check if all birds are dead and trigger evolution manually
    if (aliveCount === 0 && this.agents.length > 0) {
      console.log("ALL BIRDS DEAD - MANUALLY TRIGGERING NEXT GENERATION");
      
      // Force reset the bird population
      this.forceNextGeneration();
      
      // Return early to avoid other updates this frame
      return;
    }
    
    // Call floor cleanup every 20 frames (frequent checks for stuck birds)
    if (this.frameCount % 20 === 0) {
      this.floorStuckCleanup();
    }
    
    // Log every 100 frames for monitoring
    if (this.frameCount % 100 === 0) {
      console.log(`[Frame ${this.frameCount}] ${aliveCount} birds alive, ${this.agents.length - aliveCount} birds dead`);
      
      // Extra boundary check every 100 frames
      this.agents.forEach(agent => {
        if (agent.alive) {
          // Get canvas dimensions
          const canvas = this.gameCanvas.nativeElement;
          const minY = 50;
          const maxY = canvas.height - 70; // Match the new floor boundary
          
          if (agent.position.y < minY || agent.position.y > maxY) {
            console.log(`SAFETY CHECK: Bird ${agent.id} found outside boundaries at y=${agent.position.y}, killing it`);
            this.killAgent(agent.id);
          }
          
          // Additional check for birds near floor
          if (agent.position.y > maxY - 20 && agent.velocity >= 0) {
            console.log(`SAFETY CHECK: Bird ${agent.id} found too close to floor with downward velocity, killing it`);
            this.killAgent(agent.id);
          }
        }
      });
      
      // Check for stuck birds
      this.checkForStuckBirds();
    }
    
    // Spawn pipes
    this.pipeSpawnTimer += deltaTime;
    if (this.pipeSpawnTimer >= this.gameConfig.pipeSpawnRate) {
      this.pipeSpawnTimer = 0;
      this.spawnPipe();
    }
    
    // Update pipes
    this.updatePipes();
    
    // Update agents (birds)
    this.updateAgents();
    
    // Force refresh stats and visualizations every frame to ensure they stay updated
    this.updateVisualizationsAndStats();
  }
  
  private spawnPipe(): void {
    const minTopHeight = 50;
    const maxCanvas = this.gameCanvas.nativeElement.height;
    
    // Ensure we have a valid canvas height before proceeding
    if (!maxCanvas || maxCanvas < 200) {
      console.warn('Canvas height is invalid, delaying pipe spawn');
      return;
    }
    
    // Calculate maximum top height with better constraints
    // This ensures the gap is always properly sized and within valid canvas area
    const maxTopHeight = Math.min(
      (maxCanvas * 0.7) - this.gameConfig.pipeGap - minTopHeight,
      maxCanvas - this.gameConfig.pipeGap - 50 // absolute ceiling
    );
    
    // Ensure we're not trying to generate invalid pipes
    if (maxTopHeight <= minTopHeight) {
      console.warn('Invalid pipe dimensions, using fallback values');
      // Use fallback values that are known to work
      this.pipes.push({
        x: this.gameCanvas.nativeElement.width,
        topHeight: minTopHeight + 50,
        passed: false
      });
      return;
    }
    
    // Generate random top height within valid bounds
    const topHeight = Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) + minTopHeight;
    
    // Validate that the bottom pipe will be visible
    const bottomPipeStart = topHeight + this.gameConfig.pipeGap;
    const bottomPipeVisible = bottomPipeStart < maxCanvas - 50;
    
    if (!bottomPipeVisible) {
      console.warn('Generated pipe would place bottom pipe off-screen, adjusting');
      // Adjust top height to ensure bottom pipe is visible
      const adjustedTopHeight = maxCanvas - this.gameConfig.pipeGap - 50;
      this.pipes.push({
        x: this.gameCanvas.nativeElement.width,
        topHeight: adjustedTopHeight,
        passed: false
      });
      return;
    }
    
    // All checks passed, add normal pipe
    this.pipes.push({
      x: this.gameCanvas.nativeElement.width,
      topHeight,
      passed: false
    });
    
    console.log(`Spawned pipe with top height: ${topHeight}, canvas height: ${maxCanvas}`);
  }
  
  private updatePipes(): void {
    // Move pipes
    this.pipes.forEach(pipe => {
      pipe.x -= this.gameConfig.pipeSpeed * this.gameConfig.gameSpeed;
    });
    
    // Remove pipes that are off screen
    this.pipes = this.pipes.filter(pipe => pipe.x > -this.gameConfig.pipeWidth);
    
    // Update next pipe index for agent inputs
    this.updateNextPipeIndex();
  }
  
  private updateNextPipeIndex(): void {
    // Find the first pipe that hasn't been passed
    const nextPipe = this.pipes.find(pipe => 
      pipe.x + this.gameConfig.pipeWidth > this.gameConfig.birdPosition.x && 
      !pipe.passed
    );
    
    if (nextPipe) {
      this.nextPipeIndex = this.pipes.indexOf(nextPipe);
    } else {
      this.nextPipeIndex = -1;
    }
  }
  
  private updateAgents(): void {
    this.agents.forEach(agent => {
      if (!agent.alive) return;
      
      // Get canvas dimensions
      const canvas = this.gameCanvas.nativeElement;
      
      // Define strict boundaries with wider floor buffer (70px instead of 50px)
      const minY = 50; // Minimum allowed Y position (ceiling + buffer)
      const maxY = canvas.height - 70; // Increased floor buffer for safety
      
      // ENFORCE POSITION: Force bird to stay in valid range before any checks
      if (agent.position.y < minY) {
        // If bird is above ceiling, kill it immediately
        console.log(`Bird ${agent.id} hit ceiling boundary: y=${agent.position.y}`);
        this.killAgent(agent.id);
        return;
      }
      
      if (agent.position.y > maxY) {
        // If bird is below floor, kill it immediately
        console.log(`Bird ${agent.id} hit floor boundary: y=${agent.position.y}, canvas height: ${canvas.height}`);
        this.killAgent(agent.id);
        return;
      }
      
      // Special handling for birds close to the floor
      if (agent.position.y > maxY - 20) {
        // Bird is dangerously close to floor
        if (agent.velocity > 0) {
          // Bird is moving downward and close to floor - force kill to prevent getting stuck
          console.log(`Bird ${agent.id} is near floor and moving downward - preventative kill`);
          this.killAgent(agent.id);
          return;
        }
      }
      
      // Check pipe collision BEFORE movement
      for (const pipe of this.pipes) {
        // Simple rectangular collision check
        const birdRect: CollisionRect = {
          left: agent.position.x - this.gameConfig.birdSize/2,
          right: agent.position.x + this.gameConfig.birdSize/2,
          top: agent.position.y - this.gameConfig.birdSize/2,
          bottom: agent.position.y + this.gameConfig.birdSize/2
        };
        
        const topPipeRect: CollisionRect = {
          left: pipe.x,
          right: pipe.x + this.gameConfig.pipeWidth,
          top: 0,
          bottom: pipe.topHeight
        };
        
        const bottomPipeRect: CollisionRect = {
          left: pipe.x,
          right: pipe.x + this.gameConfig.pipeWidth,
          top: pipe.topHeight + this.gameConfig.pipeGap,
          bottom: canvas.height
        };
        
        // Check collision with top pipe
        if (this.isColliding(birdRect, topPipeRect)) {
          console.log(`Bird ${agent.id} collided with top pipe`);
          this.killAgent(agent.id);
          return;
        }
        
        // Check collision with bottom pipe
        if (this.isColliding(birdRect, bottomPipeRect)) {
          console.log(`Bird ${agent.id} collided with bottom pipe`);
          this.killAgent(agent.id);
          return;
        }
      }
      
      // Calculate new position
      const oldY = agent.position.y;
      agent.velocity += this.gameConfig.gravity;
      
      // CRITICAL: Hard cap velocity to prevent teleporting - lower max downward velocity
      agent.velocity = Math.max(-8, Math.min(6, agent.velocity)); // Reduced downward cap to 6
      
      // Apply velocity to position
      agent.position.y += agent.velocity;
      
      // CRITICAL: Hard enforce position boundaries
      if (agent.position.y < minY) {
        // Don't let the bird go above ceiling - kill it
        console.log(`Bird ${agent.id} attempted to go beyond ceiling: y=${agent.position.y}`);
        this.killAgent(agent.id);
        return;
      }
      
      if (agent.position.y > maxY) {
        // Don't let the bird go below floor - kill it
        console.log(`Bird ${agent.id} attempted to go beyond floor: y=${agent.position.y}, max: ${maxY}`);
        this.killAgent(agent.id);
        return;
      }
      
      // Additional check after movement - if bird is close to floor and moving down, kill it
      if (agent.position.y > maxY - 15 && agent.velocity > 0) {
        console.log(`Bird ${agent.id} is too close to floor with downward velocity - preventative kill`);
        this.killAgent(agent.id);
        return;
      }
      
      // Check pipe collision AFTER movement
      for (const pipe of this.pipes) {
        // Simple rectangular collision check
        const birdRect: CollisionRect = {
          left: agent.position.x - this.gameConfig.birdSize/2,
          right: agent.position.x + this.gameConfig.birdSize/2,
          top: agent.position.y - this.gameConfig.birdSize/2,
          bottom: agent.position.y + this.gameConfig.birdSize/2
        };
        
        const topPipeRect: CollisionRect = {
          left: pipe.x,
          right: pipe.x + this.gameConfig.pipeWidth,
          top: 0,
          bottom: pipe.topHeight
        };
        
        const bottomPipeRect: CollisionRect = {
          left: pipe.x,
          right: pipe.x + this.gameConfig.pipeWidth,
          top: pipe.topHeight + this.gameConfig.pipeGap,
          bottom: canvas.height
        };
        
        // Check collision with top pipe
        if (this.isColliding(birdRect, topPipeRect)) {
          console.log(`Bird ${agent.id} collided with top pipe after moving`);
        this.killAgent(agent.id);
        return;
      }
      
        // Check collision with bottom pipe
        if (this.isColliding(birdRect, bottomPipeRect)) {
          console.log(`Bird ${agent.id} collided with bottom pipe after moving`);
          this.killAgent(agent.id);
          return;
        }
        
        // Update score if bird passed the pipe
        if (!pipe.passed && agent.position.x > pipe.x + this.gameConfig.pipeWidth) {
          pipe.passed = true;
          agent.score += 1;
        }
      }
      
      // Make decision for next frame
      this.makeAgentDecision(agent);
      
      // Update in AI service
      this.aiService.updateAgent(agent.id, agent.position, agent.velocity, agent.score);
    });
  }
  
  // Ultra simple collision check
  private checkForStuckBirds(): void {
    const stuckThreshold = 100; // Consider a bird stuck if it has same Y position for this many frames
    const floorStuckThreshold = 30; // Lower threshold for birds near floor (more aggressive)
    
    this.agents.forEach(agent => {
      if (!agent.alive) return;
      
      // Store bird's current position in history if not already tracking
      if (!agent.positionHistory) {
        agent.positionHistory = [];
      }
      
      // Add current position to history
      agent.positionHistory.push(agent.position.y);
      
      // Keep only the last N positions
      if (agent.positionHistory.length > stuckThreshold) {
        agent.positionHistory.shift();
      }
      
      // Get canvas dimensions for floor check
      const canvas = this.gameCanvas.nativeElement;
      const maxY = canvas.height - 70; // Floor boundary
      
      // If we have enough history, check if bird is stuck
      if (agent.positionHistory.length >= 5) { // Only need 5 frames to check
        // Safe access with null check
        const firstPosition = agent.positionHistory[0];
        if (firstPosition !== undefined) {
          // Check if all positions are the same
          const allSamePosition = agent.positionHistory.every(y => y === firstPosition);
          
          if (allSamePosition) {
            // If the bird is stuck AND near the floor, kill it immediately
            if (agent.position.y > maxY - 50) {
              console.log(`Found stuck bird near floor with id ${agent.id} at position y=${agent.position.y}`);
              this.killAgent(agent.id);
              return;
            }
            
            // For other stuck birds, use the normal threshold
            if (agent.positionHistory.length >= stuckThreshold) {
              console.log(`Found stuck bird with id ${agent.id} at position y=${agent.position.y}`);
              this.killAgent(agent.id);
            }
          }
        }
      }
      
      // Special case: if bird is near floor and hasn't moved much, kill it
      if (agent.positionHistory.length >= floorStuckThreshold && agent.position.y > maxY - 50) {
        // Check if y positions have small variation (stuck on floor but with tiny movement)
        const maxVariation = Math.max(...agent.positionHistory) - Math.min(...agent.positionHistory);
        if (maxVariation < 5) { // Just 5 pixels of movement
          console.log(`Found floor-stuck bird with small movement: ${agent.id} at position y=${agent.position.y}`);
          this.killAgent(agent.id);
        }
      }
    });
  }
  
  private makeAgentDecision(agent: BirdAgent): void {
    // Prepare inputs for the neural network
    const inputs = this.prepareAgentInputs(agent);
    
    // Get decision from AI service
    const shouldJump = this.aiService.makeDecision(agent.id, inputs);
    
    // Apply jump if decided, but with safety check to prevent jumping too high
    if (shouldJump) {
      // Check if this jump would take the bird too close to the ceiling
      const canvas = this.gameCanvas.nativeElement;
      const minY = 50; // Minimum safe Y position
      const predictedPos = agent.position.y + this.gameConfig.jumpForce; // Estimate where jump would end up
      
      if (predictedPos < minY + 20) {
        // If jump would put bird too close to ceiling, don't jump
        console.log(`Bird ${agent.id} prevented from jumping too close to ceiling`);
      } else {
        // Safe to jump
      agent.velocity = this.gameConfig.jumpForce;
      }
    }
  }
  
  private prepareAgentInputs(agent: BirdAgent): number[] {
    // Default inputs if no pipes
    if (this.nextPipeIndex === -1 || this.pipes.length === 0) {
      return [
        agent.position.y / this.gameCanvas.nativeElement.height, 
        agent.velocity / 10,
        1.0, // Max distance
        0.5, // Default top height
        0.5  // Default gap
      ];
    }
    
    const nextPipe = this.pipes[this.nextPipeIndex];
    
    // Calculate normalized inputs
    const normalizedY = agent.position.y / this.gameCanvas.nativeElement.height;
    const normalizedVelocity = agent.velocity / 10;
    const normalizedDistance = (nextPipe.x - agent.position.x) / this.gameCanvas.nativeElement.width;
    const normalizedTopHeight = nextPipe.topHeight / this.gameCanvas.nativeElement.height;
    const normalizedGap = this.gameConfig.pipeGap / this.gameCanvas.nativeElement.height;
    
    return [
      normalizedY,
      normalizedVelocity,
      normalizedDistance,
      normalizedTopHeight,
      normalizedGap
    ];
  }
  
  private killAgent(agentId: number): void {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent || !agent.alive) return; // Already dead
    
    console.log(`Killing agent ${agentId} - Total alive: ${this.agents.filter(a => a.alive).length - 1}`);
    
    // CRITICAL: Force-reset the bird's position out of view to ensure it's not visible if it gets stuck
    agent.position.y = -1000;
    agent.velocity = 0;
    
    // Mark as dead
    agent.alive = false;
    
    // Notify the AI service
    this.aiService.killAgent(agentId);
  }
  
  private updateSelectedAgentBrain(): void {
    // If selected agent is dead, select the first alive one
    if (this.agents.length > 0) {
      const selectedAgent = this.agents.find(a => a.id === this.selectedAgentId);
      
      if (!selectedAgent || !selectedAgent.alive) {
        const aliveAgent = this.agents.find(a => a.alive);
        if (aliveAgent) {
          this.selectedAgentId = aliveAgent.id;
        } else {
          // If all agents are dead, just select the first one
          this.selectedAgentId = this.agents[0].id;
        }
      }
      
      // Get brain visualization data
      this.selectedAgentBrain = this.aiService.getAgentBrainVisualization(this.selectedAgentId);
    }
  }
  
  private render(): void {
    const canvas = this.gameCanvas.nativeElement;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    this.assetService.renderBackground(this.ctx, canvas.width, canvas.height);
    
    // Draw the ceiling and floor boundaries
    this.renderBoundaries();
    
    // Draw pipes
    this.renderPipes();
    
    // Draw base
    this.assetService.renderBase(this.ctx, canvas.width, canvas.height);
    
    // Draw agents
    this.renderAgents();
  }
  
  private renderBoundaries(): void {
    const ceilingY = this.gameConfig.birdSize * 0.75;
    const floorY = this.gameCanvas.nativeElement.height - 30;
    const width = this.gameCanvas.nativeElement.width;
    
    // Draw ceiling boundary with stronger color
    this.ctx.beginPath();
    this.ctx.moveTo(0, ceilingY);
    this.ctx.lineTo(width, ceilingY);
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Draw floor boundary with stronger color
    this.ctx.beginPath();
    this.ctx.moveTo(0, floorY);
    this.ctx.lineTo(width, floorY);
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }
  
  private renderPipes(): void {
    this.pipes.forEach(pipe => {
      // Render the pipe using the asset service
      this.assetService.renderPipe(
        this.ctx,
        pipe.x,
        pipe.topHeight,
        pipe.topHeight + this.gameConfig.pipeGap,
        this.gameConfig.pipeWidth,
        this.gameCanvas.nativeElement.height
      );
      
      // Draw hitboxes for the next pipe for debugging (the one birds are currently navigating)
      if (this.nextPipeIndex !== -1 && this.nextPipeIndex < this.pipes.length) {
        const nextPipe = this.pipes[this.nextPipeIndex];
        if (pipe === nextPipe && this.frameCount % 30 < 15) { // Blink effect
          // Draw top pipe hitbox
          this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(
            pipe.x,
            0,
            this.gameConfig.pipeWidth,
            pipe.topHeight
          );
          
          // Draw bottom pipe hitbox
          this.ctx.strokeRect(
            pipe.x,
            pipe.topHeight + this.gameConfig.pipeGap,
            this.gameConfig.pipeWidth,
            this.gameCanvas.nativeElement.height - (pipe.topHeight + this.gameConfig.pipeGap)
          );
        }
      }
    });
  }
  
  private renderAgents(): void {
    // Count alive agents for transparency
    const aliveCount = this.agents.filter(a => a.alive).length;
    const opacityStep = 0.8 / Math.max(aliveCount, 1);
    
    // Draw dead agents first with low opacity
    this.agents
      .filter(agent => !agent.alive)
      .forEach(agent => {
        this.ctx.globalAlpha = 0.1;
        this.renderAgent(agent);
      });
    
    // Draw alive agents with varying opacity
    this.agents
      .filter(agent => agent.alive)
      .forEach((agent, index) => {
        // Higher opacity for the selected agent
        this.ctx.globalAlpha = agent.id === this.selectedAgentId 
          ? 1.0 
          : 0.2 + (opacityStep * index);
        
        this.renderAgent(agent);
      });
    
    // Reset opacity
    this.ctx.globalAlpha = 1.0;
  }
  
  private renderAgent(agent: BirdAgent): void {
    // Create a mock rotation based on velocity
    const rotation = Math.max(-0.5, Math.min(Math.PI / 4, agent.velocity * 0.04));
    
    // Special highlight for the selected agent
    const isSelected = agent.id === this.selectedAgentId;
    if (isSelected) {
      // Draw a highlight circle around selected bird
      this.ctx.beginPath();
      this.ctx.arc(
        agent.position.x, 
        agent.position.y, 
        this.gameConfig.birdSize * 0.8, 
        0, 
        Math.PI * 2
      );
      this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    // Render bird with the asset service
    this.assetService.renderBird(
      this.ctx,
      agent.position.x,
      agent.position.y,
      rotation,
      this.gameConfig.birdSize
    );
    
    // Draw hitbox for debugging if it's the selected agent
    if (isSelected && this.frameCount % 30 < 15) { // Blink effect
      const birdRadius = this.gameConfig.birdSize / 2 * 0.9; // Same as collision detection
      this.ctx.beginPath();
      this.ctx.arc(
        agent.position.x, 
        agent.position.y, 
        birdRadius, 
        0, 
        Math.PI * 2
      );
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
    
    // Draw score above the bird if it's the selected one
    if (agent.id === this.selectedAgentId) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `Score: ${agent.score}`, 
        agent.position.x, 
        agent.position.y - 25
      );
      
      // Show jump status
      const recentDecisions = agent.decisions.slice(-10);
      const jumpedRecently = recentDecisions.length > 0 && recentDecisions[recentDecisions.length - 1];
      
      if (jumpedRecently) {
        this.ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(
          agent.position.x, 
          agent.position.y - 15, 
          5, 
          0, 
          Math.PI * 2
        );
        this.ctx.fill();
      }
    }
  }
  
  // UI Control Methods
  togglePause(): void {
    this.isPaused = !this.isPaused;
  }
  
  resetTraining(): void {
    // Reset AI
    this.aiService.reset();
    
    // Reset game state
    this.agents = this.aiService.getAgents();
    this.pipes = [];
    this.pipeSpawnTimer = 0;
    this.frameCount = 0;
    
    // Update selected agent
    if (this.agents.length > 0) {
      this.selectedAgentId = this.agents[0].id;
      this.updateSelectedAgentBrain();
    }
  }
  
  exitAIMode(): void {
    // Navigate back to main menu by removing the mode parameter
    window.location.href = window.location.pathname;
  }
  
  forceKillAllBirds(): void {
    console.log("EMERGENCY: Force killing all birds");
    
    // Kill all birds
    this.agents.forEach(agent => {
      if (agent.alive) {
        this.killAgent(agent.id);
      }
    });
    
    // Create a new set of pipes to avoid any stuck pipes
    this.pipes = [];
    
    // Reset pipe spawn timer
    this.pipeSpawnTimer = 0;
  }
  
  // Fix the isColliding method with proper type definitions
  private isColliding(rect1: CollisionRect, rect2: CollisionRect): boolean {
    return rect1.left < rect2.right && 
           rect1.right > rect2.left && 
           rect1.top < rect2.bottom && 
           rect1.bottom > rect2.top;
  }
  
  // Add this method to perform a thorough floor check
  private floorStuckCleanup(): void {
    // Get absolute floor position (the visible floor in the game)
    const canvas = this.gameCanvas.nativeElement;
    const absoluteFloorY = canvas.height - 30; // The actual visible floor position
    
    // Find all living birds
    const livingBirds = this.agents.filter(agent => agent.alive);
    
    // Check each living bird's position
    livingBirds.forEach(agent => {
      // If bird is visibly on or below the floor
      if (agent.position.y >= absoluteFloorY) {
        console.log(`ABSOLUTE FLOOR CHECK: Bird ${agent.id} is on the floor at y=${agent.position.y}, killing it`);
        this.killAgent(agent.id);
      }
      
      // If bird is very close to the floor and hasn't moved vertically
      if (agent.position.y >= absoluteFloorY - 20) {
        // Check if this agent has a velocity history
        if (!agent.velocityHistory) {
          agent.velocityHistory = [];
        }
        
        // Add current velocity to history
        agent.velocityHistory.push(agent.velocity);
        
        // Keep history at manageable size
        if (agent.velocityHistory.length > 10) {
          agent.velocityHistory.shift();
        }
        
        // If we have enough history and bird seems stuck (not moving up)
        if (agent.velocityHistory.length >= 5) {
          // Check if bird is not moving upward consistently
          const isMovingUp = agent.velocityHistory.some(v => v < -1);
          
          if (!isMovingUp) {
            console.log(`VELOCITY CHECK: Bird ${agent.id} near floor with no upward movement, killing it`);
            this.killAgent(agent.id);
          }
        }
      }
    });
  }
  
  // Add a method to force the next generation
  public forceNextGeneration(): void {
    console.log("Forcing next generation of birds");
    
    // Reset pipes
    this.pipes = [];
    this.pipeSpawnTimer = 0;
    
    // Reset pipe index
    this.nextPipeIndex = -1;
    
    // Force AI service to create next generation
    this.aiService.forceEvolution();
    
    // Get the new agents
    this.agents = this.aiService.getAgents();
    
    // Reset selected agent
    if (this.agents.length > 0) {
      this.selectedAgentId = this.agents[0].id;
      this.updateSelectedAgentBrain();
    }
  }
  
  // Add a dedicated method to refresh visualizations and stats
  private updateVisualizationsAndStats(): void {
    // Ensure we have the latest stats
    this.aiStats = this.aiService.getLatestStats();
    
    // Update the selected agent brain visualization
    this.updateSelectedAgentBrain();
  }
  
  // Toggle visibility of neural network on mobile
  toggleMobileNetwork(): void {
    this.hideMobileNetwork = !this.hideMobileNetwork;
  }
} 