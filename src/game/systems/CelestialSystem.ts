/**
 * Celestial System - manages all celestial bodies (planets, stars, black holes)
 */

import { Planet, PlanetConfig } from '../entities/Planet';
import { Star, StarConfig } from '../entities/Star';
import { BlackHole, BlackHoleConfig } from '../entities/BlackHole';
import type { POI } from '../ui/POIMarkers';

export class CelestialSystem {
  private planets: Planet[] = [];
  private stars: Star[] = [];
  private blackHoles: BlackHole[] = [];

  constructor() {}

  /**
   * Add a planet to the system
   */
  public addPlanet(config: PlanetConfig): Planet {
    const planet = new Planet(config);
    this.planets.push(planet);
    return planet;
  }

  /**
   * Add a star to the system
   */
  public addStar(config: StarConfig): Star {
    const star = new Star(config);
    this.stars.push(star);
    return star;
  }

  /**
   * Add a black hole to the system
   */
  public addBlackHole(config: BlackHoleConfig): BlackHole {
    const blackHole = new BlackHole(config);
    this.blackHoles.push(blackHole);
    return blackHole;
  }

  /**
   * Remove a planet from the system
   */
  public removePlanet(id: string): boolean {
    const index = this.planets.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.planets.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove a star from the system
   */
  public removeStar(id: string): boolean {
    const index = this.stars.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.stars.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove a black hole from the system
   */
  public removeBlackHole(id: string): boolean {
    const index = this.blackHoles.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.blackHoles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all celestial bodies
   */
  public clear(): void {
    this.planets = [];
    this.stars = [];
    this.blackHoles = [];
  }

  /**
   * Update all celestial bodies
   */
  public update(deltaTime: number): void {
    // Update planets (moon orbits, etc.)
    for (const planet of this.planets) {
      planet.update(deltaTime);
    }

    // Update stars (corona animation, etc.)
    for (const star of this.stars) {
      star.update(deltaTime);
    }

    // Update black holes (accretion disk animation, etc.)
    for (const blackHole of this.blackHoles) {
      blackHole.update(deltaTime);
    }
  }

  /**
   * Render all celestial bodies
   */
  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    // Render order: black holes first (background), then stars, then planets
    // This creates proper layering where planets can orbit in front of distant objects

    // Black holes (deepest background)
    for (const blackHole of this.blackHoles) {
      blackHole.render(ctx, cameraX, cameraY);
    }

    // Stars (middle layer)
    for (const star of this.stars) {
      star.render(ctx, cameraX, cameraY);
    }

    // Planets (foreground)
    for (const planet of this.planets) {
      planet.render(ctx, cameraX, cameraY);
    }
  }

  /**
   * Get combined gravitational force from all black holes at a position
   */
  public getGravityForce(x: number, y: number): { fx: number; fy: number } {
    let totalFx = 0;
    let totalFy = 0;

    for (const blackHole of this.blackHoles) {
      if (blackHole.isInPullRange(x, y)) {
        const force = blackHole.getPullForce(x, y);
        totalFx += force.fx;
        totalFy += force.fy;
      }
    }

    return { fx: totalFx, fy: totalFy };
  }

  /**
   * Check for star damage at a position
   * Returns total damage per second from all nearby stars
   */
  public checkStarDamage(x: number, y: number): number {
    let totalDamage = 0;

    for (const star of this.stars) {
      if (star.isInDamageZone(x, y)) {
        totalDamage += star.getDamageAt(x, y);
      }
    }

    return totalDamage;
  }

  /**
   * Check if position is inside any star (instant death)
   */
  public checkStarCollision(x: number, y: number): Star | null {
    for (const star of this.stars) {
      if (star.containsPoint(x, y)) {
        return star;
      }
    }
    return null;
  }

  /**
   * Check if position is inside a black hole event horizon
   * Returns the black hole if captured, null otherwise
   */
  public checkBlackHoleCapture(x: number, y: number): BlackHole | null {
    for (const blackHole of this.blackHoles) {
      if (blackHole.isInEventHorizon(x, y)) {
        return blackHole;
      }
    }
    return null;
  }

  /**
   * Check if position collides with any planet
   */
  public checkPlanetCollision(x: number, y: number): Planet | null {
    for (const planet of this.planets) {
      if (planet.containsPoint(x, y)) {
        return planet;
      }
    }
    return null;
  }

  /**
   * Get all POIs for minimap/markers
   */
  public getAllPOIs(): POI[] {
    const pois: POI[] = [];

    // Add planets as POIs
    for (const planet of this.planets) {
      pois.push({
        x: planet.x,
        y: planet.y,
        type: 'station', // Using station type for planets since POI doesn't have 'planet'
        name: planet.name,
        color: '#60a5fa', // Blue for planets
      });
    }

    // Add stars as POIs
    for (const star of this.stars) {
      pois.push({
        x: star.x,
        y: star.y,
        type: 'enemy', // Using enemy type (red) for dangerous stars
        name: star.name,
        color: '#fbbf24', // Amber for stars
      });
    }

    // Add black holes as POIs
    for (const blackHole of this.blackHoles) {
      pois.push({
        x: blackHole.x,
        y: blackHole.y,
        type: 'gate', // Using gate type for black holes (they teleport you)
        name: blackHole.name,
        color: '#a855f7', // Purple for black holes
      });
    }

    return pois;
  }

  /**
   * Get all planets
   */
  public getPlanets(): Planet[] {
    return [...this.planets];
  }

  /**
   * Get all stars
   */
  public getStars(): Star[] {
    return [...this.stars];
  }

  /**
   * Get all black holes
   */
  public getBlackHoles(): BlackHole[] {
    return [...this.blackHoles];
  }

  /**
   * Get a planet by ID
   */
  public getPlanetById(id: string): Planet | undefined {
    return this.planets.find((p) => p.id === id);
  }

  /**
   * Get a star by ID
   */
  public getStarById(id: string): Star | undefined {
    return this.stars.find((s) => s.id === id);
  }

  /**
   * Get a black hole by ID
   */
  public getBlackHoleById(id: string): BlackHole | undefined {
    return this.blackHoles.find((b) => b.id === id);
  }

  /**
   * Find nearest planet to a position
   */
  public getNearestPlanet(x: number, y: number): { planet: Planet; distance: number } | null {
    if (this.planets.length === 0) return null;

    let nearest = this.planets[0];
    let nearestDist = nearest.distanceTo(x, y);

    for (let i = 1; i < this.planets.length; i++) {
      const dist = this.planets[i].distanceTo(x, y);
      if (dist < nearestDist) {
        nearest = this.planets[i];
        nearestDist = dist;
      }
    }

    return { planet: nearest, distance: nearestDist };
  }

  /**
   * Find nearest star to a position
   */
  public getNearestStar(x: number, y: number): { star: Star; distance: number } | null {
    if (this.stars.length === 0) return null;

    let nearest = this.stars[0];
    let nearestDist = nearest.distanceTo(x, y);

    for (let i = 1; i < this.stars.length; i++) {
      const dist = this.stars[i].distanceTo(x, y);
      if (dist < nearestDist) {
        nearest = this.stars[i];
        nearestDist = dist;
      }
    }

    return { star: nearest, distance: nearestDist };
  }

  /**
   * Find nearest black hole to a position
   */
  public getNearestBlackHole(
    x: number,
    y: number
  ): { blackHole: BlackHole; distance: number } | null {
    if (this.blackHoles.length === 0) return null;

    let nearest = this.blackHoles[0];
    let nearestDist = nearest.distanceTo(x, y);

    for (let i = 1; i < this.blackHoles.length; i++) {
      const dist = this.blackHoles[i].distanceTo(x, y);
      if (dist < nearestDist) {
        nearest = this.blackHoles[i];
        nearestDist = dist;
      }
    }

    return { blackHole: nearest, distance: nearestDist };
  }

  /**
   * Get count of all celestial bodies
   */
  public getCounts(): { planets: number; stars: number; blackHoles: number; total: number } {
    return {
      planets: this.planets.length,
      stars: this.stars.length,
      blackHoles: this.blackHoles.length,
      total: this.planets.length + this.stars.length + this.blackHoles.length,
    };
  }
}
