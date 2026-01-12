/**
 * Jump Gate entity for zone transitions
 * Visual landmark and teleportation point between zones
 */

import { Entity } from './Entity';
import { Zone } from '../../data/zones';

export interface JumpGateConfig {
  sourceZone: Zone;
  destinationZone: Zone;
  destinationX: number;
  destinationY: number;
  interactionRadius: number;
  size: number;
  isTwoWay: boolean;
}

export class JumpGate extends Entity {
  public sourceZone: Zone;
  public destinationZone: Zone;
  public destinationX: number;
  public destinationY: number;
  public interactionRadius: number;
  public size: number;
  public isTwoWay: boolean;

  private glowPhase: number = 0;
  private ringRotation: number = 0;
  private isPlayerNear: boolean = false;
  private portalActive: boolean = true;

  constructor(x: number, y: number, config: JumpGateConfig) {
    super(x, y, 0);

    this.sourceZone = config.sourceZone;
    this.destinationZone = config.destinationZone;
    this.destinationX = config.destinationX;
    this.destinationY = config.destinationY;
    this.interactionRadius = config.interactionRadius || 100;
    this.size = config.size || 80;
    this.isTwoWay = config.isTwoWay ?? true;
  }

  /**
   * Update gate animations
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    this.glowPhase += deltaTime * 2;
    this.ringRotation += deltaTime * 0.3;

    super.update(deltaTime);
  }

  /**
   * Check if a position is within interaction range
   */
  public isInInteractionRange(x: number, y: number): boolean {
    const dx = x - this.position.x;
    const dy = y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.interactionRadius;
  }

  /**
   * Get distance to gate center
   */
  public getDistanceTo(x: number, y: number): number {
    const dx = x - this.position.x;
    const dy = y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Set whether player is near (for visual feedback)
   */
  public setPlayerNear(near: boolean): void {
    this.isPlayerNear = near;
  }

  /**
   * Get the destination coordinates
   */
  public getDestination(): { x: number; y: number; zone: Zone } {
    return {
      x: this.destinationX,
      y: this.destinationY,
      zone: this.destinationZone,
    };
  }

  /**
   * Activate/deactivate the gate
   */
  public setActive(active: boolean): void {
    this.portalActive = active;
  }

  /**
   * Render the jump gate
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Draw outer ring structure
    this.renderOuterRing(ctx);

    // Draw inner portal effect
    this.renderPortal(ctx);

    // Draw energy tendrils
    this.renderEnergyTendrils(ctx);

    // Draw interaction indicator if player is near
    if (this.isPlayerNear) {
      this.renderInteractionPrompt(ctx);
    }

    ctx.restore();
  }

  /**
   * Render the outer ring structure
   */
  private renderOuterRing(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    ctx.save();
    ctx.rotate(this.ringRotation);

    // Main ring
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.strokeStyle = '#446688';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = '#5588aa';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Ring segments/chevrons
    const segmentCount = 8;
    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);

      // Chevron shape on ring
      ctx.beginPath();
      ctx.moveTo(s * 0.7, -s * 0.15);
      ctx.lineTo(s * 1.05, 0);
      ctx.lineTo(s * 0.7, s * 0.15);
      ctx.strokeStyle = '#88aacc';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Render the inner portal effect
   */
  private renderPortal(ctx: CanvasRenderingContext2D): void {
    if (!this.portalActive) return;

    const s = this.size;
    const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;

    // Portal glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.75);

    // Color based on destination zone danger
    const dangerColors: Record<number, string[]> = {
      1: ['rgba(100, 200, 150, ' + glowIntensity + ')', 'rgba(50, 150, 100, 0)'],
      2: ['rgba(200, 150, 100, ' + glowIntensity + ')', 'rgba(150, 100, 50, 0)'],
      3: ['rgba(200, 100, 100, ' + glowIntensity + ')', 'rgba(150, 50, 50, 0)'],
      4: ['rgba(200, 50, 50, ' + glowIntensity + ')', 'rgba(150, 25, 25, 0)'],
    };

    const colors = dangerColors[this.destinationZone.dangerLevel] || dangerColors[1];
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    ctx.beginPath();
    ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Swirling effect
    ctx.save();
    ctx.rotate(this.glowPhase * 0.5);

    for (let i = 0; i < 3; i++) {
      const spiralAngle = (i / 3) * Math.PI * 2 + this.glowPhase;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, spiralAngle, spiralAngle + Math.PI * 0.5);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + Math.sin(this.glowPhase + i) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render energy tendrils around the gate
   */
  private renderEnergyTendrils(ctx: CanvasRenderingContext2D): void {
    const s = this.size;
    const tendrilCount = 6;

    ctx.save();

    for (let i = 0; i < tendrilCount; i++) {
      const baseAngle = (i / tendrilCount) * Math.PI * 2;
      const wave = Math.sin(this.glowPhase * 2 + i * 1.5) * 0.2;
      const angle = baseAngle + wave;

      const innerRadius = s * 1.1;
      const outerRadius = s * 1.3 + Math.sin(this.glowPhase + i) * 10;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
      ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);

      ctx.strokeStyle = `rgba(100, 150, 200, ${0.3 + Math.sin(this.glowPhase + i) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render interaction prompt when player is near
   */
  private renderInteractionPrompt(ctx: CanvasRenderingContext2D): void {
    const s = this.size;

    // Highlight ring
    ctx.beginPath();
    ctx.arc(0, 0, s + 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(this.glowPhase * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text prompt above gate
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to Jump', 0, -s - 30);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(`To: ${this.destinationZone.name}`, 0, -s - 15);
  }

  /**
   * Render zone label below gate
   */
  public renderLabel(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    const s = this.size;

    // Zone label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const labelWidth = 120;
    const labelHeight = 20;
    ctx.fillRect(-labelWidth / 2, s + 20, labelWidth, labelHeight);

    // Zone label text
    ctx.fillStyle = '#8ac';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`GATE: ${this.destinationZone.name}`, 0, s + 34);

    ctx.restore();
  }
}

/**
 * Create a pair of connected jump gates between two zones
 */
export function createGatePair(
  zone1: Zone,
  x1: number,
  y1: number,
  zone2: Zone,
  x2: number,
  y2: number
): [JumpGate, JumpGate] {
  const gate1 = new JumpGate(x1, y1, {
    sourceZone: zone1,
    destinationZone: zone2,
    destinationX: x2 + 150, // Offset from gate to avoid immediate re-entry
    destinationY: y2,
    interactionRadius: 100,
    size: 80,
    isTwoWay: true,
  });

  const gate2 = new JumpGate(x2, y2, {
    sourceZone: zone2,
    destinationZone: zone1,
    destinationX: x1 + 150,
    destinationY: y1,
    interactionRadius: 100,
    size: 80,
    isTwoWay: true,
  });

  return [gate1, gate2];
}
