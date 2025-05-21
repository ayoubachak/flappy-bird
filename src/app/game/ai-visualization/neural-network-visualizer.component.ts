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
        <div class="drag-instructions" *ngIf="hasNodes">
          Drag nodes to reposition them
        </div>
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
      cursor: grab;
    }
    
    .drag-instructions {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.6);
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      opacity: 0.7;
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
  
  // Public property for template
  public hasNodes = false;
  
  // Node dragging properties
  private isDragging = false;
  private draggedNodeId: number | null = null;
  private nodePositions = new Map<number, { x: number, y: number }>();
  private customPositions = new Map<number, { x: number, y: number }>();
  
  constructor() { }
  
  ngOnInit(): void {
    const canvas = this.networkCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Add event listeners for dragging nodes
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Add touch events for mobile
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  // Mouse event handlers for dragging
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.networkCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find if any node was clicked
    const clickedNodeId = this.findNodeAtPosition(x, y);
    if (clickedNodeId !== null) {
      this.isDragging = true;
      this.draggedNodeId = clickedNodeId;
      this.networkCanvas.nativeElement.style.cursor = 'grabbing';
    }
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.draggedNodeId === null) return;
    
    const rect = this.networkCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update node position
    this.customPositions.set(this.draggedNodeId, { x, y });
    
    // Redraw the network
    this.drawNetwork();
  }
  
  private handleMouseUp(): void {
    this.isDragging = false;
    this.draggedNodeId = null;
    this.networkCanvas.nativeElement.style.cursor = 'grab';
  }
  
  // Touch event handlers for mobile
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const rect = this.networkCanvas.nativeElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Find if any node was touched
    const touchedNodeId = this.findNodeAtPosition(x, y);
    if (touchedNodeId !== null) {
      this.isDragging = true;
      this.draggedNodeId = touchedNodeId;
      event.preventDefault(); // Prevent scrolling
    }
  }
  
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isDragging || this.draggedNodeId === null || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const rect = this.networkCanvas.nativeElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Update node position
    this.customPositions.set(this.draggedNodeId, { x, y });
    
    // Redraw the network
    this.drawNetwork();
    event.preventDefault(); // Prevent scrolling
  }
  
  private handleTouchEnd(event: TouchEvent): void {
    this.isDragging = false;
    this.draggedNodeId = null;
  }
  
  // Find which node (if any) is at the given position
  private findNodeAtPosition(x: number, y: number): number | null {
    const nodeRadius = 20; // Standard node radius
    const radiusSquared = nodeRadius * nodeRadius;
    
    for (const node of this.nodes) {
      const pos = this.getFinalNodePosition(node.id);
      if (!pos) continue;
      
      // Check if click is within node radius
      const distanceSquared = Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2);
      if (distanceSquared <= radiusSquared) {
        return node.id;
      }
    }
    
    return null;
  }
  
  // Get the final position of a node, considering custom positions
  private getFinalNodePosition(nodeId: number): { x: number, y: number } | undefined {
    // First check if node has a custom position from dragging
    const customPos = this.customPositions.get(nodeId);
    if (customPos) {
      return customPos;
    }
    
    // Otherwise return the calculated position
    return this.nodePositions.get(nodeId);
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
      
      // Need to recalculate node positions and redraw when canvas size changes
      this.calculateNodePositions();
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
    
    // Update hasNodes after processing
    this.hasNodes = this.nodes.length > 0;
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
    
    // Update hasNodes
    this.hasNodes = this.nodes.length > 0;
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
  
  private calculateNodePositions(): void {
    const canvas = this.networkCanvas.nativeElement;
    this.nodePositions.clear(); // Clear previous positions
    
    // Check if we're in mobile mode
    const isMobile = window.innerWidth <= 768;
    
    // Use almost full canvas for spreading nodes, with smaller padding on mobile
    const horizontalPadding = isMobile ? 30 : 50; 
    const verticalPadding = isMobile ? 20 : 50;
    
    const width = canvas.width - horizontalPadding * 2;
    const height = canvas.height - verticalPadding * 2;
    
    // Calculate layer width with wider spacing
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
      
      // Maximize spacing between nodes
      const startY = verticalPadding;
      const availableHeight = height;
      
      // Position nodes in this layer
      nodes.forEach((node, i) => {
        // Use equal spacing for consistent layout
        const y = count > 1 
          ? startY + (i * (availableHeight / (count - 1)))
          : startY + availableHeight / 2;
        
        this.nodePositions.set(node.id, { x, y });
      });
    });
  }
  
  private drawNetwork(): void {
    if (!this.ctx || this.nodes.length === 0) return;
    
    const canvas = this.networkCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if we're in mobile mode
    const isMobile = window.innerWidth <= 768;
    
    // Use smaller node size on mobile
    const nodeRadius = isMobile ? 15 : 20;
    
    // Calculate node positions if needed
    if (this.nodePositions.size === 0) {
      this.calculateNodePositions();
    }
    
    // Draw connections first (behind nodes)
    this.connections.forEach(conn => {
      const fromPos = this.getFinalNodePosition(conn.from);
      const toPos = this.getFinalNodePosition(conn.to);
      
      if (!fromPos || !toPos) return;
      
      // Calculate connection path with a curve for better visualization
      this.ctx.beginPath();
      
      // Start point
      this.ctx.moveTo(fromPos.x, fromPos.y);
      
      // Draw curved connection with more pronounced curve
      const midX = (fromPos.x + toPos.x) / 2;
      const controlOffset = 30 * (toPos.y - fromPos.y) / canvas.height; // Relative curve offset
      
      this.ctx.bezierCurveTo(
        midX - controlOffset, fromPos.y,  // First control point with offset
        midX + controlOffset, toPos.y,    // Second control point with offset
        toPos.x, toPos.y                  // End point
      );
      
      // Line width based on weight strength (absolute value)
      const weightStrength = Math.min(isMobile ? 3 : 4, Math.max(1, Math.abs(conn.weight) * 3));
      this.ctx.lineWidth = weightStrength;
      
      // Line color based on weight sign with improved contrast
      this.ctx.strokeStyle = conn.weight >= 0 
        ? 'rgba(50, 220, 50, 0.8)'  // Green for positive
        : 'rgba(255, 100, 0, 0.8)';  // Orange for negative
      
      this.ctx.stroke();
      
      // On mobile, only show weight values for significant weights to reduce clutter
      if (!isMobile || Math.abs(conn.weight) > 0.3) {
        // Add weight value as text on the connection
        const weightText = isMobile ? conn.weight.toFixed(1) : conn.weight.toFixed(2);
        const textX = midX;
        const textY = (fromPos.y + toPos.y) / 2;
        
        // Draw weight value with background
        this.ctx.font = isMobile ? '10px Arial' : '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw text background
        const textWidth = this.ctx.measureText(weightText).width;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(textX - textWidth/2 - 3, textY - 8, textWidth + 6, 16);
        
        // Draw text
        this.ctx.fillStyle = Math.abs(conn.weight) > 0.2 ? '#ffffff' : '#ffff00';
        this.ctx.fillText(weightText, textX, textY);
      }
    });
    
    // Draw nodes with labels
    this.nodes.forEach(node => {
      const pos = this.getFinalNodePosition(node.id);
      if (!pos) return;
      
      // Draw node with subtle glow effect
      this.ctx.shadowBlur = isMobile ? 5 : 8;
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      
      // Draw node
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      
      // Color based on type
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
      this.ctx.font = isMobile ? '10px Arial' : '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(node.id.toString(), pos.x, pos.y);
      
      // In mobile mode, skip type labels and bias indicators to reduce clutter
      if (!isMobile) {
        // Add node type label
        const typeLabels = {
          'input': 'In',
          'hidden': 'Hid',
          'output': 'Out'
        };
        
        // Draw type label above the node
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = 'white';
        
        // Add background for the label
        const labelText = typeLabels[node.type];
        const labelWidth = this.ctx.measureText(labelText).width;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(pos.x - labelWidth/2 - 3, pos.y - nodeRadius - 15, labelWidth + 6, 14);
        
        // Draw the label text
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(labelText, pos.x, pos.y - nodeRadius - 8);
        
        // Draw bias indicator
        if (node.bias && node.bias !== 0) {
          // Draw bias as small circle at edge of node
          const biasRadius = 5;
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
          
          // Add background for bias text
          const biasTextWidth = this.ctx.measureText(`b: ${biasText}`).width;
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          this.ctx.fillRect(pos.x - biasTextWidth/2 - 3, pos.y + nodeRadius + 4, biasTextWidth + 6, 14);
          
          // Draw bias text
          this.ctx.fillStyle = 'white';
          this.ctx.fillText(`b: ${biasText}`, pos.x, pos.y + nodeRadius + 11);
        }
      }
    });
  }
} 