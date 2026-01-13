/**
 * Celestial body configurations for different zones
 */

import type { PlanetConfig } from '../game/entities/Planet';
import type { StarConfig } from '../game/entities/Star';
import type { BlackHoleConfig } from '../game/entities/BlackHole';

/**
 * Safe Zone Celestials
 * - One friendly planet with orbiting moon
 * - No dangerous celestial bodies
 */
export const SAFE_ZONE_CELESTIALS = {
  planets: [
    {
      x: 800,
      y: -600,
      radius: 120,
      color: '#4a7c59', // Earth-like green
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
    } as PlanetConfig,
  ],
  stars: [] as StarConfig[],
  blackHoles: [] as BlackHoleConfig[],
};

/**
 * Frontier Zone Celestials
 * - Dangerous star with damage zone
 * - Resource-rich planet with moons
 * - Black hole for quick travel
 * - Gas giant for visual interest
 */
export const FRONTIER_CELESTIALS = {
  planets: [
    // Resource-rich rocky planet
    {
      x: 3500,
      y: -2500,
      radius: 90,
      color: '#8b6914', // Golden/amber rocky planet
      name: 'Aurelia',
      hasAtmosphere: true,
      atmosphereColor: 'rgba(255, 200, 100, 0.2)',
      surfaceDetails: 'craters',
      moons: [
        {
          radius: 15,
          orbitRadius: 150,
          orbitSpeed: 0.4,
          color: '#6b6b6b',
          startAngle: 0,
        },
        {
          radius: 12,
          orbitRadius: 220,
          orbitSpeed: 0.25,
          color: '#7a7a7a',
          startAngle: Math.PI,
        },
      ],
      orbitingStations: [],
    } as PlanetConfig,

    // Gas giant
    {
      x: -3000,
      y: 3500,
      radius: 180,
      color: '#c4956a', // Jupiter-like
      name: 'Magnus',
      hasAtmosphere: true,
      atmosphereColor: 'rgba(200, 150, 100, 0.3)',
      surfaceDetails: 'bands',
      moons: [
        {
          radius: 25,
          orbitRadius: 280,
          orbitSpeed: 0.2,
          color: '#a89078',
          startAngle: 0,
        },
        {
          radius: 18,
          orbitRadius: 350,
          orbitSpeed: 0.15,
          color: '#788090',
          startAngle: Math.PI / 2,
        },
        {
          radius: 12,
          orbitRadius: 420,
          orbitSpeed: 0.12,
          color: '#6a7080',
          startAngle: Math.PI,
        },
      ],
      orbitingStations: [],
    } as PlanetConfig,

    // Ice planet
    {
      x: -4500,
      y: -3000,
      radius: 70,
      color: '#a0c0d0', // Ice blue
      name: 'Glacius',
      hasAtmosphere: true,
      atmosphereColor: 'rgba(150, 200, 255, 0.15)',
      surfaceDetails: 'spots',
      moons: [],
      orbitingStations: [],
    } as PlanetConfig,
  ],

  stars: [
    // Dangerous red dwarf star
    {
      x: 4500,
      y: 3000,
      radius: 150,
      color: '#ff6644', // Orange-red core
      coronaColor: '#ff9966', // Orange corona
      damageRadius: 600,
      damagePerSecond: 25,
      name: 'Inferno',
    } as StarConfig,
  ],

  blackHoles: [
    // Quick travel black hole - connects two distant points
    {
      x: -4000,
      y: 0,
      radius: 50,
      pullRadius: 400,
      pullStrength: 150,
      exitX: 4000,
      exitY: 0,
      exitAngle: 0, // Exit pointing right
      name: 'Void Gate Alpha',
    } as BlackHoleConfig,

    // Return black hole
    {
      x: 4200,
      y: 200,
      radius: 45,
      pullRadius: 350,
      pullStrength: 130,
      exitX: -3800,
      exitY: 200,
      exitAngle: Math.PI, // Exit pointing left
      name: 'Void Gate Beta',
    } as BlackHoleConfig,
  ],
};

/**
 * Deep Space Celestials (for future expansion)
 * More dangerous area with multiple hazards
 */
export const DEEP_SPACE_CELESTIALS = {
  planets: [
    // Volcanic planet
    {
      x: 8000,
      y: 5000,
      radius: 100,
      color: '#8b2500', // Dark red volcanic
      name: 'Pyroclast',
      hasAtmosphere: true,
      atmosphereColor: 'rgba(255, 100, 50, 0.25)',
      surfaceDetails: 'spots',
      moons: [
        {
          radius: 18,
          orbitRadius: 180,
          orbitSpeed: 0.35,
          color: '#4a4a4a',
          startAngle: 0,
        },
      ],
      orbitingStations: [],
    } as PlanetConfig,
  ],

  stars: [
    // Binary star system
    {
      x: 7000,
      y: -6000,
      radius: 200,
      color: '#ffffff', // White hot
      coronaColor: '#aaddff', // Blue-white corona
      damageRadius: 800,
      damagePerSecond: 40,
      name: 'Solaris Major',
    } as StarConfig,

    // Companion star
    {
      x: 7500,
      y: -5700,
      radius: 100,
      color: '#ffaa44', // Yellow-orange
      coronaColor: '#ffcc88',
      damageRadius: 400,
      damagePerSecond: 20,
      name: 'Solaris Minor',
    } as StarConfig,
  ],

  blackHoles: [
    // Massive black hole
    {
      x: 9000,
      y: 0,
      radius: 80,
      pullRadius: 600,
      pullStrength: 250,
      exitX: -2000,
      exitY: -2000, // Spits you back near safe zone
      exitAngle: -Math.PI / 4,
      name: 'The Maw',
    } as BlackHoleConfig,
  ],
};

/**
 * All celestial configurations by zone ID
 */
export const CELESTIALS_BY_ZONE: Record<
  string,
  {
    planets: PlanetConfig[];
    stars: StarConfig[];
    blackHoles: BlackHoleConfig[];
  }
> = {
  safe_zone: SAFE_ZONE_CELESTIALS,
  frontier: FRONTIER_CELESTIALS,
  deep_space: DEEP_SPACE_CELESTIALS,
};

/**
 * Get celestials for a specific zone
 */
export function getCelestialsForZone(zoneId: string): {
  planets: PlanetConfig[];
  stars: StarConfig[];
  blackHoles: BlackHoleConfig[];
} {
  return (
    CELESTIALS_BY_ZONE[zoneId] || {
      planets: [],
      stars: [],
      blackHoles: [],
    }
  );
}

/**
 * Get all celestials across all zones
 */
export function getAllCelestials(): {
  planets: PlanetConfig[];
  stars: StarConfig[];
  blackHoles: BlackHoleConfig[];
} {
  const all = {
    planets: [] as PlanetConfig[],
    stars: [] as StarConfig[],
    blackHoles: [] as BlackHoleConfig[],
  };

  for (const zoneConfig of Object.values(CELESTIALS_BY_ZONE)) {
    all.planets.push(...zoneConfig.planets);
    all.stars.push(...zoneConfig.stars);
    all.blackHoles.push(...zoneConfig.blackHoles);
  }

  return all;
}
