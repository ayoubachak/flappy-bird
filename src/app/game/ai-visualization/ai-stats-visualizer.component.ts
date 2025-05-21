import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIStats } from '../services/ai.service';

@Component({
  selector: 'app-ai-stats-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-stats-container">
      <h3>AI Training Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Generation</div>
          <div class="stat-value">{{ stats?.generation || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Population</div>
          <div class="stat-value">{{ stats?.aliveCount || 0 }} / {{ stats?.population || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Best Score</div>
          <div class="stat-value">{{ stats?.bestScore || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Max Fitness</div>
          <div class="stat-value">{{ stats?.maxFitness?.toFixed(2) || 0 }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Average Fitness</div>
          <div class="stat-value">{{ stats?.averageFitness?.toFixed(2) || 0 }}</div>
        </div>
      </div>
      
      <div class="fitness-history">
        <h4>Fitness History</h4>
        <div class="chart-container">
          <div class="chart-bar" 
               *ngFor="let fitness of fitnessHistory" 
               [style.height.%]="getBarHeight(fitness)">
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-stats-container {
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 15px;
      color: white;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    
    h3, h4 {
      margin-top: 0;
      text-align: center;
      margin-bottom: 10px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .stat-item {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      padding: 8px;
      text-align: center;
    }
    
    .stat-label {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 18px;
      font-weight: bold;
    }
    
    .fitness-history {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .chart-container {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 2px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      padding: 5px;
    }
    
    .chart-bar {
      flex: 1;
      background: linear-gradient(to top, #4CAF50, #2196F3);
      border-radius: 2px 2px 0 0;
      min-height: 1px;
    }
  `]
})
export class AIStatsVisualizerComponent implements OnInit, OnChanges {
  @Input() stats: AIStats | null = null;
  
  fitnessHistory: number[] = [];
  maxHistoryFitness = 0;
  
  constructor() { }
  
  ngOnInit(): void { }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stats'] && this.stats) {
      this.updateFitnessHistory();
    }
  }
  
  private updateFitnessHistory(): void {
    if (!this.stats) return;
    
    // Add the current max fitness to history
    this.fitnessHistory.push(this.stats.maxFitness);
    
    // Keep only the most recent 50 entries
    if (this.fitnessHistory.length > 50) {
      this.fitnessHistory = this.fitnessHistory.slice(-50);
    }
    
    // Update the max value for scaling
    this.maxHistoryFitness = Math.max(...this.fitnessHistory, 1);
  }
  
  getBarHeight(fitness: number): number {
    // Scale the bar height as a percentage of the max fitness
    return (fitness / this.maxHistoryFitness) * 100;
  }
} 