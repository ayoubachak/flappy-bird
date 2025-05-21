import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Define the Bird AI agent structure
export interface BirdAgent {
  id: number;
  brain: any; // Neural network
  fitness: number;
  score: number;
  alive: boolean;
  decisions: boolean[]; // History of decisions (jump or not)
  position: { x: number, y: number };
  velocity: number;
  positionHistory?: number[]; // Track positions to detect stuck birds
  velocityHistory?: number[]; // Track velocity to detect birds not moving upward
}

// Define the AI learning statistics
export interface AIStats {
  generation: number;
  maxFitness: number;
  averageFitness: number;
  bestScore: number;
  population: number;
  aliveCount: number;
}

/**
 * Simplified neural network for bird AI
 * This avoids direct dependency on neataptic's API while maintaining core functionality
 */
class SimpleNeuralNetwork {
  weights: number[] = [];
  
  constructor(inputSize: number, outputSize: number) {
    // Initialize with random weights
    const totalWeights = inputSize * outputSize;
    for (let i = 0; i < totalWeights; i++) {
      this.weights.push(Math.random() * 2 - 1); // Between -1 and 1
    }
  }
  
  activate(inputs: number[]): number[] {
    // Simple feedforward calculation
    const output = 0;
    
    // Sum of weighted inputs (dot product)
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    
    // Apply sigmoid activation
    const sigmoid = 1 / (1 + Math.exp(-sum));
    
    return [sigmoid];
  }
  
  // Simple mutation for evolution
  mutate(rate: number): void {
    this.weights = this.weights.map(weight => {
      if (Math.random() < rate) {
        return weight + (Math.random() * 0.4 - 0.2); // Small random adjustment
      }
      return weight;
    });
  }
  
  // Create a copy with possible mutations
  clone(mutationRate: number): SimpleNeuralNetwork {
    const clone = new SimpleNeuralNetwork(0, 0); // Size doesn't matter as we'll replace weights
    clone.weights = [...this.weights];
    clone.mutate(mutationRate);
    return clone;
  }
  
  // Crossover with another network
  crossover(partner: SimpleNeuralNetwork): SimpleNeuralNetwork {
    const child = new SimpleNeuralNetwork(0, 0);
    child.weights = this.weights.map((weight, i) => {
      // 50% chance to inherit from each parent
      return Math.random() < 0.5 ? weight : partner.weights[i];
    });
    return child;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private readonly INPUT_NODES = 5; // Bird y, bird velocity, distance to next pipe, pipe height, pipe gap
  private readonly OUTPUT_NODES = 1; // Jump or not
  private readonly POPULATION_SIZE = 50; // Number of birds in each generation
  private readonly MUTATION_RATE = 0.3; // Probability of weight mutation
  
  private agents: BirdAgent[] = [];
  private generation = 0;
  private bestAgent: BirdAgent | null = null;
  
  private aiStatsSubject = new BehaviorSubject<AIStats>({
    generation: 0,
    maxFitness: 0,
    averageFitness: 0,
    bestScore: 0,
    population: this.POPULATION_SIZE,
    aliveCount: this.POPULATION_SIZE
  });
  
  aiStats$: Observable<AIStats> = this.aiStatsSubject.asObservable();
  
  constructor() {
    this.createInitialPopulation();
  }
  
  private createInitialPopulation(): void {
    this.agents = [];
    
    for (let i = 0; i < this.POPULATION_SIZE; i++) {
      // Always start birds exactly at center height for maximum safety
      // No randomness to ensure consistent behavior
      const agent: BirdAgent = {
        id: i,
        brain: new SimpleNeuralNetwork(this.INPUT_NODES, this.OUTPUT_NODES),
        fitness: 0,
        score: 0,
        alive: true,
        decisions: [],
        position: { x: 50, y: 200 }, // Fixed position exactly in middle
        velocity: 0 // Start with zero velocity
      };
      
      this.agents.push(agent);
    }
    
    this.updateStats();
  }
  
  // Get all agents for the game
  getAgents(): BirdAgent[] {
    return this.agents;
  }
  
  // Get the best-performing agent
  getBestAgent(): BirdAgent | null {
    return this.bestAgent;
  }
  
  // Make a decision for a specific agent
  makeDecision(agentId: number, inputs: number[]): boolean {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent || !agent.alive) return false;
    
    // Activate the neural network with inputs
    const output = agent.brain.activate(inputs);
    const shouldJump = output[0] > 0.5; // If output > 0.5, bird jumps
    
    // Record the decision
    agent.decisions.push(shouldJump);
    
    return shouldJump;
  }
  
  // Update agent status (position, score, etc.)
  updateAgent(agentId: number, position: { x: number, y: number }, velocity: number, score: number): void {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    agent.position = position;
    agent.velocity = velocity;
    agent.score = score;
    
    // Improved fitness calculation
    // Base fitness is the score
    let fitness = score * 10; // Weight score heavily
    
    // Add bonus for each frame survived (encourages staying alive)
    fitness += agent.decisions.length * 0.1;
    
    // Slight penalty for excessive jumping (encourages efficiency)
    const jumpCount = agent.decisions.filter(d => d).length;
    fitness -= jumpCount * 0.05;
    
    // Bonus for staying in the middle vertical area of the screen
    const idealY = 200; // Middle of screen (approximately)
    const yDistance = Math.abs(position.y - idealY);
    const yBonus = Math.max(0, 1 - (yDistance / 200)); // 0-1 value, higher when close to ideal Y
    fitness += yBonus * 0.5;
    
    agent.fitness = Math.max(0, fitness); // Ensure fitness is never negative
  }
  
