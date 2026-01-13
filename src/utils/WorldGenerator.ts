/**
 * Procedural world generator with infinite chunk-based generation and random name system
 */

import type { PlanetConfig, MoonConfig } from '../game/entities/Planet';
import type { StarConfig } from '../game/entities/Star';
import type { BlackHoleConfig } from '../game/entities/BlackHole';
import type { StationConfig } from '../data/stations';
import type { Zone } from '../data/zones';
import { getZoneAtPosition } from '../data/zones';

// ============================================================================
// SYLLABLE-BASED NAME GENERATOR
// ============================================================================

const NAME_SYLLABLES = {
  // Prefixes - strong consonant starts
  prefix: [
    'Ax', 'Ber', 'Cal', 'Dra', 'El', 'Fer', 'Gal', 'Har', 'Ix', 'Jor',
    'Kar', 'Lor', 'Mor', 'Nor', 'Or', 'Pra', 'Qua', 'Ras', 'Sol', 'Tar',
    'Ul', 'Vor', 'Wyn', 'Xan', 'Yor', 'Zel', 'Aur', 'Bel', 'Cyr', 'Dor',
    'Eph', 'Fal', 'Grim', 'Hel', 'Ith', 'Jan', 'Kry', 'Lem', 'Mal', 'Nex',
    'Ob', 'Pol', 'Rin', 'Syr', 'Thr', 'Ur', 'Val', 'Wex', 'Xen', 'Zar',
  ],

  // Middle syllables - vowel-consonant combinations
  middle: [
    'an', 'ar', 'el', 'en', 'er', 'ia', 'il', 'in', 'ir', 'on',
    'or', 'ul', 'um', 'us', 'ax', 'ex', 'ix', 'ox', 'ux', 'ae',
    'al', 'as', 'at', 'au', 'ea', 'ed', 'em', 'es', 'et', 'ia',
    'ic', 'id', 'ig', 'im', 'is', 'oc', 'od', 'og', 'om', 'os',
  ],

  // Suffixes - endings that sound celestial
  suffix: [
    'a', 'ar', 'ax', 'el', 'en', 'er', 'ia', 'ic', 'id', 'in',
    'ion', 'is', 'ius', 'ix', 'on', 'or', 'os', 'um', 'un', 'us',
    'yx', 'ax', 'ex', 'ox', 'ux', 'ae', 'ai', 'ei', 'oi', 'ui',
    'orn', 'oth', 'ith', 'ath', 'eth', 'ard', 'ald', 'old', 'eld', 'ild',
  ],

  // Station-specific suffixes
  stationSuffix: [
    ' Station', ' Outpost', ' Hub', ' Depot', ' Port', ' Haven',
    ' Dock', ' Terminal', ' Base', ' Platform', ' Waypoint', ' Anchorage',
  ],

  // Star-specific suffixes
  starSuffix: [
    '', ' Prime', ' Major', ' Minor', ' Alpha', ' Beta',
  ],

  // Black hole-specific prefixes
  blackHolePrefix: [
    'Void ', 'The ', '', 'Dark ', 'Shadow ', 'Abyss ',
  ],

  // Black hole-specific suffixes
  blackHoleSuffix: [
    ' Gate', ' Maw', ' Rift', ' Vortex', ' Eye', ' Throat', ' Portal', '',
  ],
};

// Planet type themes for color/atmosphere correlation
const PLANET_THEMES = {
  rocky: {
    colors: ['#8b6914', '#a67c52', '#7a5230', '#9c7653', '#6b4423'],
    atmosphereColors: ['rgba(255, 200, 100, 0.2)', 'rgba(200, 150, 100, 0.15)', 'rgba(180, 140, 90, 0.2)'],
    surfaceDetails: ['craters', 'spots'] as const,
  },
  gas: {
    colors: ['#c4956a', '#d4a574', '#a08060', '#b89878', '#c8a880'],
    atmosphereColors: ['rgba(200, 150, 100, 0.3)', 'rgba(220, 180, 140, 0.25)', 'rgba(180, 140, 100, 0.3)'],
    surfaceDetails: ['bands'] as const,
  },
  ice: {
    colors: ['#a0c0d0', '#90b0c8', '#80a0b8', '#b0d0e0', '#c0e0f0'],
    atmosphereColors: ['rgba(150, 200, 255, 0.15)', 'rgba(180, 220, 255, 0.2)', 'rgba(140, 190, 240, 0.15)'],
    surfaceDetails: ['spots', 'craters'] as const,
  },
  volcanic: {
    colors: ['#8b4513', '#a52a2a', '#b22222', '#cd5c5c', '#dc143c'],
    atmosphereColors: ['rgba(255, 100, 50, 0.25)', 'rgba(255, 80, 30, 0.2)', 'rgba(200, 60, 20, 0.25)'],
    surfaceDetails: ['spots', 'craters'] as const,
  },
  earthlike: {
    colors: ['#4a7c59', '#3d6b4f', '#5a8c69', '#6b9c79', '#3a5c49'],
    atmosphereColors: ['rgba(100, 180, 255, 0.25)', 'rgba(120, 200, 255, 0.2)', 'rgba(80, 160, 240, 0.25)'],
    surfaceDetails: ['spots', 'bands'] as const,
  },
  barren: {
    colors: ['#666666', '#888888', '#555555', '#777777', '#444444'],
    atmosphereColors: [],
    surfaceDetails: ['craters'] as const,
  },
};

