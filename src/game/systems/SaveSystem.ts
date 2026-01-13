/**
 * Save system - handles persistence of game state to localStorage
 */

import type { Inventory } from '../components/Inventory';
import type { ShipStats, UpgradeState } from '../components/ShipStats';
import type { Mission } from '../../data/missions';

/**
 * Current save format version
 * Increment when making breaking changes to save structure
 */
const SAVE_VERSION = 1;

/**
 * Storage key for the save data
 */
const STORAGE_KEY = 'space-game-save';

/**
 * Structure of saved game data
 */
export interface SaveData {
  version: number;
  timestamp: number;
  credits: number;
  inventory: Array<{ resourceId: string; quantity: number }>;
  upgrades: UpgradeState;
  shipPosition: { x: number; y: number };
  shipRotation: number;
  playTime: number; // total seconds played
  discoveredLocations: string[]; // IDs of discovered POIs (stations, planets, etc.)
  missions?: {
    activeMissions: Mission[];
    availableMissions: Record<string, Mission[]>;
  };
}

/**
 * Events emitted by the save system
 */
export type SaveSystemEvent =
  | { type: 'save-complete'; timestamp: number }
  | { type: 'load-complete'; data: SaveData }
  | { type: 'save-error'; error: string }
  | { type: 'load-error'; error: string }
  | { type: 'save-cleared' };

export type SaveSystemEventHandler = (event: SaveSystemEvent) => void;

/**
 * Interface for objects that can provide position data
 */
export interface Positionable {
  position: { x: number; y: number };
  rotation: number;
}

/**
 * Manages game state persistence
 */
export class SaveSystem {
  private inventory: Inventory;
  private shipStats: ShipStats;
  private ship: Positionable | null = null;
  private eventHandlers: SaveSystemEventHandler[] = [];
  private sessionStartTime: number = Date.now();
  private previousPlayTime: number = 0;
  private autoSaveInterval: number | null = null;
  private discoveredLocations: Set<string> = new Set();
  private missionSystem: { getSaveData: () => { activeMissions: Mission[]; availableMissions: Record<string, Mission[]> }; loadSaveData: (data: { activeMissions: Mission[]; availableMissions: Record<string, Mission[]> }) => void } | null = null;

  constructor(inventory: Inventory, shipStats: ShipStats) {
    this.inventory = inventory;
    this.shipStats = shipStats;
  }

  /**
   * Set mission system reference for save/load
   */
  public setMissionSystem(missionSystem: { getSaveData: () => { activeMissions: Mission[]; availableMissions: Record<string, Mission[]> }; loadSaveData: (data: { activeMissions: Mission[]; availableMissions: Record<string, Mission[]> }) => void }): void {
    this.missionSystem = missionSystem;
  }

  /**
   * Set the ship reference for position saving
   */
  public setShip(ship: Positionable): void {
    this.ship = ship;
  }

  /**
   * Save current game state to localStorage
   */
  public save(): boolean {
    try {
      const data: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        credits: this.inventory.getCredits(),
        inventory: this.inventory.getSlots(),
        upgrades: this.shipStats.getUpgradeState(),
        shipPosition: this.ship
          ? { x: this.ship.position.x, y: this.ship.position.y }
          : { x: 0, y: 0 },
        shipRotation: this.ship?.rotation ?? 0,
        playTime: this.getTotalPlayTime(),
        discoveredLocations: Array.from(this.discoveredLocations),
        missions: this.missionSystem?.getSaveData(),
      };

      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);

      console.log(`[SaveSystem] Game saved at ${new Date(data.timestamp).toLocaleTimeString()}`);

