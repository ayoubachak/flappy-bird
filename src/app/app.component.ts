import { Component, OnInit } from '@angular/core';
import { GameComponent } from './game/game.component';
import { AITrainingComponent } from './game/ai-training/ai-training.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent, AITrainingComponent, CommonModule],
  template: `
    <div class="app-container">
      <app-game *ngIf="!isAIMode"></app-game>
      <app-ai-training *ngIf="isAIMode"></app-ai-training>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Flappy Bird';
  isAIMode = false;

  ngOnInit(): void {
    // Check URL parameter to determine if we should show AI mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    this.isAIMode = mode === 'ai-training';
  }
}