// Star color themes
const STAR_THEMES = {
  red: { color: '#ff6644', coronaColor: '#ff9966' },
  orange: { color: '#ff8844', coronaColor: '#ffaa66' },
  yellow: { color: '#ffcc44', coronaColor: '#ffdd66' },
  white: { color: '#ffffff', coronaColor: '#eeeeff' },
  blue: { color: '#4466ff', coronaColor: '#6688ff' },
};

// ============================================================================
// SEEDED RNG
// ============================================================================

function createRNG(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash function for chunk coordinates to seed
function hashChunkCoords(chunkX: number, chunkY: number, baseSeed: number): number {
  // Combine coordinates with base seed using prime numbers
  let hash = baseSeed;
  hash = ((hash << 5) - hash + chunkX * 73856093) | 0;
  hash = ((hash << 5) - hash + chunkY * 19349663) | 0;
  return Math.abs(hash);
}

// ============================================================================
// CHUNK CONFIGURATION
// ============================================================================

const CHUNK_SIZE = 4000; // World units per chunk
const MIN_SPACING = 800; // Minimum distance between objects in a chunk

// Density settings per zone
const ZONE_DENSITY = {
  safe_zone: {
    planets: { min: 0, max: 1 },
    stars: { min: 0, max: 0 },
    blackHoles: { min: 0, max: 0 },
    stations: { min: 0, max: 1 },
    warpGates: { min: 0, max: 0 },
  },
  frontier: {
    planets: { min: 0, max: 2 },
    stars: { min: 0, max: 1 },
    blackHoles: { min: 0, max: 1 },
    stations: { min: 0, max: 1 },
    warpGates: { min: 0, max: 1 },
  },
  deep_space: {
    planets: { min: 0, max: 2 },
    stars: { min: 0, max: 1 },
    blackHoles: { min: 0, max: 1 },
    stations: { min: 0, max: 1 },
    warpGates: { min: 0, max: 1 },
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface WarpGateConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  exitX: number;
  exitY: number;
  size: number;
  interactionRadius: number;
}

interface PlacedObject {
  x: number;
  y: number;
  radius: number;
  name: string;
}

export interface ChunkData {
  chunkX: number;
  chunkY: number;
  planets: PlanetConfig[];
  stars: StarConfig[];
  blackHoles: BlackHoleConfig[];
  stations: StationConfig[];
  warpGates: WarpGateConfig[];
  generated: boolean;
}

// ============================================================================
// NAME GENERATOR
// ============================================================================

export class NameGenerator {
  private rng: () => number;
  private usedNames: Set<string> = new Set();

  constructor(seed: number) {
    this.rng = createRNG(seed);
  }

  private choice<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  private generateBaseName(syllableCount: number = 2): string {
    let name = this.choice(NAME_SYLLABLES.prefix);

    for (let i = 0; i < syllableCount - 1; i++) {
      if (this.rng() > 0.5) {
        name += this.choice(NAME_SYLLABLES.middle);
      }
    }

    name += this.choice(NAME_SYLLABLES.suffix);
    return name;
  }

  generatePlanetName(): string {
    let attempts = 0;
    let name: string;

    do {
      const syllables = 1 + Math.floor(this.rng() * 2); // 1-2 syllables
      name = this.generateBaseName(syllables);

      // Occasionally add a number suffix for variety
      if (this.rng() > 0.85) {
        name += ' ' + (Math.floor(this.rng() * 9) + 1);
      }

      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  generateStarName(): string {
    let attempts = 0;
    let name: string;

    do {
      name = this.generateBaseName(1) + this.choice(NAME_SYLLABLES.starSuffix);
      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  generateBlackHoleName(): string {
    let attempts = 0;
    let name: string;

    do {
      const prefix = this.choice(NAME_SYLLABLES.blackHolePrefix);
      const base = this.generateBaseName(1);
      const suffix = this.choice(NAME_SYLLABLES.blackHoleSuffix);
      name = prefix + base + suffix;
      name = name.trim();
      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  generateStationName(): string {
    let attempts = 0;
    let name: string;

    do {
      name = this.generateBaseName(1) + this.choice(NAME_SYLLABLES.stationSuffix);
      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  generateWarpGateName(): string {
    let attempts = 0;
    let name: string;

    do {
      name = 'Gate ' + this.generateBaseName(1);
      attempts++;
    } while (this.usedNames.has(name) && attempts < 50);

    this.usedNames.add(name);
    return name;
  }

  reset(seed: number): void {
    this.rng = createRNG(seed);
    this.usedNames.clear();
  }
}

// ============================================================================
// CHUNK GENERATOR
// ============================================================================

export class ChunkGenerator {
  private rng: () => number;
  private nameGen: NameGenerator;
  private placedObjects: PlacedObject[] = [];
  private chunkX: number;
  private chunkY: number;

  constructor(chunkX: number, chunkY: number, seed: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    const chunkSeed = hashChunkCoords(chunkX, chunkY, seed);
    this.rng = createRNG(chunkSeed);
    this.nameGen = new NameGenerator(chunkSeed);
  }

  private choice<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  private randomRange(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.randomRange(min, max + 1));
  }

  private getChunkBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: this.chunkX * CHUNK_SIZE,
      maxX: (this.chunkX + 1) * CHUNK_SIZE,
      minY: this.chunkY * CHUNK_SIZE,
      maxY: (this.chunkY + 1) * CHUNK_SIZE,
    };
  }

  private isValidPosition(x: number, y: number, radius: number): boolean {
    // Check against safe zone (no generation near origin except in chunk 0,0)
    if (this.chunkX === 0 && this.chunkY === 0) {
      const distFromOrigin = Math.sqrt(x * x + y * y);
      if (distFromOrigin < 400) {
        return false; // Protect player spawn area
      }
    }

    for (const obj of this.placedObjects) {
      const dx = x - obj.x;
      const dy = y - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = MIN_SPACING + radius + obj.radius;
      if (dist < minDist) {
        return false;
      }
    }
    return true;
  }

  private findValidPosition(
    radius: number,
    maxAttempts: number = 50
  ): { x: number; y: number } | null {
    const bounds = this.getChunkBounds();
    const padding = radius + MIN_SPACING / 2;

    for (let i = 0; i < maxAttempts; i++) {
      const x = bounds.minX + padding + this.rng() * (bounds.maxX - bounds.minX - padding * 2);
      const y = bounds.minY + padding + this.rng() * (bounds.maxY - bounds.minY - padding * 2);
      if (this.isValidPosition(x, y, radius)) {
        return { x, y };
      }
    }
    return null;
  }

  private registerObject(x: number, y: number, radius: number, name: string): void {
    this.placedObjects.push({ x, y, radius, name });
  }

  private getZoneForChunk(): Zone {
    const centerX = (this.chunkX + 0.5) * CHUNK_SIZE;
    const centerY = (this.chunkY + 0.5) * CHUNK_SIZE;
    return getZoneAtPosition(centerX, centerY);
  }

  private getDensityConfig(): typeof ZONE_DENSITY['safe_zone'] {
    const zone = this.getZoneForChunk();
    return ZONE_DENSITY[zone.id as keyof typeof ZONE_DENSITY] || ZONE_DENSITY.frontier;
  }

  generatePlanet(): PlanetConfig | null {
    const radius = this.randomInt(50, 180);
    const pos = this.findValidPosition(radius);
    if (!pos) return null;

    const name = this.nameGen.generatePlanetName();
    this.registerObject(pos.x, pos.y, radius, name);

    // Select theme based on RNG
    const themeKeys = Object.keys(PLANET_THEMES) as (keyof typeof PLANET_THEMES)[];
    const theme = PLANET_THEMES[this.choice(themeKeys)];

    // Generate moons
    const moons: MoonConfig[] = [];
    const moonCount = this.rng() > 0.5 ? this.randomInt(0, 3) : 0;
    for (let i = 0; i < moonCount; i++) {
      moons.push({
        radius: this.randomInt(10, 25),
        orbitRadius: radius + 80 + i * 70,
        orbitSpeed: this.randomRange(0.1, 0.4),
        color: `hsl(${this.randomInt(0, 360)}, ${this.randomInt(10, 30)}%, ${this.randomInt(40, 60)}%)`,
        startAngle: this.rng() * Math.PI * 2,
      });
    }

    return {
      id: `planet_${this.chunkX}_${this.chunkY}_${name.replace(/\s+/g, '_').toLowerCase()}`,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      radius,
      color: this.choice(theme.colors),
      name,
      hasAtmosphere: theme.atmosphereColors.length > 0 && this.rng() > 0.3,
      atmosphereColor: theme.atmosphereColors.length > 0
        ? this.choice(theme.atmosphereColors)
        : 'rgba(100, 150, 255, 0.3)',
      surfaceDetails: this.choice([...theme.surfaceDetails]),
      moons,
      orbitingStations: [],
    };
  }

  generateStar(): StarConfig | null {
    const radius = this.randomInt(100, 250);
    const damageRadius = radius + this.randomInt(300, 500);
    const totalRadius = damageRadius;
    const pos = this.findValidPosition(totalRadius);
    if (!pos) return null;

    const name = this.nameGen.generateStarName();
    this.registerObject(pos.x, pos.y, totalRadius, name);

    const themeKeys = Object.keys(STAR_THEMES) as (keyof typeof STAR_THEMES)[];
    const theme = STAR_THEMES[this.choice(themeKeys)];

    return {
      id: `star_${this.chunkX}_${this.chunkY}_${name.replace(/\s+/g, '_').toLowerCase()}`,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      radius,
      color: theme.color,
      coronaColor: theme.coronaColor,
      damageRadius,
      damagePerSecond: this.randomInt(20, 50),
      name,
    };
  }

  generateBlackHole(): BlackHoleConfig | null {
    const radius = this.randomInt(40, 80);
    const pullRadius = radius + this.randomInt(250, 450);
    const totalRadius = pullRadius;
    const pos = this.findValidPosition(totalRadius);
    if (!pos) return null;

    const name = this.nameGen.generateBlackHoleName();
    this.registerObject(pos.x, pos.y, totalRadius, name);

    // Generate random exit point (teleport to a distant location)
    const exitAngle = this.rng() * Math.PI * 2;
    const exitDistance = this.randomInt(3000, 8000);
    const exitX = pos.x + Math.cos(exitAngle) * exitDistance;
    const exitY = pos.y + Math.sin(exitAngle) * exitDistance;

    return {
      id: `blackhole_${this.chunkX}_${this.chunkY}_${name.replace(/\s+/g, '_').toLowerCase()}`,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      radius,
      pullRadius,
      pullStrength: this.randomInt(100, 200),
      exitX: Math.round(exitX),
      exitY: Math.round(exitY),
      exitAngle: this.rng() * Math.PI * 2,
      name,
    };
  }

  generateStation(): StationConfig | null {
    const size = this.randomInt(50, 90);
    const pos = this.findValidPosition(size);
    if (!pos) return null;

    const name = this.nameGen.generateStationName();
    this.registerObject(pos.x, pos.y, size, name);

    // Generate random supply based on distance from origin
    const distFromOrigin = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const supplyMultiplier = 1 + distFromOrigin / 5000;

    return {
      id: `station_${this.chunkX}_${this.chunkY}_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      size,
      dockingRange: size + 60,
      initialSupply: {
        iron: Math.round(this.randomInt(20, 60) * supplyMultiplier),
        titanium: Math.round(this.randomInt(30, 70) * supplyMultiplier),
        platinum: Math.round(this.randomInt(10, 30) * supplyMultiplier),
        crystal: Math.round(this.randomInt(5, 20) * supplyMultiplier),
      },
    };
  }

  generateWarpGate(): WarpGateConfig | null {
    const size = 80;
    const pos = this.findValidPosition(size + 50);
    if (!pos) return null;

    const name = this.nameGen.generateWarpGateName();
    this.registerObject(pos.x, pos.y, size, name);

    // Generate exit point (distant random location)
    const exitAngle = this.rng() * Math.PI * 2;
    const exitDistance = this.randomInt(5000, 15000);
    const exitX = Math.round(pos.x + Math.cos(exitAngle) * exitDistance);
    const exitY = Math.round(pos.y + Math.sin(exitAngle) * exitDistance);

    return {
      id: `warpgate_${this.chunkX}_${this.chunkY}_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      exitX,
      exitY,
      size,
      interactionRadius: size + 50,
    };
  }

  generate(): ChunkData {
    const density = this.getDensityConfig();
    const data: ChunkData = {
      chunkX: this.chunkX,
      chunkY: this.chunkY,
      planets: [],
      stars: [],
      blackHoles: [],
      stations: [],
      warpGates: [],
      generated: true,
    };

    // Generate objects based on density settings
    const planetCount = this.randomInt(density.planets.min, density.planets.max);
    for (let i = 0; i < planetCount; i++) {
      const planet = this.generatePlanet();
      if (planet) data.planets.push(planet);
    }

    const starCount = this.randomInt(density.stars.min, density.stars.max);
    for (let i = 0; i < starCount; i++) {
      const star = this.generateStar();
      if (star) data.stars.push(star);
    }

    const blackHoleCount = this.randomInt(density.blackHoles.min, density.blackHoles.max);
    for (let i = 0; i < blackHoleCount; i++) {
      const blackHole = this.generateBlackHole();
      if (blackHole) data.blackHoles.push(blackHole);
    }

    const stationCount = this.randomInt(density.stations.min, density.stations.max);
    for (let i = 0; i < stationCount; i++) {
      const station = this.generateStation();
      if (station) data.stations.push(station);
    }

    const warpGateCount = this.randomInt(density.warpGates.min, density.warpGates.max);
    for (let i = 0; i < warpGateCount; i++) {
      const warpGate = this.generateWarpGate();
      if (warpGate) data.warpGates.push(warpGate);
    }

    return data;
  }
}

// ============================================================================
// WORLD GENERATOR (MANAGES CHUNKS)
// ============================================================================

export class WorldGenerator {
  private seed: number;
  private chunks: Map<string, ChunkData> = new Map();
  private loadedChunks: Set<string> = new Set();
  private starterContentGenerated: boolean = false;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  private chunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  private worldToChunk(worldX: number, worldY: number): { chunkX: number; chunkY: number } {
    return {
      chunkX: Math.floor(worldX / CHUNK_SIZE),
      chunkY: Math.floor(worldY / CHUNK_SIZE),
    };
  }

  /**
   * Generate starter content for new games (guaranteed station near spawn)
   */
  private generateStarterContent(): ChunkData {
    const data: ChunkData = {
      chunkX: 0,
      chunkY: 0,
      planets: [],
      stars: [],
      blackHoles: [],
      stations: [],
      warpGates: [],
      generated: true,
    };

    // Guaranteed starter station near spawn
    data.stations.push({
      id: 'station_alpha',
      name: 'Alpha Station',
      x: 600,
      y: -400,
      size: 80,
      dockingRange: 150,
      initialSupply: { iron: 50, titanium: 20, platinum: 5 },
    });

    // One friendly planet in safe zone
    data.planets.push({
      id: 'planet_haven_prime',
      x: -800,
      y: 600,
      radius: 120,
      color: '#4a7c59',
      name: 'Haven Prime',
      hasAtmosphere: true,
      atmosphereColor: 'rgba(100, 180, 255, 0.25)',
      surfaceDetails: 'spots',
      moons: [
        {
          radius: 20,
          orbitRadius: 200,
          orbitSpeed: 0.3,
          color: '#8a8a8a',
          startAngle: 0,
        },
      ],
      orbitingStations: [],
    });

    // Second station in different area
    data.stations.push({
      id: 'station_beta',
      name: 'Beta Outpost',
      x: -900,
      y: -600,
      size: 60,
      dockingRange: 120,
      initialSupply: { iron: 30, titanium: 40, platinum: 10 },
    });

    return data;
  }

  /**
   * Get or generate a chunk
   */
  getChunk(chunkX: number, chunkY: number): ChunkData {
    const key = this.chunkKey(chunkX, chunkY);

    // Return cached chunk if available
    if (this.chunks.has(key)) {
      return this.chunks.get(key)!;
    }

    // Generate starter content for origin chunk
    if (chunkX === 0 && chunkY === 0 && !this.starterContentGenerated) {
      this.starterContentGenerated = true;
      const starterData = this.generateStarterContent();
      this.chunks.set(key, starterData);
      return starterData;
    }

    // Generate new chunk
    const generator = new ChunkGenerator(chunkX, chunkY, this.seed);
    const chunkData = generator.generate();
    this.chunks.set(key, chunkData);

    return chunkData;
  }

  /**
   * Get all chunks within render distance of a position
   */
  getChunksInRange(
    worldX: number,
    worldY: number,
    range: number = CHUNK_SIZE * 2
  ): ChunkData[] {
    const center = this.worldToChunk(worldX, worldY);
    const chunkRange = Math.ceil(range / CHUNK_SIZE);
    const chunks: ChunkData[] = [];

    for (let dx = -chunkRange; dx <= chunkRange; dx++) {
      for (let dy = -chunkRange; dy <= chunkRange; dy++) {
        const chunkX = center.chunkX + dx;
        const chunkY = center.chunkY + dy;
        chunks.push(this.getChunk(chunkX, chunkY));
      }
    }

    return chunks;
  }

  /**
   * Get all objects within range of a position (aggregated from chunks)
   */
  getObjectsInRange(
    worldX: number,
    worldY: number,
    range: number = CHUNK_SIZE * 2
  ): {
    planets: PlanetConfig[];
    stars: StarConfig[];
    blackHoles: BlackHoleConfig[];
    stations: StationConfig[];
    warpGates: WarpGateConfig[];
  } {
    const chunks = this.getChunksInRange(worldX, worldY, range);
    const result = {
      planets: [] as PlanetConfig[],
      stars: [] as StarConfig[],
      blackHoles: [] as BlackHoleConfig[],
      stations: [] as StationConfig[],
      warpGates: [] as WarpGateConfig[],
    };

    for (const chunk of chunks) {
      result.planets.push(...chunk.planets);
      result.stars.push(...chunk.stars);
      result.blackHoles.push(...chunk.blackHoles);
      result.stations.push(...chunk.stations);
      result.warpGates.push(...chunk.warpGates);
    }

    return result;
  }

  /**
   * Update loaded chunks based on player position (for streaming)
   */
  updateLoadedChunks(worldX: number, worldY: number, loadRange: number = CHUNK_SIZE * 3): string[] {
    const center = this.worldToChunk(worldX, worldY);
    const chunkRange = Math.ceil(loadRange / CHUNK_SIZE);
    const newLoadedChunks: Set<string> = new Set();
    const newlyLoaded: string[] = [];

    for (let dx = -chunkRange; dx <= chunkRange; dx++) {
      for (let dy = -chunkRange; dy <= chunkRange; dy++) {
        const chunkX = center.chunkX + dx;
        const chunkY = center.chunkY + dy;
        const key = this.chunkKey(chunkX, chunkY);
        newLoadedChunks.add(key);

        if (!this.loadedChunks.has(key)) {
          newlyLoaded.push(key);
          this.getChunk(chunkX, chunkY); // Ensure chunk is generated
        }
      }
    }

    this.loadedChunks = newLoadedChunks;
    return newlyLoaded;
  }

  /**
   * Check if a position is in the safe zone (starter area)
   */
  isInSafeZone(worldX: number, worldY: number): boolean {
    return getZoneAtPosition(worldX, worldY).id === 'safe_zone';
  }

  /**
   * Get the zone at a position
   */
  getZoneAt(worldX: number, worldY: number): Zone {
    return getZoneAtPosition(worldX, worldY);
  }

  /**
   * Reset the generator with a new seed
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed;
    }
    this.chunks.clear();
    this.loadedChunks.clear();
    this.starterContentGenerated = false;
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get chunk size
   */
  static getChunkSize(): number {
    return CHUNK_SIZE;
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

export const DEFAULT_WORLD_SEED = 42;

let generatorInstance: WorldGenerator | null = null;

export function getWorldGenerator(seed: number = DEFAULT_WORLD_SEED): WorldGenerator {
  if (!generatorInstance) {
    generatorInstance = new WorldGenerator(seed);
  }
  return generatorInstance;
}

export function resetWorldGenerator(seed?: number): WorldGenerator {
  generatorInstance = new WorldGenerator(seed ?? DEFAULT_WORLD_SEED);
  return generatorInstance;
}
