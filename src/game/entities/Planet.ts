/**
 * Planet entity - large spherical celestial body with orbiting moons and stations
 */

export interface MoonConfig {
  radius: number;
  orbitRadius: number;
  orbitSpeed: number; // radians per second
  color: string;
  startAngle?: number;
}

export interface OrbitingStationConfig {
  orbitRadius: number;
  orbitSpeed: number;
  startAngle?: number;
  stationId: string; // reference to actual station
}

export interface PlanetConfig {
  id?: string; // optional custom id for map offerings
  x: number;
  y: number;
  radius: number;
  color: string;
  name: string;
  hasAtmosphere?: boolean;
  atmosphereColor?: string;
  moons?: MoonConfig[];
  orbitingStations?: OrbitingStationConfig[];
  surfaceDetails?: 'bands' | 'spots' | 'craters' | 'none';
}

interface MoonState {
  config: MoonConfig;
  currentAngle: number;
}

interface OrbitingStationState {
  config: OrbitingStationConfig;
  currentAngle: number;
}

export class Planet {
  public readonly id: string;
  public readonly name: string;
  public readonly x: number;
  public readonly y: number;
  public readonly radius: number;
  public readonly color: string;
  public readonly hasAtmosphere: boolean;
  public readonly atmosphereColor: string;
  public readonly surfaceDetails: 'bands' | 'spots' | 'craters' | 'none';

  private moons: MoonState[] = [];
  private orbitingStations: OrbitingStationState[] = [];
  private rotationAngle: number = 0;
  private rotationSpeed: number = 0.02; // slow planetary rotation

