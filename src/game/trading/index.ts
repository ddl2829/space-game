/**
 * Trading System Module
 *
 * Exports all trading-related components for easy integration.
 */

// Entities
export { Station } from '../entities/Station';

// Systems
export { DockingSystem, type DockingState, type DockingCallbacks } from '../systems/DockingSystem';
export { Market, type MarketPrices, type MarketState } from '../systems/Market';

// UI
export { StationUI, type StationUICallbacks } from '../ui/StationUI';

// Data
export {
  STATIONS,
  getAllStations,
  getStationById,
  type StationConfig,
} from '../../data/stations';

// Re-export Inventory for convenience
export { Inventory, type CargoSlot, type InventoryState } from '../components/Inventory';

/**
 * Trading System Integration Example
 *
 * Usage in Game class:
 *
 * ```typescript
 * import {
 *   Station,
 *   DockingSystem,
 *   Market,
 *   StationUI,
 *   getAllStations,
 * } from './trading';
 *
 * class Game {
 *   private stations: Station[] = [];
 *   private markets: Map<string, Market> = new Map();
 *   private dockingSystem: DockingSystem;
 *   private stationUI: StationUI;
 *
 *   initializeTrading(): void {
 *     // Create stations from config
 *     const stationConfigs = getAllStations();
 *     this.stations = stationConfigs.map(config => new Station(config));
 *
 *     // Create markets for each station
 *     stationConfigs.forEach(config => {
 *       this.markets.set(config.id, new Market(config.id, config.initialSupply));
 *     });
 *
 *     // Create docking system
 *     this.dockingSystem = new DockingSystem(this.input);
 *     this.dockingSystem.setStations(this.stations);
 *
 *     // Create station UI
 *     this.stationUI = new StationUI(this.inventory);
 *
 *     // Set up docking callbacks
 *     this.dockingSystem.setCallbacks({
 *       onDock: (station) => {
 *         const market = this.markets.get(station.id);
 *         if (market) {
 *           this.stationUI.show(station, market);
 *         }
 *       },
 *       onUndock: () => {
 *         this.stationUI.hide();
 *       }
 *     });
 *
 *     // Set up station UI callbacks
 *     this.stationUI.setCallbacks({
 *       onUndock: () => {
 *         this.dockingSystem.forceUndock();
 *         this.stationUI.hide();
 *       }
 *     });
 *   }
 *
 *   update(deltaTime: number): void {
 *     // Update stations
 *     this.stations.forEach(station => station.update(deltaTime));
 *
 *     // Update docking system (only when not docked)
 *     if (!this.dockingSystem.isDocked()) {
 *       this.dockingSystem.updatePlayerPosition(this.ship.position.x, this.ship.position.y);
 *       this.dockingSystem.update(deltaTime);
 *     }
 *   }
 *
 *   render(): void {
 *     // Render stations (in world space with camera offset)
 *     this.stations.forEach(station => {
 *       station.render(this.ctx, this.camera.x, this.camera.y);
 *     });
 *   }
 * }
 * ```
 */