  // Mark an agent as dead
  killAgent(agentId: number): void {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    // Only update if agent was alive
    if (agent.alive) {
      agent.alive = false;
      this.updateStats();
      
      // Check if all agents are dead to evolve to the next generation
      const anyAlive = this.agents.some(a => a.alive);
      if (!anyAlive) {
        console.log("AI Service: All agents dead, evolving to next generation");
        this.evolve();
      }
    }
  }
  
  // Create next generation through evolution
  private evolve(): void {
    // Sort agents by fitness
    const sortedAgents = [...this.agents].sort((a, b) => b.fitness - a.fitness);
    
    // Store the best performer
    const bestAgent = sortedAgents[0];
    if (!this.bestAgent || bestAgent.fitness > this.bestAgent.fitness) {
      this.bestAgent = { ...bestAgent };
    }
    
    console.log(`Evolution complete - creating generation ${this.generation + 1}`);
    
    // Create new population
    const newAgents: BirdAgent[] = [];
    
    // Keep top performers (elitism)
    const eliteCount = Math.max(1, Math.floor(this.POPULATION_SIZE * 0.1));
    for (let i = 0; i < eliteCount; i++) {
      if (i < sortedAgents.length) {
        const elite = sortedAgents[i];
        
        newAgents.push({
          id: newAgents.length,
          brain: elite.brain, // Keep brain unchanged
          fitness: 0,
          score: 0,
          alive: true,
          decisions: [],
          position: { x: 50, y: 200 }, // Fixed position exactly in middle
          velocity: 0 // Start with zero velocity
        });
      }
    }
    
    // Fill the rest with offspring and mutations
    while (newAgents.length < this.POPULATION_SIZE) {
      // Tournament selection
      const parent1 = this.tournamentSelect(sortedAgents);
      const parent2 = this.tournamentSelect(sortedAgents);
      
      // Crossover
      let childBrain;
      if (Math.random() < 0.7) {
        // Crossover
        childBrain = parent1.brain.crossover(parent2.brain);
      } else {
        // Clone with mutation
        childBrain = parent1.brain.clone(this.MUTATION_RATE);
      }
      
      // Add to new population
      newAgents.push({
        id: newAgents.length,
        brain: childBrain,
        fitness: 0,
        score: 0,
        alive: true,
        decisions: [],
        position: { x: 50, y: 200 }, // Fixed position exactly in middle
        velocity: 0 // Start with zero velocity
      });
    }
    
    // Replace population
    this.agents = newAgents;
    this.generation++;
    this.updateStats();
  }
  
  // Tournament selection - randomly select individuals and pick the best
  private tournamentSelect(sortedAgents: BirdAgent[]): BirdAgent {
    const tournamentSize = 3;
    let best = sortedAgents[Math.floor(Math.random() * sortedAgents.length)];
    
    for (let i = 0; i < tournamentSize - 1; i++) {
      const contender = sortedAgents[Math.floor(Math.random() * sortedAgents.length)];
      if (contender.fitness > best.fitness) {
        best = contender;
      }
    }
    
    return best;
  }
  
  // Reset the AI to start from scratch
  reset(): void {
    this.generation = 0;
    this.bestAgent = null;
    this.createInitialPopulation();
  }
  
  // Update AI statistics
  private updateStats(): void {
    const aliveAgents = this.agents.filter(a => a.alive);
    const totalFitness = this.agents.reduce((sum, agent) => sum + agent.fitness, 0);
    const maxFitness = Math.max(...this.agents.map(a => a.fitness), 0);
    const bestScore = Math.max(...this.agents.map(a => a.score), 0);
    
    this.aiStatsSubject.next({
      generation: this.generation,
      maxFitness: maxFitness,
      averageFitness: totalFitness / this.POPULATION_SIZE,
      bestScore: bestScore,
      population: this.POPULATION_SIZE,
      aliveCount: aliveAgents.length
    });
  }
  
  // Get a specific agent's neural network structure for visualization
  getAgentBrainVisualization(agentId: number): any {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return null;
    
    // Create a visualization-friendly representation of the network
    const neurons = [];
    
    // Create input neurons
    for (let i = 0; i < this.INPUT_NODES; i++) {
      neurons.push({
        id: i,
        type: 'input',
        layer: 0,
        bias: 0
      });
    }
    
    // Create output neurons
    for (let i = 0; i < this.OUTPUT_NODES; i++) {
      neurons.push({
        id: this.INPUT_NODES + i,
        type: 'output',
        layer: 1,
        bias: 0
      });
    }
    
    // Create connections
    const connections = [];
    for (let i = 0; i < this.INPUT_NODES; i++) {
      for (let j = 0; j < this.OUTPUT_NODES; j++) {
        const weightIndex = i * this.OUTPUT_NODES + j;
        connections.push({
          from: i,
          to: this.INPUT_NODES + j,
          weight: agent.brain.weights[weightIndex] || 0
        });
      }
    }
    
    return {
      neurons,
      connections
    };
  }
  
  // Add a public method to force evolution
  public forceEvolution(): void {
    console.log("AI Service: Force evolving to next generation");
    
    // If there are any still-alive agents, kill them first
    this.agents.forEach(agent => {
      if (agent.alive) {
        agent.alive = false;
      }
    });
    
    // Trigger evolution to next generation
    this.evolve();
  }
  
  // Add a method to get the latest stats directly
  public getLatestStats(): AIStats {
    // Force an update of the stats before returning
    this.updateStats();
    
    // Return the current stats value
    return this.aiStatsSubject.getValue();
  }
} 