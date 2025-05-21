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

// Add a new interface to define the neuron type
interface Neuron {
  id?: number;
  type?: string;
  squash?: { name?: string };
  bias?: number;
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
    
    // Identify network structure more clearly
    const inputNodes = neurons.filter((n: Neuron) => n.type === 'input');
    const outputNodes = neurons.filter((n: Neuron) => n.type === 'output');
    const hiddenNodes = neurons.filter((n: Neuron) => !n.type || (n.type !== 'input' && n.type !== 'output'));
    
    // Determine layers
    this.layers = inputNodes.length > 0 && outputNodes.length > 0 ? 
      (hiddenNodes.length > 0 ? 3 : 2) : 
      (neurons.length > 0 ? 1 : 0);
      
    // Clear layer counts
    this.layerCounts = new Array(this.layers).fill(0);
    
    // Process input nodes
    inputNodes.forEach((neuron: Neuron, index: number) => {
      this.nodes.push({
        id: neuron.id || index,
        type: 'input',
        layer: 0,
        index: index,
        activation: neuron.squash?.name || 'LOGISTIC',
        bias: neuron.bias || 0
      });
      this.layerCounts[0] = inputNodes.length;
    });
    
    // Process hidden nodes if any
    if (hiddenNodes.length > 0) {
      hiddenNodes.forEach((neuron: Neuron, index: number) => {
        this.nodes.push({
          id: neuron.id || (inputNodes.length + index),
          type: 'hidden',
          layer: 1,
          index: index,
          activation: neuron.squash?.name || 'LOGISTIC',
          bias: neuron.bias || 0
        });
        this.layerCounts[1] = hiddenNodes.length;
      });
    }
    
    // Process output nodes
    outputNodes.forEach((neuron: Neuron, index: number) => {
      this.nodes.push({
        id: neuron.id || (inputNodes.length + hiddenNodes.length + index),
        type: 'output',
        layer: this.layers - 1,
        index: index,
        activation: neuron.squash?.name || 'LOGISTIC',
        bias: neuron.bias || 0
      });
      this.layerCounts[this.layers - 1] = outputNodes.length;
    });
    
    // Parse connections
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
    
    // Log network structure for debugging
    console.log("Network structure:", {
      layers: this.layers,
      layerCounts: this.layerCounts,
      nodes: this.nodes.length,
      connections: this.connections.length
    });
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
    
    // Use thicker lines and larger nodes for better visibility
    const nodeRadius = 22;
    
    // Calculate node positions
    const nodePositions = this.calculateNodePositions();
    
    // Draw connections first (behind nodes)
    this.connections.forEach(conn => {
      const fromPos = nodePositions.get(conn.from);
      const toPos = nodePositions.get(conn.to);
      
      if (!fromPos || !toPos) return;
      
      // Calculate connection path with a curve for better visualization
      this.ctx.beginPath();
      
      // Start point
      this.ctx.moveTo(fromPos.x, fromPos.y);
      
      // Draw curved connection instead of straight line
      // Calculate control points for the curve
      const midX = (fromPos.x + toPos.x) / 2;
      const controlPointOffset = 0; // No offset needed for horizontal layout
      
      this.ctx.bezierCurveTo(
        midX, fromPos.y,  // First control point
        midX, toPos.y,    // Second control point
        toPos.x, toPos.y  // End point
      );
      
      // Line width based on weight strength (absolute value)
      const weightStrength = Math.min(5, Math.max(1, Math.abs(conn.weight) * 3));
      this.ctx.lineWidth = weightStrength;
      
      // Line color based on weight sign with improved contrast
      this.ctx.strokeStyle = conn.weight >= 0 
        ? 'rgba(50, 200, 50, 0.7)'  // Brighter green for positive
        : 'rgba(255, 80, 0, 0.7)';  // Brighter orange for negative
      
      this.ctx.stroke();
      
      // Add weight value as text on the connection
      const weightText = conn.weight.toFixed(2);
      const textX = midX;
      const textY = (fromPos.y + toPos.y) / 2;
      
      // Draw weight value with background for better readability
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Draw text background
      const textWidth = this.ctx.measureText(weightText).width;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(textX - textWidth/2 - 3, textY - 8, textWidth + 6, 16);
      
      // Draw text
      this.ctx.fillStyle = Math.abs(conn.weight) > 0.5 ? '#ffffff' : '#cccccc';
      this.ctx.fillText(weightText, textX, textY);
    });
    
    // Draw nodes with labels
    this.nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;
      
      // Draw node with glow effect for better visibility
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      
      // Draw node
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      
      // Color based on type with better contrast
      if (node.type === 'input') {
        this.ctx.fillStyle = '#4CAF50';  // Green
      } else if (node.type === 'output') {
        this.ctx.fillStyle = '#F44336';  // Red
      } else {
        this.ctx.fillStyle = '#2196F3';  // Blue
      }
      
      this.ctx.fill();
      this.ctx.shadowBlur = 0;  // Reset shadow
      
