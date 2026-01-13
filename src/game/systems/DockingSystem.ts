/**
 * Docking System - handles ship-station docking interactions
 */

import type { Station } from '../entities/Station';
import type { InputSystem } from './InputSystem';

export type DockingState = 'flying' | 'approaching' | 'docked';

export interface DockingCallbacks {
  onDock?: (station: Station) => void;
  onUndock?: () => void;
  onApproach?: (station: Station) => void;
  onLeaveRange?: () => void;
}

export class DockingSystem {
  private stations: Station[] = [];
  private input: InputSystem;
  private state: DockingState = 'flying';
  private currentStation: Station | null = null;
  private nearbyStation: Station | null = null;
  private callbacks: DockingCallbacks = {};

  // Player position (updated externally)
  private playerX: number = 0;
  private playerY: number = 0;

  constructor(input: InputSystem) {
    this.input = input;
  }

  /**
   * Set the list of stations to check for docking
   */
  public setStations(stations: Station[]): void {
    this.stations = stations;
  }

  /**
   * Register callbacks for docking events
   */
  public setCallbacks(callbacks: DockingCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Update player position for distance calculations
   */
  public updatePlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
  }

  /**
   * Main update loop
   */
  public update(_deltaTime: number): void {
    if (this.state === 'docked') {
      // Check for undock key (keyboard or virtual controller)
      if (this.input.isInteractJustPressed()) {
        this.undock();
      }
      return;
    }

    // Find nearest station in range
    this.nearbyStation = null;
    let closestDistance = Infinity;

    for (const station of this.stations) {
      const distance = station.distanceTo(this.playerX, this.playerY);
      const inRange = station.isInDockingRange(this.playerX, this.playerY);

      station.setPlayerInRange(inRange);

      if (inRange && distance < closestDistance) {
        closestDistance = distance;
        this.nearbyStation = station;
      }
    }

    // Handle state transitions
    if (this.nearbyStation) {
      if (this.state === 'flying') {
        this.state = 'approaching';
        this.callbacks.onApproach?.(this.nearbyStation);
      }

      // Check for dock key (keyboard or virtual controller)
      if (this.input.isInteractJustPressed()) {
        this.dock(this.nearbyStation);
      }
    } else {
      if (this.state === 'approaching') {
        this.state = 'flying';
        this.callbacks.onLeaveRange?.();
      }
    }
  }

  /**
   * Dock with a station
   */
  private dock(station: Station): void {
    this.state = 'docked';
    this.currentStation = station;
    console.log(`[Docking] Docked at ${station.name}`);
    this.callbacks.onDock?.(station);
  }

  /**
   * Undock from current station
   */
  public undock(): void {
    if (this.state !== 'docked' || !this.currentStation) return;

    console.log(`[Docking] Undocking from ${this.currentStation.name}`);
    this.state = 'flying';
    this.currentStation = null;
    this.callbacks.onUndock?.();
  }

  /**
   * Get current docking state
   */
  public getState(): DockingState {
    return this.state;
  }

  /**
   * Check if player is currently docked
   */
  public isDocked(): boolean {
    return this.state === 'docked';
  }

  /**
   * Check if player is approaching a station
   */
  public isApproaching(): boolean {
    return this.state === 'approaching';
  }

  /**
   * Get the station the player is currently docked at
   */
  public getCurrentStation(): Station | null {
    return this.currentStation;
  }

  /**
   * Get the nearby station (when approaching)
   */
  public getNearbyStation(): Station | null {
    return this.nearbyStation;
  }

  /**
   * Force undock (for external triggers)
   */
  public forceUndock(): void {
    this.undock();
  }
}
