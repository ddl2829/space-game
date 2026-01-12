/**
 * Zone management system
 * Tracks player position, handles zone transitions, and applies zone effects
 */

import { Zone, ZONES, getZoneAtPosition, getDistanceToZoneBoundary, SAFE_ZONE } from '../../data/zones';

export interface ZoneTransitionEvent {
  previousZone: Zone;
  newZone: Zone;
  timestamp: number;
}

export interface ZoneSystemConfig {
  transitionFlashDuration: number;
  warningDistance: number;
}

export class ZoneSystem {
  private currentZone: Zone;
  private previousZone: Zone | null = null;
  private config: ZoneSystemConfig;
  private transitionFlashTimer: number = 0;
  private transitionMessage: string = '';
  private transitionMessageTimer: number = 0;
  private onZoneChange: ((event: ZoneTransitionEvent) => void) | null = null;
  private distanceToBoundary: number = 0;
  private isNearBoundary: boolean = false;

  constructor(config?: Partial<ZoneSystemConfig>) {
    this.config = {
      transitionFlashDuration: 0.3,
      warningDistance: 200,
      ...config,
    };
    this.currentZone = SAFE_ZONE;
  }

  /**
   * Update zone system based on player position
   */
  public update(playerX: number, playerY: number, deltaTime: number): void {
    // Determine current zone based on position
    const newZone = getZoneAtPosition(playerX, playerY);

    // Check for zone transition
    if (newZone.id !== this.currentZone.id) {
      this.handleZoneTransition(newZone);
    }

    // Update distance to current zone boundary
    this.distanceToBoundary = getDistanceToZoneBoundary(playerX, playerY, this.currentZone);
    this.isNearBoundary = Math.abs(this.distanceToBoundary) < this.config.warningDistance;

    // Update transition effects
    if (this.transitionFlashTimer > 0) {
      this.transitionFlashTimer -= deltaTime;
    }

    if (this.transitionMessageTimer > 0) {
      this.transitionMessageTimer -= deltaTime;
    }
  }

  /**
   * Handle transition to a new zone
   */
  private handleZoneTransition(newZone: Zone): void {
    this.previousZone = this.currentZone;
    this.currentZone = newZone;

    // Trigger transition effects
    this.transitionFlashTimer = this.config.transitionFlashDuration;
    this.transitionMessage = `Entering ${newZone.name}`;
    this.transitionMessageTimer = 3.0;

    // Log transition
    console.log(`[ZoneSystem] Transitioned from ${this.previousZone.name} to ${newZone.name}`);

    // Fire callback if registered
    if (this.onZoneChange) {
      this.onZoneChange({
        previousZone: this.previousZone,
        newZone: newZone,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Register a callback for zone change events
   */
  public setOnZoneChange(callback: (event: ZoneTransitionEvent) => void): void {
    this.onZoneChange = callback;
  }

  /**
   * Get the current zone
   */
  public getCurrentZone(): Zone {
    return this.currentZone;
  }

  /**
   * Get the previous zone (for transition effects)
   */
  public getPreviousZone(): Zone | null {
    return this.previousZone;
  }

  /**
   * Check if currently in transition flash
   */
  public isInTransition(): boolean {
    return this.transitionFlashTimer > 0;
  }

  /**
   * Get transition flash progress (0-1)
   */
  public getTransitionProgress(): number {
    if (this.transitionFlashTimer <= 0) return 0;
    return this.transitionFlashTimer / this.config.transitionFlashDuration;
  }

  /**
   * Get the current transition message (if any)
   */
  public getTransitionMessage(): string | null {
    if (this.transitionMessageTimer <= 0) return null;
    return this.transitionMessage;
  }

  /**
   * Get transition message opacity (for fade out effect)
   */
  public getTransitionMessageOpacity(): number {
    if (this.transitionMessageTimer <= 0) return 0;
    // Fade out in the last second
    if (this.transitionMessageTimer < 1.0) {
      return this.transitionMessageTimer;
    }
    return 1.0;
  }

  /**
   * Check if player is near zone boundary
   */
  public isNearZoneBoundary(): boolean {
    return this.isNearBoundary;
  }

  /**
   * Get distance to nearest zone boundary
   */
  public getDistanceToBoundary(): number {
    return this.distanceToBoundary;
  }

  /**
   * Get the background color for current zone
   */
  public getBackgroundColor(): string {
    // Blend colors during transition
    if (this.transitionFlashTimer > 0 && this.previousZone) {
      const t = this.getTransitionProgress();
      return this.lerpColor(this.currentZone.backgroundColor, '#ffffff', t * 0.3);
    }
    return this.currentZone.backgroundColor;
  }

  /**
   * Get resource multiplier for current zone
   */
  public getResourceMultiplier(): number {
    return this.currentZone.resourceMultiplier;
  }

  /**
   * Get price multiplier for current zone
   */
  public getPriceMultiplier(): number {
    return this.currentZone.priceMultiplier;
  }

  /**
   * Get enemy spawn rate for current zone
   */
  public getEnemySpawnRate(): number {
    return this.currentZone.enemySpawnRate;
  }

  /**
   * Get max enemies for current zone
   */
  public getMaxEnemies(): number {
    return this.currentZone.maxEnemies;
  }

  /**
   * Render zone-related visual effects
   */
  public render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Render transition flash
    if (this.transitionFlashTimer > 0) {
      const alpha = this.getTransitionProgress() * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Render zone boundary warning (subtle vignette)
    if (this.isNearBoundary && this.currentZone.dangerLevel === 1) {
      this.renderDangerWarning(ctx, canvasWidth, canvasHeight);
    }
  }

  /**
   * Render danger warning vignette when approaching dangerous zone
   */
  private renderDangerWarning(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const proximity = 1 - Math.abs(this.distanceToBoundary) / this.config.warningDistance;
    const alpha = proximity * 0.2;

    // Red vignette at edges
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      Math.min(canvasWidth, canvasHeight) * 0.3,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(255, 50, 50, ${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Render zone indicator on HUD
   */
  public renderHUD(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();

    // Zone name badge
    const zone = this.currentZone;
    const dangerColors: Record<number, string> = {
      1: '#4a8',
      2: '#a84',
      3: '#a44',
      4: '#a22',
    };

    const badgeColor = dangerColors[zone.dangerLevel] || '#888';
    const badgeText = zone.name;

    ctx.font = 'bold 12px monospace';
    const textWidth = ctx.measureText(badgeText).width;
    const padding = 8;
    const badgeWidth = textWidth + padding * 2;
    const badgeHeight = 20;

    // Badge background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, badgeWidth, badgeHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Danger level indicator
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(x + 10, y + badgeHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Zone name
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, x + 20, y + 14);

    // Transition message
    const message = this.getTransitionMessage();
    if (message) {
      const msgOpacity = this.getTransitionMessageOpacity();
      ctx.globalAlpha = msgOpacity;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = badgeColor;
      ctx.fillText(message, x + badgeWidth / 2 + 50, y + 50);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /**
   * Helper to draw rounded rectangles
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Linear interpolation between two hex colors
   */
  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 10, g: 10, b: 18 };
  }

  /**
   * Get all zones
   */
  public getAllZones(): Zone[] {
    return ZONES;
  }
}
