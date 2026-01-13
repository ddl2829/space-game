/**
 * Celestial body configurations - now uses chunk-based procedural generation
 * This file provides compatibility with existing code while using the new WorldGenerator
 */

import type { PlanetConfig } from '../game/entities/Planet';
import type { StarConfig } from '../game/entities/Star';
import type { BlackHoleConfig } from '../game/entities/BlackHole';
import { getWorldGenerator, type WarpGateConfig } from '../utils/WorldGenerator';

// Type for zone celestial data
interface ZoneCelestials {
  planets: PlanetConfig[];
  stars: StarConfig[];
  blackHoles: BlackHoleConfig[];
}

// Generate initial world content (starter area only)
const worldGen = getWorldGenerator();
const starterChunk = worldGen.getChunk(0, 0);

/**
 * Safe Zone Celestials - starter area near origin
 */
export const SAFE_ZONE_CELESTIALS: ZoneCelestials = {
  planets: starterChunk.planets,
  stars: starterChunk.stars,
  blackHoles: starterChunk.blackHoles,
};

/**
 * Frontier Zone Celestials - empty initially, populated dynamically
 */
export const FRONTIER_CELESTIALS: ZoneCelestials = {
  planets: [],
  stars: [],
  blackHoles: [],
};

/**
 * All celestial configurations by zone ID
 */
export const CELESTIALS_BY_ZONE: Record<string, ZoneCelestials> = {
  safe_zone: SAFE_ZONE_CELESTIALS,
  frontier: FRONTIER_CELESTIALS,
};

/**
 * Get celestials for a specific zone
 */
export function getCelestialsForZone(zoneId: string): ZoneCelestials {
  return (
    CELESTIALS_BY_ZONE[zoneId] || {
      planets: [],
      stars: [],
      blackHoles: [],
    }
  );
}

/**
 * Get all celestials across all zones (deprecated - use WorldGenerator.getObjectsInRange)
 */
export function getAllCelestials(): ZoneCelestials {
  const all: ZoneCelestials = {
    planets: [],
    stars: [],
    blackHoles: [],
  };

  for (const zoneConfig of Object.values(CELESTIALS_BY_ZONE)) {
    all.planets.push(...zoneConfig.planets);
    all.stars.push(...zoneConfig.stars);
    all.blackHoles.push(...zoneConfig.blackHoles);
  }

  return all;
}

/**
 * Get generated stations from starter chunk
 */
export function getGeneratedStations() {
  return starterChunk.stations;
}

/**
 * Get generated warp gates from starter chunk
 */
export function getGeneratedWarpGates(): WarpGateConfig[] {
  return starterChunk.warpGates;
}
