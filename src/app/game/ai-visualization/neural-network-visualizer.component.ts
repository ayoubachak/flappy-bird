import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NetworkNode {
  id: number;
  type: 'input' | 'hidden' | 'output';
  layer: number;
  index: number;
  activation?: string;
  bias?: number;
}

interface NetworkConnection {
  from: number;
  to: number;
  weight: number;
}

@Component({
  selector: 'app-neural-network-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="network-visualizer-container">
      <h3>Neural Network Visualization</h3>
      <div class="canvas-container">
        <canvas #networkCanvas class="network-canvas"></canvas>
      </div>
      <div class="network-legend">
        <div class="legend-item">
          <div class="legend-color input-node"></div>
          <span>Input Node</span>
        </div>
        <div class="legend-item">
          <div class="legend-color hidden-node"></div>
          <span>Hidden Node</span>
        </div>
        <div class="legend-item">
          <div class="legend-color output-node"></div>
          <span>Output Node</span>
        </div>
        <div class="legend-item">
          <div class="legend-color positive-weight"></div>
          <span>Positive Weight</span>
        </div>
        <div class="legend-item">
          <div class="legend-color negative-weight"></div>
          <span>Negative Weight</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .network-visualizer-container {
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
    
    h3 {
      margin-top: 0;
      text-align: center;
      margin-bottom: 10px;
    }
    
    .canvas-container {
      flex: 1;
      position: relative;
    }
    
    .network-canvas {
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 5px;
    }
    
    .network-legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 15px;
      margin-top: 10px;
      padding: 5px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
    }
    
    .legend-color {
      width: 15px;
      height: 15px;
      border-radius: 50%;
    }
    
    .input-node {
      background-color: #4CAF50;
    }
    
    .hidden-node {
      background-color: #2196F3;
    }
    
    .output-node {
      background-color: #F44336;
    }
    
    .positive-weight {
      background-color: #8BC34A;
    }
    
    .negative-weight {
      background-color: #FF5722;
    }
  `]
})
export class NeuralNetworkVisualizerComponent implements OnInit, OnChanges {
  @ViewChild('networkCanvas', { static: true }) networkCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() network: any = null;
  
  private ctx!: CanvasRenderingContext2D;
  private nodes: NetworkNode[] = [];
  private connections: NetworkConnection[] = [];
  private layerCounts: number[] = [];
  private layers: number = 0;
  
  constructor() { }
  
  ngOnInit(): void {
    const canvas = this.networkCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['network'] && this.network) {
      this.parseNetwork();
      this.drawNetwork();
    }
  }
  
  private resizeCanvas(): void {
    const canvas = this.networkCanvas.nativeElement;
    const container = canvas.parentElement;
    
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.drawNetwork();
    }
  }
  
  private parseNetwork(): void {
    if (!this.network) return;
    
    this.nodes = [];
    this.connections = [];
    this.layerCounts = [];
    
    // Get neurons from the network, or use an empty array if not available
    const neurons = Array.isArray(this.network.neurons) ? this.network.neurons : [];
    
    if (neurons.length === 0) {
      // Create a simple default network visualization if no neurons are provided
      this.createDefaultNetworkStructure();
      return;
    }
    
    // Simpler approach to categorize nodes by layer
    // Assume at most 3 layers (input, hidden, output)
    const nodesByLayer: { [key: number]: number[] } = { 0: [], 1: [], 2: [] };
    
    // First pass: identify input and output nodes
    neurons.forEach((neuron: any, index: number) => {
      // Simple heuristic for layer assignment
      if (neuron.type === 'input') {
        nodesByLayer[0].push(index);
      } else if (neuron.type === 'output') {
        nodesByLayer[2].push(index);
      } else {
        nodesByLayer[1].push(index);
      }
    });
    
    // If we don't have explicit types, use a simpler approach
    if (nodesByLayer[0].length === 0 && nodesByLayer[2].length === 0) {
      // Just divide neurons into 3 equal parts as a fallback
      const inputCount = Math.ceil(neurons.length / 3);
      const outputCount = Math.ceil(neurons.length / 3);
      const hiddenCount = neurons.length - inputCount - outputCount;
      
      nodesByLayer[0] = Array.from({ length: inputCount }, (_, i) => i);
      nodesByLayer[1] = Array.from({ length: hiddenCount }, (_, i) => i + inputCount);
      nodesByLayer[2] = Array.from({ length: outputCount }, (_, i) => i + inputCount + hiddenCount);
    }
    
    // Calculate total layers (at most 3)
    this.layers = Object.keys(nodesByLayer).filter(key => nodesByLayer[parseInt(key)].length > 0).length;
    
    // Create nodes with proper positioning
    Object.entries(nodesByLayer).forEach(([layerStr, nodeIds]) => {
      const layer = parseInt(layerStr);
      this.layerCounts[layer] = nodeIds.length;
      
      nodeIds.forEach((nodeId, indexInLayer) => {
        const neuron = neurons[nodeId] || { bias: 0 };
        const type = this.determineNodeType(layer, 3);
        
        this.nodes.push({
          id: nodeId,
          type,
          layer,
          index: indexInLayer,
          activation: neuron.squash?.name || 'LOGISTIC',
          bias: neuron.bias || 0
        });
      });
    });
    
    // Parse connections - simplify to handle various formats
    const connections = Array.isArray(this.network.connections) ? this.network.connections : [];
    
    connections.forEach((conn: any) => {
      if (conn && conn.from !== undefined && conn.to !== undefined) {
        this.connections.push({
          from: conn.from,
          to: conn.to,
          weight: conn.weight || 0.5 // Default weight if not provided
        });
      }
    });
    
    // If no connections were found, create some basic ones
    if (this.connections.length === 0 && this.nodes.length > 1) {
      this.createDefaultConnections();
    }
  }
  
  private createDefaultNetworkStructure(): void {
    // Create a simple 3-layer network (5 inputs, 3 hidden, 1 output)
    const inputCount = 5;
    const hiddenCount = 3;
    const outputCount = 1;
    
    this.layers = 3;
    this.layerCounts = [inputCount, hiddenCount, outputCount];
    
    // Create input nodes
    for (let i = 0; i < inputCount; i++) {
      this.nodes.push({
        id: i,
        type: 'input',
        layer: 0,
        index: i,
        bias: 0
      });
    }
    
    // Create hidden nodes
    for (let i = 0; i < hiddenCount; i++) {
      this.nodes.push({
        id: inputCount + i,
        type: 'hidden',
        layer: 1,
        index: i,
        bias: 0
      });
    }
    
    // Create output nodes
    for (let i = 0; i < outputCount; i++) {
      this.nodes.push({
        id: inputCount + hiddenCount + i,
        type: 'output',
        layer: 2,
        index: i,
        bias: 0
      });
    }
    
    this.createDefaultConnections();
  }
  
  private createDefaultConnections(): void {
    // Create simple connections between layers
    const inputNodes = this.nodes.filter(n => n.type === 'input');
    const hiddenNodes = this.nodes.filter(n => n.type === 'hidden');
    const outputNodes = this.nodes.filter(n => n.type === 'output');
    
    // Connect inputs to hidden layers
    inputNodes.forEach(input => {
      hiddenNodes.forEach(hidden => {
        this.connections.push({
          from: input.id,
          to: hidden.id,
          weight: Math.random() * 2 - 1 // Random weight between -1 and 1
        });
      });
    });
    
    // Connect hidden to outputs
    hiddenNodes.forEach(hidden => {
      outputNodes.forEach(output => {
        this.connections.push({
          from: hidden.id,
          to: output.id,
          weight: Math.random() * 2 - 1 // Random weight between -1 and 1
        });
      });
    });
  }
  
  private drawNetwork(): void {
    if (!this.ctx || this.nodes.length === 0) return;
    
    const canvas = this.networkCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate node positions
    const nodePositions = this.calculateNodePositions();
    
    // Draw connections first (behind nodes)
    this.drawConnections(nodePositions);
    
    // Draw nodes
    this.drawNodes(nodePositions);
  }
  
  private calculateNodePositions(): Map<number, { x: number, y: number }> {
    const positions = new Map<number, { x: number, y: number }>();
    const canvas = this.networkCanvas.nativeElement;
    
    // Padding
    const padding = 50;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Calculate layer width (horizontal distance between layers)
    const layerWidth = this.layers > 1 ? width / (this.layers - 1) : width;
    
    // Position all nodes
    this.nodes.forEach(node => {
      // Calculate x position based on layer
      const x = padding + (node.layer * layerWidth);
      
      // Calculate y position based on index in layer
      const nodesInLayer = this.layerCounts[node.layer] || 1;
      const layerHeight = nodesInLayer > 1 ? height / (nodesInLayer - 1) : height;
      const y = padding + (node.index * layerHeight);
      
      positions.set(node.id, { x, y });
    });
    
    return positions;
  }
  
  private drawNodes(positions: Map<number, { x: number, y: number }>): void {
    this.nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;
      
      // Draw node
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      
      // Color based on type
      if (node.type === 'input') {
        this.ctx.fillStyle = '#4CAF50';
      } else if (node.type === 'output') {
        this.ctx.fillStyle = '#F44336';
      } else {
        this.ctx.fillStyle = '#2196F3';
      }
      
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw bias indicator (size of circle inside the node)
      if (node.bias) {
        const biasRadius = Math.min(10, Math.max(5, Math.abs(node.bias) * 5));
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, biasRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = node.bias > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
        this.ctx.fill();
      }
    });
  }
  
  private drawConnections(positions: Map<number, { x: number, y: number }>): void {
    this.connections.forEach(conn => {
      const fromPos = positions.get(conn.from);
      const toPos = positions.get(conn.to);
      
      if (!fromPos || !toPos) return;
      
      // Draw connection line
      this.ctx.beginPath();
      this.ctx.moveTo(fromPos.x, fromPos.y);
      this.ctx.lineTo(toPos.x, toPos.y);
      
      // Line width based on weight strength
      const weightStrength = Math.min(5, Math.max(1, Math.abs(conn.weight) * 3));
      this.ctx.lineWidth = weightStrength;
      
      // Line color based on weight sign
      if (conn.weight > 0) {
        this.ctx.strokeStyle = '#8BC34A'; // Green for positive weights
      } else {
        this.ctx.strokeStyle = '#FF5722'; // Red for negative weights
      }
      
      this.ctx.stroke();
      this.ctx.lineWidth = 1;
    });
  }
  
  private determineNodeType(layer: number, totalLayers: number): 'input' | 'hidden' | 'output' {
    if (layer === 0) return 'input';
    if (layer === totalLayers - 1) return 'output';
    return 'hidden';
  }
} 