      this.ctx.strokeStyle = '#222';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Draw node ID
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(node.id.toString(), pos.x, pos.y);
      
      // Add node type label
      const typeLabels = {
        'input': 'In',
        'hidden': 'Hid',
        'output': 'Out'
      };
      
      // Draw type label above the node
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = 'white';
      
      // Add background for the label
      const labelText = typeLabels[node.type];
      const labelWidth = this.ctx.measureText(labelText).width;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(pos.x - labelWidth/2 - 3, pos.y - nodeRadius - 18, labelWidth + 6, 16);
      
      // Draw the label text
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(labelText, pos.x, pos.y - nodeRadius - 10);
      
      // Draw bias indicator
      if (node.bias && node.bias !== 0) {
        // Draw bias as small circle at edge of node
        const biasRadius = 6;
        const biasAngle = node.bias > 0 ? Math.PI / 4 : Math.PI * 5 / 4;
        const biasX = pos.x + (nodeRadius - biasRadius) * Math.cos(biasAngle);
        const biasY = pos.y + (nodeRadius - biasRadius) * Math.sin(biasAngle);
        
        this.ctx.beginPath();
        this.ctx.arc(biasX, biasY, biasRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = node.bias > 0 ? 'white' : 'black';
        this.ctx.fill();
        this.ctx.stroke();
        
        // Add bias value below node
        const biasText = node.bias.toFixed(2);
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`b: ${biasText}`, pos.x, pos.y + nodeRadius + 12);
      }
    });
    
    // Draw legend for node types and connection weights
    this.drawLegend();
  }
  
  private calculateNodePositions(): Map<number, { x: number, y: number }> {
    const positions = new Map<number, { x: number, y: number }>();
    const canvas = this.networkCanvas.nativeElement;
    
    // Use larger padding to ensure visibility and prevent nodes from touching edges
    const horizontalPadding = 120; 
    const verticalPadding = 100;
    
    const width = canvas.width - horizontalPadding * 2;
    const height = canvas.height - verticalPadding * 2;
    
    // Calculate layer width with better spacing
    const layerWidth = this.layers > 1 ? width / (this.layers - 1) : width;
    
    // Group nodes by layer
    const nodesByLayer: { [layer: number]: NetworkNode[] } = {};
    this.nodes.forEach(node => {
      if (!nodesByLayer[node.layer]) {
        nodesByLayer[node.layer] = [];
      }
      nodesByLayer[node.layer].push(node);
    });
    
    // Position all nodes by layer
    Object.entries(nodesByLayer).forEach(([layerStr, nodes]) => {
      const layer = parseInt(layerStr);
      const count = nodes.length;
      
      // Calculate x position based on layer
      const x = horizontalPadding + (layer * layerWidth);
      
      // Calculate dynamic vertical spacing based on node count
      // The more nodes, the closer they'll be, but with a minimum spacing
      const totalNodeSpace = Math.min(height, count * 80); // Limit total space to canvas height
      const startY = verticalPadding + (height - totalNodeSpace) / 2; // Center nodes vertically
      
      // Position nodes in this layer
      nodes.forEach((node, i) => {
        // Use equal spacing for consistent layout
        const y = count > 1 
          ? startY + (i * (totalNodeSpace / (count - 1)))
          : verticalPadding + height / 2;
        
        positions.set(node.id, { x, y });
      });
    });
    
    return positions;
  }
  
  // Add a new method to draw a legend
  private drawLegend(): void {
    const canvas = this.networkCanvas.nativeElement;
    const padding = 10;
    const legendWidth = 140;
    const legendHeight = 120;
    const x = canvas.width - legendWidth - padding;
    const y = padding;
    
    // Draw legend background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x, y, legendWidth, legendHeight);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.strokeRect(x, y, legendWidth, legendHeight);
    
    // Draw legend title
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Network Legend', x + 10, y + 20);
    
    // Draw node types
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.beginPath();
    this.ctx.arc(x + 20, y + 40, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Input Node', x + 35, y + 44);
    
    this.ctx.fillStyle = '#2196F3';
    this.ctx.beginPath();
    this.ctx.arc(x + 20, y + 60, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Hidden Node', x + 35, y + 64);
    
    this.ctx.fillStyle = '#F44336';
    this.ctx.beginPath();
    this.ctx.arc(x + 20, y + 80, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Output Node', x + 35, y + 84);
    
    // Draw connection types
    this.ctx.strokeStyle = 'rgba(50, 200, 50, 0.7)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 10, y + 100);
    this.ctx.lineTo(x + 30, y + 100);
    this.ctx.stroke();
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Positive Weight', x + 35, y + 104);
    
    this.ctx.strokeStyle = 'rgba(255, 80, 0, 0.7)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 10, y + 120);
    this.ctx.lineTo(x + 30, y + 120);
    this.ctx.stroke();
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Negative Weight', x + 35, y + 124);
  }
} 