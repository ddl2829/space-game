/**
 * Station definitions for the trading system
 */

import { getGeneratedStations } from './celestials';

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
 * Stations generated procedurally from the world generator
 * (imported from celestials.ts to ensure same world generation)
 */
export const STATIONS: StationConfig[] = getGeneratedStations();

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
