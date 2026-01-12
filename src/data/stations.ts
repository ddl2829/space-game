/**
 * Station definitions for the trading system
 */

export interface StationConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  dockingRange: number;
  initialSupply: Record<string, number>;
}

/**
 * Default stations in the game world
 */
export const STATIONS: StationConfig[] = [
  {
    id: 'station_alpha',
    name: 'Alpha Station',
    x: 500,
    y: -300,
    size: 80,
    dockingRange: 150,
    initialSupply: {
      iron: 50,
      titanium: 20,
      platinum: 5,
    },
  },
  {
    id: 'station_beta',
    name: 'Beta Outpost',
    x: -800,
    y: 600,
    size: 60,
    dockingRange: 120,
    initialSupply: {
      iron: 30,
      titanium: 40,
      platinum: 10,
    },
  },
];

/**
 * Get a station config by ID
 */
export function getStationById(id: string): StationConfig | undefined {
  return STATIONS.find((s) => s.id === id);
}

/**
 * Get all station configs
 */
export function getAllStations(): StationConfig[] {
  return [...STATIONS];
}
