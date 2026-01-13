/**
 * Star entity - dangerous celestial body that damages ships
 */

export interface StarConfig {
  id?: string; // optional custom id for map offerings
  x: number;
  y: number;
  radius: number;
  color: string; // core color
  coronaColor: string; // outer glow
  damageRadius: number; // radius where damage starts
  damagePerSecond: number;
  name?: string;
}

interface CoronaRay {
  angle: number;
  length: number;
  speed: number;
  phase: number;
}

export class Star {
  public readonly id: string;
  public readonly name: string;
  public readonly x: number;
  public readonly y: number;
  public readonly radius: number;
  public readonly color: string;
  public readonly coronaColor: string;
  public readonly damageRadius: number;
  public readonly damagePerSecond: number;

  private pulsePhase: number = 0;
  private coronaRays: CoronaRay[] = [];
  private flareTimer: number = 0;
  private flareIntensity: number = 0;

  constructor(config: StarConfig) {
    this.id = config.id || `star_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name ?? 'Unknown Star';
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.color = config.color;
    this.coronaColor = config.coronaColor;
    this.damageRadius = config.damageRadius;
    this.damagePerSecond = config.damagePerSecond;

    this.generateCoronaRays();
  }

  private generateCoronaRays(): void {
    const rayCount = 12 + Math.floor(Math.random() * 8);

    for (let i = 0; i < rayCount; i++) {
      this.coronaRays.push({
        angle: (i / rayCount) * Math.PI * 2 + Math.random() * 0.3,
        length: 0.3 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Update star animations
   */
  public update(deltaTime: number): void {
    // Pulse animation
    this.pulsePhase += deltaTime * 2;

    // Update corona ray phases
    for (const ray of this.coronaRays) {
      ray.phase += deltaTime * ray.speed;
    }

    // Random solar flares
    this.flareTimer -= deltaTime;
    if (this.flareTimer <= 0) {
      this.flareTimer = 2 + Math.random() * 5;
      this.flareIntensity = 0.3 + Math.random() * 0.7;
    }

    // Decay flare intensity
    this.flareIntensity = Math.max(0, this.flareIntensity - deltaTime * 0.5);
  }

  /**
   * Render the star with corona and effects
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Render damage zone indicator
    this.renderDamageZone(ctx, screenX, screenY);

    // Render outer corona glow
    this.renderOuterGlow(ctx, screenX, screenY);

    // Render corona rays
    this.renderCoronaRays(ctx, screenX, screenY);

    // Render core glow
    this.renderCoreGlow(ctx, screenX, screenY);

    // Render star body
    this.renderBody(ctx, screenX, screenY);

    // Render heat distortion lines
    this.renderHeatDistortion(ctx, screenX, screenY);

    // Render name
    this.renderName(ctx, screenX, screenY);

    ctx.restore();
  }

  private renderDamageZone(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Faint danger zone ring
    const pulse = Math.sin(this.pulsePhase) * 0.1 + 0.15;

    ctx.beginPath();
    ctx.arc(screenX, screenY, this.damageRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 100, 50, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gradient fill for danger zone
    const dangerGradient = ctx.createRadialGradient(
      screenX,
      screenY,
      this.radius * 1.5,
      screenX,
      screenY,
      this.damageRadius
    );
    dangerGradient.addColorStop(0, 'rgba(255, 100, 0, 0.05)');
    dangerGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, this.damageRadius, 0, Math.PI * 2);
    ctx.fillStyle = dangerGradient;
    ctx.fill();
  }

  private renderOuterGlow(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    const glowRadius = this.radius * 2.5;
    const pulse = Math.sin(this.pulsePhase * 0.5) * 0.1 + 0.9;

    const gradient = ctx.createRadialGradient(
      screenX,
      screenY,
      this.radius,
      screenX,
      screenY,
      glowRadius
    );

    const coronaRgb = this.hexToRgb(this.coronaColor);
    gradient.addColorStop(0, `rgba(${coronaRgb.r}, ${coronaRgb.g}, ${coronaRgb.b}, ${0.4 * pulse})`);
    gradient.addColorStop(0.5, `rgba(${coronaRgb.r}, ${coronaRgb.g}, ${coronaRgb.b}, ${0.15 * pulse})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderCoronaRays(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.save();

    const coronaRgb = this.hexToRgb(this.coronaColor);

    for (const ray of this.coronaRays) {
      const rayLength = this.radius * (1 + ray.length * (Math.sin(ray.phase) * 0.3 + 0.7));
      const rayWidth = this.radius * 0.15;

      const startX = screenX + Math.cos(ray.angle) * this.radius * 0.9;
      const startY = screenY + Math.sin(ray.angle) * this.radius * 0.9;
      const endX = screenX + Math.cos(ray.angle) * (this.radius + rayLength);
      const endY = screenY + Math.sin(ray.angle) * (this.radius + rayLength);

      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `rgba(${coronaRgb.r}, ${coronaRgb.g}, ${coronaRgb.b}, 0.6)`);
      gradient.addColorStop(0.3, `rgba(${coronaRgb.r}, ${coronaRgb.g}, ${coronaRgb.b}, 0.3)`);
      gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Tapered ray shape
      const perpX = Math.cos(ray.angle + Math.PI / 2) * rayWidth;
      const perpY = Math.sin(ray.angle + Math.PI / 2) * rayWidth;

      ctx.lineTo(startX + perpX, startY + perpY);
      ctx.lineTo(endX, endY);
      ctx.lineTo(startX - perpX, startY - perpY);
      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }

  private renderCoreGlow(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    const pulse = Math.sin(this.pulsePhase * 1.5) * 0.15 + 0.85 + this.flareIntensity * 0.3;
    const coreGlowRadius = this.radius * 1.3 * pulse;

    const gradient = ctx.createRadialGradient(
      screenX,
      screenY,
      0,
      screenX,
      screenY,
      coreGlowRadius
    );

    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(0.7, this.coronaColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, coreGlowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderBody(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    const pulse = Math.sin(this.pulsePhase) * 0.05 + 1;
    const bodyRadius = this.radius * pulse;

    // Star body gradient
    const gradient = ctx.createRadialGradient(
      screenX - bodyRadius * 0.2,
      screenY - bodyRadius * 0.2,
      0,
      screenX,
      screenY,
      bodyRadius
    );

    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#ffffd0');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 30));

    ctx.beginPath();
    ctx.arc(screenX, screenY, bodyRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Surface turbulence
    this.renderSurfaceTurbulence(ctx, screenX, screenY, bodyRadius);
  }

  private renderSurfaceTurbulence(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    radius: number
  ): void {
    ctx.save();

    // Clip to star circle
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalAlpha = 0.3;

    // Animated surface patterns
    const patternCount = 5;
    for (let i = 0; i < patternCount; i++) {
      const angle = (i / patternCount) * Math.PI * 2 + this.pulsePhase * 0.1;
      const dist = radius * (0.3 + ((i * 17) % 50) / 100);
      const size = radius * (0.2 + ((i * 23) % 30) / 100);

      const px = screenX + Math.cos(angle) * dist;
      const py = screenY + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? this.lightenColor(this.color, 30) : this.darkenColor(this.color, 20);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderHeatDistortion(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Animated heat distortion lines near the star edge
    ctx.save();
    ctx.globalAlpha = 0.15;

    const lineCount = 8;
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + this.pulsePhase * 0.3;
      const startDist = this.radius * 1.1;
      const endDist = this.radius * 1.5;

      ctx.beginPath();
      ctx.strokeStyle = this.coronaColor;
      ctx.lineWidth = 1;

      // Wavy line
      const startX = screenX + Math.cos(angle) * startDist;
      const startY = screenY + Math.sin(angle) * startDist;
      ctx.moveTo(startX, startY);

      const segments = 5;
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const dist = startDist + (endDist - startDist) * t;
        const wave = Math.sin(this.pulsePhase * 3 + i + j) * 5;
        const perpAngle = angle + Math.PI / 2;

        const px = screenX + Math.cos(angle) * dist + Math.cos(perpAngle) * wave;
        const py = screenY + Math.sin(angle) * dist + Math.sin(perpAngle) * wave;
        ctx.lineTo(px, py);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  private renderName(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    ctx.fillStyle = 'rgba(255, 200, 150, 0.8)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenX, screenY + this.radius * 2.8);

    // Warning text
    ctx.fillStyle = 'rgba(255, 100, 50, 0.7)';
    ctx.font = '11px monospace';
    ctx.fillText('DANGER ZONE', screenX, screenY + this.radius * 2.8 + 16);
  }

  /**
   * Check if a point is within the damage zone
   */
  public isInDamageZone(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const distSq = dx * dx + dy * dy;
    return distSq <= this.damageRadius * this.damageRadius;
  }

  /**
   * Get damage at a specific position (more damage closer to star)
   */
  public getDamageAt(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= this.damageRadius) {
      return 0;
    }

    // Damage increases as you get closer
    // At edge of damage zone: minimal damage
    // At star surface: maximum damage
    const normalizedDist = (distance - this.radius) / (this.damageRadius - this.radius);
    const damageMultiplier = 1 - Math.max(0, Math.min(1, normalizedDist));

    // Exponential increase near the star
    return this.damagePerSecond * Math.pow(damageMultiplier, 2);
  }

  /**
   * Check if a point is within the star body (instant death)
   */
  public containsPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  /**
   * Get distance from a point to the star center
   */
  public distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Color utility methods
  private lightenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
  }

  private darkenColor(color: string, amount: number): string {
    const rgb = this.hexToRgb(color);
    return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const rgbMatch = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 255, g: 200, b: 100 };
  }
}
