/**
 * Zone definitions for the game world
 * Zones define distinct areas with different danger levels, resources, and enemies
 */

export interface Zone {
  id: string;
  name: string;
  dangerLevel: 1 | 2 | 3 | 4;
  bounds: { x: number; y: number; width: number; height: number };
  backgroundColor: string;
  resourceMultiplier: number;
  priceMultiplier: number;
  enemySpawnRate: number;
  maxEnemies: number;
  description: string;
}

/**
 * Safe Zone - Starting area with no enemies
 * Located at world origin, provides a safe haven for new players
 */
export const SAFE_ZONE: Zone = {
  id: 'safe_zone',
  name: 'Safe Zone',
  dangerLevel: 1,
  bounds: { x: -2000, y: -2000, width: 4000, height: 4000 },
  backgroundColor: '#0a0a12',
  resourceMultiplier: 1.0,
  priceMultiplier: 1.0,
  enemySpawnRate: 0,
  maxEnemies: 0,
  description: 'A protected sector with standard resources and no hostile activity.',
};

/**
 * Frontier Zone - Dangerous area with better resources and pirates
 * Located beyond the Safe Zone, offers risk/reward gameplay
 */
export const FRONTIER_ZONE: Zone = {
  id: 'frontier',
  name: 'Frontier',
  dangerLevel: 2,
  bounds: { x: -6000, y: -6000, width: 12000, height: 12000 },
  backgroundColor: '#0c0812',
  resourceMultiplier: 1.5,
  priceMultiplier: 1.5,
  enemySpawnRate: 1,
  maxEnemies: 5,
  description: 'Uncharted territory with rich asteroid fields. Pirates patrol these sectors.',
};

/**
 * All zones in the game, ordered by danger level
 */
export const ZONES: Zone[] = [SAFE_ZONE, FRONTIER_ZONE];

/**
 * Get a zone by its ID
 */
export function getZoneById(id: string): Zone | undefined {
  return ZONES.find((zone) => zone.id === id);
}

/**
 * Get the zone at a given world position
 * Checks zones from most specific (highest danger) to least specific
 */
export function getZoneAtPosition(x: number, y: number): Zone {
  // Check Safe Zone first (inner zone takes priority)
  if (isPointInZone(x, y, SAFE_ZONE)) {
    return SAFE_ZONE;
  }

  // Default to Frontier for anything outside Safe Zone
  return FRONTIER_ZONE;
}

/**
 * Check if a point is within a zone's bounds
 */
export function isPointInZone(x: number, y: number, zone: Zone): boolean {
  const { bounds } = zone;
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/**
 * Get the distance to the nearest zone boundary
 * Positive = inside zone, Negative = outside zone
 */
export function getDistanceToZoneBoundary(x: number, y: number, zone: Zone): number {
  const { bounds } = zone;
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const centerX = bounds.x + halfWidth;
  const centerY = bounds.y + halfHeight;

  const dx = Math.abs(x - centerX) - halfWidth;
  const dy = Math.abs(y - centerY) - halfHeight;

  // Negative values mean inside the zone
  if (dx <= 0 && dy <= 0) {
    return -Math.min(Math.abs(dx), Math.abs(dy));
  }

  // Outside the zone
  if (dx > 0 && dy > 0) {
    return Math.sqrt(dx * dx + dy * dy);
  }

  return Math.max(dx, dy);
}

/**
 * Get zones adjacent to a given zone (for zone transitions)
 */
export function getAdjacentZones(zone: Zone): Zone[] {
  return ZONES.filter((z) => z.id !== zone.id);
}
