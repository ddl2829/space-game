/**
 * Space Station entity - dockable trading location
 */

import type { StationConfig } from '../../data/stations';

export class Station {
  public readonly id: string;
  public readonly name: string;
  public readonly x: number;
  public readonly y: number;
  public readonly size: number;
  public readonly dockingRange: number;

  private rotation: number = 0;
  private rotationSpeed: number = 0.1; // Slow spin
  private pulsePhase: number = 0;
  private isPlayerInRange: boolean = false;

  // Hexagon vertices (computed once)
  private vertices: { x: number; y: number }[] = [];

  constructor(config: StationConfig) {
    this.id = config.id;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.size = config.size;
    this.dockingRange = config.dockingRange;

    this.generateVertices();
  }

  private generateVertices(): void {
    // Create hexagon shape
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      this.vertices.push({
        x: Math.cos(angle) * this.size,
        y: Math.sin(angle) * this.size,
      });
    }
  }

  public update(deltaTime: number): void {
    // Rotate slowly
    this.rotation += this.rotationSpeed * deltaTime;

    // Pulse animation for lights
    this.pulsePhase += deltaTime * 2;
  }

  public setPlayerInRange(inRange: boolean): void {
    this.isPlayerInRange = inRange;
  }

  public isInDockingRange(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.dockingRange;
  }

  public distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotation);

    // Draw docking range indicator when player is nearby
    if (this.isPlayerInRange) {
      this.renderDockingRange(ctx);
    }

    // Draw station body (hexagon)
    this.renderBody(ctx);

    // Draw docking ring
    this.renderDockingRing(ctx);

    // Draw details (windows, lights, antenna)
    this.renderDetails(ctx);

    ctx.restore();

    // Draw station name (not rotated)
    this.renderName(ctx, screenX, screenY);
  }

  private renderDockingRange(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.rotate(-this.rotation); // Counter-rotate so ring doesn't spin

    const pulse = Math.sin(this.pulsePhase * 3) * 0.2 + 0.8;

    // Docking zone circle
    ctx.strokeStyle = `rgba(100, 200, 100, ${0.3 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, this.dockingRange, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private renderBody(ctx: CanvasRenderingContext2D): void {
    // Main hexagon body
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();

    // Gradient fill for depth
    const gradient = ctx.createRadialGradient(
      -this.size * 0.3,
      -this.size * 0.3,
      0,
      0,
      0,
      this.size
    );
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(0.5, '#2d3748');
    gradient.addColorStop(1, '#1a202c');

    ctx.fillStyle = gradient;
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner hexagon (structural detail)
    ctx.beginPath();
    const innerScale = 0.7;
    ctx.moveTo(this.vertices[0].x * innerScale, this.vertices[0].y * innerScale);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x * innerScale, this.vertices[i].y * innerScale);
    }
    ctx.closePath();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderDockingRing(ctx: CanvasRenderingContext2D): void {
    const ringRadius = this.size * 1.2;

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#5a6070';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner ring highlight
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#7a8090';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Docking markers (4 points)
    const markerCount = 4;
    for (let i = 0; i < markerCount; i++) {
      const angle = (i / markerCount) * Math.PI * 2;
      const mx = Math.cos(angle) * ringRadius;
      const my = Math.sin(angle) * ringRadius;

      // Docking light
      const pulse = Math.sin(this.pulsePhase + i) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fillStyle = this.isPlayerInRange
        ? `rgba(100, 255, 100, ${0.5 + pulse * 0.5})`
        : `rgba(255, 200, 50, ${0.3 + pulse * 0.3})`;
      ctx.fill();

      // Light glow
      if (this.isPlayerInRange) {
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(mx, my, 0, mx, my, 12);
        glowGradient.addColorStop(0, `rgba(100, 255, 100, ${0.3 * pulse})`);
        glowGradient.addColorStop(1, 'rgba(100, 255, 100, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }
    }
  }

  private renderDetails(ctx: CanvasRenderingContext2D): void {
    // Windows on each hexagon face
    for (let i = 0; i < this.vertices.length; i++) {
      const v1 = this.vertices[i];
      const v2 = this.vertices[(i + 1) % this.vertices.length];

      // Window position (midpoint of edge, slightly inward)
      const wx = (v1.x + v2.x) * 0.4;
      const wy = (v1.y + v2.y) * 0.4;

      // Window
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      const windowPulse = Math.sin(this.pulsePhase * 0.5 + i) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(200, 230, 255, ${windowPulse})`;
      ctx.fill();
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Central light
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    const centerPulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(100, 150, 255, ${centerPulse})`;
    ctx.fill();

    // Central glow
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    glowGradient.addColorStop(0, `rgba(100, 150, 255, ${0.4 * centerPulse})`);
    glowGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // Antenna (on top vertex)
    const antennaBase = this.vertices[0];
    const antennaLength = this.size * 0.5;

    ctx.beginPath();
    ctx.moveTo(antennaBase.x * 0.8, antennaBase.y * 0.8);
    ctx.lineTo(antennaBase.x + antennaBase.x * 0.3, antennaBase.y - antennaLength);
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Antenna tip light
    const antennaTipX = antennaBase.x + antennaBase.x * 0.3;
    const antennaTipY = antennaBase.y - antennaLength;
    const antennaPulse = Math.sin(this.pulsePhase * 4) > 0 ? 1 : 0.3;

    ctx.beginPath();
    ctx.arc(antennaTipX, antennaTipY, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 50, 50, ${antennaPulse})`;
    ctx.fill();
  }

  private renderName(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    ctx.save();

    ctx.fillStyle = this.isPlayerInRange ? '#a0d0a0' : 'rgba(200, 200, 200, 0.7)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenX, screenY + this.size * 1.6);

    // Docking prompt when in range
    if (this.isPlayerInRange) {
      const promptPulse = Math.sin(this.pulsePhase * 3) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(150, 255, 150, ${promptPulse})`;
      ctx.font = '12px monospace';
      ctx.fillText('Press E to dock', screenX, screenY + this.size * 1.6 + 18);
    }

    ctx.restore();
  }
}