      this.emit({ type: 'save-complete', timestamp: data.timestamp });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SaveSystem] Save failed:', message);
      this.emit({ type: 'save-error', error: message });
      return false;
    }
  }

  /**
   * Load game state from localStorage
   * Returns the loaded data, or null if no save exists
   */
  public load(): SaveData | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);

      if (!json) {
        console.log('[SaveSystem] No save data found');
        return null;
      }

      const data = JSON.parse(json) as SaveData;

      // Version check
      if (data.version !== SAVE_VERSION) {
        console.warn(`[SaveSystem] Save version mismatch: ${data.version} vs ${SAVE_VERSION}`);
        // Could implement migration logic here
        return this.migrateSave(data);
      }

      // Apply loaded data
      this.applyLoadedData(data);

      console.log(`[SaveSystem] Game loaded from ${new Date(data.timestamp).toLocaleTimeString()}`);

      this.emit({ type: 'load-complete', data });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SaveSystem] Load failed:', message);
      this.emit({ type: 'load-error', error: message });
      return null;
    }
  }

  /**
   * Apply loaded data to game systems
   */
  private applyLoadedData(data: SaveData): void {
    // Restore credits (clear existing first)
    const currentCredits = this.inventory.getCredits();
    if (currentCredits > 0) {
      this.inventory.removeCredits(currentCredits);
    }
    this.inventory.addCredits(data.credits);

    // Restore inventory
    this.inventory.clear();
    for (const slot of data.inventory) {
      this.inventory.addResource(slot.resourceId, slot.quantity);
    }

    // Restore upgrades
    this.shipStats.setUpgradeState(data.upgrades);

    // Store previous play time
    this.previousPlayTime = data.playTime || 0;
    this.sessionStartTime = Date.now();

    // Restore discovered locations
    this.discoveredLocations = new Set(data.discoveredLocations || []);

    // Restore missions
    if (data.missions && this.missionSystem) {
      this.missionSystem.loadSaveData(data.missions);
    }

    // Note: Ship position is returned in the data but should be applied
    // by the caller since the ship entity may not be set yet
  }

  /**
   * Migrate old save data to current version
   */
  private migrateSave(_data: SaveData): SaveData | null {
    // For now, just return null for incompatible versions
    // Future versions could implement actual migration
    console.warn('[SaveSystem] Unable to migrate save data');
    return null;
  }

  /**
   * Check if a save exists
   */
  public hasSave(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Clear saved data
   */
  public clearSave(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[SaveSystem] Save data cleared');
    this.emit({ type: 'save-cleared' });
  }

  /**
   * Get the saved ship position (for initial placement)
   */
  public getSavedPosition(): { x: number; y: number; rotation: number } | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const data = JSON.parse(json) as SaveData;
      return {
        x: data.shipPosition.x,
        y: data.shipPosition.y,
        rotation: data.shipRotation,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get total play time in seconds
   */
  public getTotalPlayTime(): number {
    const currentSessionTime = (Date.now() - this.sessionStartTime) / 1000;
    return this.previousPlayTime + currentSessionTime;
  }

  /**
   * Get formatted play time string
   */
  public getPlayTimeString(): string {
    const totalSeconds = Math.floor(this.getTotalPlayTime());
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Start auto-save at specified interval (in milliseconds)
   */
  public startAutoSave(intervalMs: number = 60000): void {
    this.stopAutoSave();

    this.autoSaveInterval = window.setInterval(() => {
      this.save();
    }, intervalMs);

    console.log(`[SaveSystem] Auto-save enabled (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop auto-save
   */
  public stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Subscribe to save events
   */
  public on(handler: SaveSystemEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(handler: SaveSystemEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: SaveSystemEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  /**
   * Clean up (call on game shutdown)
   */
  public destroy(): void {
    this.stopAutoSave();
    // Optionally save on destroy
    this.save();
  }

  /**
   * Get save metadata without fully parsing
   */
  public getSaveInfo(): { timestamp: number; playTime: number; credits: number } | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const data = JSON.parse(json) as SaveData;
      return {
        timestamp: data.timestamp,
        playTime: data.playTime,
        credits: data.credits,
      };
    } catch {
      return null;
    }
  }

  /**
   * Mark a location as discovered
   */
  public discoverLocation(locationId: string): boolean {
    if (this.discoveredLocations.has(locationId)) {
      return false; // Already discovered
    }
    this.discoveredLocations.add(locationId);
    console.log(`[SaveSystem] Discovered: ${locationId}`);
    return true;
  }

  /**
   * Check if a location has been discovered
   */
  public isLocationDiscovered(locationId: string): boolean {
    return this.discoveredLocations.has(locationId);
  }

  /**
   * Get all discovered location IDs
   */
  public getDiscoveredLocations(): string[] {
    return Array.from(this.discoveredLocations);
  }

  /**
   * Purchase a map (discover a location via trading)
   */
  public purchaseMap(locationId: string): boolean {
    return this.discoverLocation(locationId);
  }

  /**
   * Export save data as a downloadable file
   */
  public exportSave(): void {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) {
      console.warn('[SaveSystem] No save data to export');
      return;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `space-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import save data from a file
   */
  public async importSave(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as SaveData;

      // Validate structure
      if (typeof data.version !== 'number' ||
          typeof data.credits !== 'number' ||
          !Array.isArray(data.inventory)) {
        throw new Error('Invalid save file format');
      }

      localStorage.setItem(STORAGE_KEY, text);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SaveSystem] Import failed:', message);
      return false;
    }
  }
}