  constructor(config: PlanetConfig) {
    this.id = config.id || `planet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.color = config.color;
    this.hasAtmosphere = config.hasAtmosphere ?? false;
    this.atmosphereColor = config.atmosphereColor ?? 'rgba(100, 150, 255, 0.3)';
    this.surfaceDetails = config.surfaceDetails ?? 'none';

    // Initialize moons
    if (config.moons) {
      for (const moonConfig of config.moons) {
        this.moons.push({
          config: moonConfig,
          currentAngle: moonConfig.startAngle ?? Math.random() * Math.PI * 2,
        });
      }
    }

    // Initialize orbiting stations
    if (config.orbitingStations) {
      for (const stationConfig of config.orbitingStations) {
        this.orbitingStations.push({
          config: stationConfig,
          currentAngle: stationConfig.startAngle ?? Math.random() * Math.PI * 2,
        });
      }
    }
  }

  /**
   * Update moon and station orbital positions
   */
  public update(deltaTime: number): void {
    // Update planetary rotation
    this.rotationAngle += this.rotationSpeed * deltaTime;

    // Update moon positions
    for (const moon of this.moons) {
      moon.currentAngle += moon.config.orbitSpeed * deltaTime;
      if (moon.currentAngle > Math.PI * 2) {
        moon.currentAngle -= Math.PI * 2;
      }
    }

    // Update orbiting station positions
    for (const station of this.orbitingStations) {
      station.currentAngle += station.config.orbitSpeed * deltaTime;
      if (station.currentAngle > Math.PI * 2) {
        station.currentAngle -= Math.PI * 2;
      }
    }
  }

  /**
   * Render the planet with atmosphere and moons
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Render orbit paths for moons (behind planet)
    this.renderOrbitPaths(ctx, screenX, screenY);

    // Render atmosphere glow (behind planet body)
    if (this.hasAtmosphere) {
      this.renderAtmosphere(ctx, screenX, screenY);
    }

    // Render planet body
    this.renderBody(ctx, screenX, screenY);

    // Render surface details
    this.renderSurfaceDetails(ctx, screenX, screenY);

    // Render moons
    this.renderMoons(ctx, screenX, screenY);

    // Render planet name
    this.renderName(ctx, screenX, screenY);

    ctx.restore();
  }

  private renderOrbitPaths(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);

    // Moon orbit paths
    for (const moon of this.moons) {
      ctx.beginPath();
      ctx.arc(screenX, screenY, moon.config.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Station orbit paths
    for (const station of this.orbitingStations) {
      ctx.beginPath();
      ctx.arc(screenX, screenY, station.config.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderAtmosphere(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    const atmosphereRadius = this.radius * 1.15;

    // Outer atmosphere glow
    const gradient = ctx.createRadialGradient(
      screenX,
      screenY,
      this.radius,
      screenX,
      screenY,
      atmosphereRadius
    );
    gradient.addColorStop(0, this.atmosphereColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenX, screenY, atmosphereRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderBody(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    // Main planet gradient for 3D effect
    const lightOffsetX = -this.radius * 0.3;
    const lightOffsetY = -this.radius * 0.3;

    const gradient = ctx.createRadialGradient(
      screenX + lightOffsetX,
      screenY + lightOffsetY,
      0,
      screenX,
      screenY,
      this.radius
    );

    const lightColor = this.lightenColor(this.color, 40);
    const darkColor = this.darkenColor(this.color, 60);

    gradient.addColorStop(0, lightColor);
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, darkColor);

    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = this.lightenColor(this.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderSurfaceDetails(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.save();

    // Clip to planet circle
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius - 2, 0, Math.PI * 2);
    ctx.clip();

    switch (this.surfaceDetails) {
      case 'bands':
        this.renderBands(ctx, screenX, screenY);
        break;
      case 'spots':
        this.renderSpots(ctx, screenX, screenY);
        break;
      case 'craters':
        this.renderCraters(ctx, screenX, screenY);
        break;
    }

    ctx.restore();
  }

  private renderBands(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    // Jupiter-like horizontal bands
    const bandCount = 6;
    const bandHeight = (this.radius * 2) / bandCount;

    ctx.globalAlpha = 0.3;

    for (let i = 0; i < bandCount; i++) {
      if (i % 2 === 0) continue;

      const y = screenY - this.radius + i * bandHeight;
      const bandColor = i % 4 === 1 ? this.lightenColor(this.color, 15) : this.darkenColor(this.color, 15);

      ctx.fillStyle = bandColor;
      ctx.fillRect(screenX - this.radius, y, this.radius * 2, bandHeight);
    }

    ctx.globalAlpha = 1;
  }

  private renderSpots(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    // Random spots/storms on surface
    const seed = this.id.charCodeAt(0);
    const spotCount = 3 + (seed % 4);

    ctx.globalAlpha = 0.4;

    for (let i = 0; i < spotCount; i++) {
      const angle = ((seed + i * 73) % 360) * (Math.PI / 180) + this.rotationAngle;
      const distance = this.radius * (0.3 + ((seed + i * 37) % 50) / 100);
      const spotRadius = this.radius * (0.1 + ((seed + i * 17) % 20) / 100);

      const spotX = screenX + Math.cos(angle) * distance;
      const spotY = screenY + Math.sin(angle) * distance;

      const spotColor = i % 2 === 0 ? this.darkenColor(this.color, 30) : this.lightenColor(this.color, 30);

      ctx.beginPath();
      ctx.ellipse(spotX, spotY, spotRadius, spotRadius * 0.6, angle, 0, Math.PI * 2);
      ctx.fillStyle = spotColor;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private renderCraters(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    // Moon-like craters
    const seed = this.id.charCodeAt(0);
    const craterCount = 5 + (seed % 5);

    for (let i = 0; i < craterCount; i++) {
      const angle = ((seed + i * 67) % 360) * (Math.PI / 180);
      const distance = this.radius * (0.2 + ((seed + i * 41) % 60) / 100);
      const craterRadius = this.radius * (0.05 + ((seed + i * 23) % 15) / 100);

      const craterX = screenX + Math.cos(angle) * distance;
      const craterY = screenY + Math.sin(angle) * distance;

      // Crater shadow
      ctx.beginPath();
      ctx.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.darkenColor(this.color, 40);
      ctx.globalAlpha = 0.5;
      ctx.fill();

      // Crater highlight
      ctx.beginPath();
      ctx.arc(craterX - craterRadius * 0.2, craterY - craterRadius * 0.2, craterRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = this.lightenColor(this.color, 20);
      ctx.globalAlpha = 0.3;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private renderMoons(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    for (const moon of this.moons) {
      const moonX = screenX + Math.cos(moon.currentAngle) * moon.config.orbitRadius;
      const moonY = screenY + Math.sin(moon.currentAngle) * moon.config.orbitRadius;

      // Moon shadow (3D effect)
      const gradient = ctx.createRadialGradient(
        moonX - moon.config.radius * 0.3,
        moonY - moon.config.radius * 0.3,
        0,
        moonX,
        moonY,
        moon.config.radius
      );
      gradient.addColorStop(0, this.lightenColor(moon.config.color, 30));
      gradient.addColorStop(0.6, moon.config.color);
      gradient.addColorStop(1, this.darkenColor(moon.config.color, 40));

      ctx.beginPath();
      ctx.arc(moonX, moonY, moon.config.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Moon outline
      ctx.strokeStyle = this.darkenColor(moon.config.color, 20);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private renderName(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenX, screenY + this.radius + 25);
  }

  /**
   * Get current positions of all moons
   */
  public getMoonPositions(): { x: number; y: number }[] {
    return this.moons.map((moon) => ({
      x: this.x + Math.cos(moon.currentAngle) * moon.config.orbitRadius,
      y: this.y + Math.sin(moon.currentAngle) * moon.config.orbitRadius,
    }));
  }

  /**
   * Get position of a specific orbiting station
   */
  public getOrbitingStationPosition(index: number): { x: number; y: number } {
    if (index < 0 || index >= this.orbitingStations.length) {
      return { x: this.x, y: this.y };
    }

    const station = this.orbitingStations[index];
    return {
      x: this.x + Math.cos(station.currentAngle) * station.config.orbitRadius,
      y: this.y + Math.sin(station.currentAngle) * station.config.orbitRadius,
    };
  }

  /**
   * Get all orbiting station IDs and their current positions
   */
  public getOrbitingStations(): { stationId: string; x: number; y: number }[] {
    return this.orbitingStations.map((station) => ({
      stationId: station.config.stationId,
      x: this.x + Math.cos(station.currentAngle) * station.config.orbitRadius,
      y: this.y + Math.sin(station.currentAngle) * station.config.orbitRadius,
    }));
  }

  /**
   * Check if a point is within the planet's collision radius
   */
  public containsPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  /**
   * Get distance from a point to the planet center
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
    // Handle rgb() format
    const rgbMatch = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    // Handle hex format
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 128, g: 128, b: 128 };
  }
}
