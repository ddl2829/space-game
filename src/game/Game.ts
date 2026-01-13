import type { GameConfig } from '../types';
import { InputSystem } from './systems/InputSystem';
import { Camera } from './systems/Camera';
import { Ship } from './entities/Ship';
import { Starfield } from './rendering/Starfield';

// Core system imports
import { Inventory } from './components/Inventory';
import { ParticleSystem } from './rendering/Particles';
import { ResourceDropManager } from './systems/ResourceDrop';
import { AsteroidSpawner } from './systems/AsteroidSpawner';
import { HUD } from './ui/HUD';
import { RESOURCES } from '../data/resources';

// Trading system imports (Sprint 2)
import { Station, DockingSystem, Market, StationUI, getAllStations } from './trading';

// Upgrade system imports (Sprint 3)
import { ShipStats, UpgradeSystem, SaveSystem, UpgradeShopUI } from './upgrades';

// Combat system imports (Sprint 4)
import {
  ZoneSystem,
  EnemySpawner,
  EnemyAI,
  CombatSystem,
  JumpGate,
  createGatePair,
  SAFE_ZONE,
  FRONTIER_ZONE,
} from './combat';

// Celestial system imports (Sprint 5)
import { CelestialSystem } from './systems/CelestialSystem';

// Procedural generation imports
import { getWorldGenerator, WorldGenerator, type WarpGateConfig } from '../utils/WorldGenerator';

// Mission system imports (Sprint 6)
import { MissionSystem } from './systems/MissionSystem';

// UI imports
import { POIMarkers, POI } from './ui/POIMarkers';
import { VirtualController } from './ui/VirtualController';

/**
 * Main game class that manages the game loop, rendering, and systems.
 */
export class Game {
  /** Canvas element */
  private canvas: HTMLCanvasElement;

  /** 2D rendering context */
  private ctx: CanvasRenderingContext2D;

  /** Input system for keyboard handling */
  private input: InputSystem;

  /** Camera for viewport management */
  private camera: Camera;

  /** Background starfield */
  private starfield: Starfield;

  /** Player ship */
  private ship: Ship;

  /** Last frame timestamp */
  private lastTime: number = 0;

  /** Whether the game is running */
  private running: boolean = false;

  /** Animation frame request ID */
  private animationFrameId: number = 0;

  /** Debug mode flag */
  private debug: boolean;

  // Mining system properties
  /** Player inventory for collected resources */
  private inventory!: Inventory;

  /** Particle system for visual effects */
  private particles!: ParticleSystem;

  /** Manages resource drops from destroyed asteroids */
  private resourceDrops!: ResourceDropManager;

  /** Spawns and manages asteroid field */
  private asteroidSpawner!: AsteroidSpawner;

  /** Heads-up display for UI */
  private hud!: HUD;

  // Trading system properties (Sprint 2)
  /** Space stations */
  private stations: Station[] = [];

  /** Markets for each station */
  private markets: Map<string, Market> = new Map();

  /** Docking system for station interactions */
  private dockingSystem!: DockingSystem;

  /** Station trading UI */
  private stationUI!: StationUI;

  // Upgrade system properties (Sprint 3)
  /** Ship stats manager */
  private shipStats!: ShipStats;

  /** Upgrade purchase system */
  private upgradeSystem!: UpgradeSystem;

  /** Save/load system */
  private saveSystem!: SaveSystem;

  /** Upgrade shop UI */
  private upgradeShopUI!: UpgradeShopUI;

  // Combat system properties (Sprint 4)
  /** Zone management */
  private zoneSystem!: ZoneSystem;

  /** Enemy spawner */
  private enemySpawner!: EnemySpawner;

  /** Enemy AI */
  private enemyAI!: EnemyAI;

  /** Combat mechanics */
  private combatSystem!: CombatSystem;

  /** Jump gates between zones */
  private jumpGates: JumpGate[] = [];

  /** Celestial system for planets, stars, black holes */
  private celestialSystem!: CelestialSystem;

  /** Mission system for quests */
  private missionSystem!: MissionSystem;

  /** Procedural world generator */
  private worldGenerator: WorldGenerator;

  /** Tracked warp gates from procedural generation */
  private warpGates: WarpGateConfig[] = [];

  /** Set of loaded celestial IDs to prevent duplicates */
  private loadedCelestialIds: Set<string> = new Set();

  /** Set of loaded station IDs to prevent duplicates */
  private loadedStationIds: Set<string> = new Set();

  /** Whether player is currently docked */
  private isDocked: boolean = false;

  /** POI markers for edge-of-screen indicators */
  private poiMarkers: POIMarkers;

  /** Virtual controller for mobile/touch devices */
  private virtualController: VirtualController;

  constructor(config: GameConfig) {
    // Get canvas element
    const canvas = document.getElementById(config.canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element '${config.canvasId}' not found`);
    }
    this.canvas = canvas;

    // Get 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.debug = config.debug ?? false;

    // Initialize core systems
    this.input = new InputSystem();
    this.camera = new Camera({ smoothing: 0.08 });
    this.starfield = new Starfield(3000, 3000);

    // Create player ship at origin
    this.ship = new Ship(this.input, 0, 0);

    // Set camera to follow ship
    this.camera.follow(this.ship);

    // Initialize POI markers
    this.poiMarkers = new POIMarkers();

    // Initialize procedural world generator
    this.worldGenerator = getWorldGenerator();

    // Initialize virtual controller for mobile/touch
    this.virtualController = new VirtualController({
      joystickSize: 120,
      buttonSize: 60,
      opacity: 0.5,
    });
    this.input.setVirtualController(this.virtualController);

    // Initialize upgrade system first (before mining, so stats are ready)
    this.initializeUpgradeSystem();

    // Initialize mining systems
    this.initializeMiningSystem();

    // Initialize trading systems (Sprint 2)
    this.initializeTradingSystem();

    // Initialize combat systems (Sprint 4)
    this.initializeCombatSystem();

    // Initialize celestial systems (Sprint 5)
    this.initializeCelestialSystem();

    // Initialize mission system (Sprint 6)
    this.initializeMissionSystem();

    // Load saved game if exists
    this.loadGame();

    // Setup canvas sizing
    this.setupCanvas();

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Initializes the upgrade and save systems (Sprint 3).
   */
  private initializeUpgradeSystem(): void {
    // Create ship stats manager
    this.shipStats = new ShipStats();

    // Create inventory with base capacity (will be updated from ShipStats)
    this.inventory = new Inventory(this.shipStats.getStat('cargoCapacity'), 0);

    // Create upgrade system
    this.upgradeSystem = new UpgradeSystem(this.inventory, this.shipStats);

    // Create save system
    this.saveSystem = new SaveSystem(this.inventory, this.shipStats);
    this.saveSystem.setShip(this.ship);

    // Create upgrade shop UI
    this.upgradeShopUI = new UpgradeShopUI(this.upgradeSystem);

    // Connect ship to stats for dynamic updates
    this.ship.connectStats(this.shipStats);

    // Update systems when stats change
    this.shipStats.on((event) => {
      if (event.type === 'stats-changed') {
        // Update inventory capacity
        this.inventory.setMaxWeight(this.shipStats.getStat('cargoCapacity'));

        // Update combat max health
        if (this.combatSystem) {
          this.combatSystem.setPlayerMaxHealth(this.shipStats.getStat('maxHealth'));

          // Update weapon stats based on upgrades
          const weaponTier = this.shipStats.getUpgradeTier('weaponSystem');
          this.combatSystem.setPlayerWeaponConfig({
            fireRate: this.shipStats.getStat('weaponFireRate'),
            projectileDamage: this.shipStats.getStat('weaponDamage'),
            // Multi-shot at tier 3: 3 projectiles with 15 degree spread
            projectileCount: weaponTier >= 3 ? 3 : 1,
            spreadAngle: weaponTier >= 3 ? 0.26 : 0, // ~15 degrees in radians
          });
        }
      }
    });

    // Auto-save when upgrades are purchased
    this.upgradeSystem.on((event) => {
      if (event.type === 'purchase-success') {
        this.saveSystem.save();
      }
    });

    // Start auto-save (every 60 seconds)
    this.saveSystem.startAutoSave(60000);

    // Save on tab close
    window.addEventListener('beforeunload', () => {
      this.saveSystem.save();
    });
  }

  /**
   * Initializes all mining-related systems.
   */
  private initializeMiningSystem(): void {
    // Inventory is already created in initializeUpgradeSystem

    // Create particle system with 500 particle pool
    this.particles = new ParticleSystem(500);

    // Create resource drop manager
    this.resourceDrops = new ResourceDropManager(this.inventory, this.particles);

    // Create asteroid spawner
    this.asteroidSpawner = new AsteroidSpawner({
      minAsteroids: 15,
      maxAsteroids: 30,
      spawnRadius: 800,
      despawnRadius: 1200,
      respawnDelay: 10,
    });

    // Initialize asteroid field at player position
    this.asteroidSpawner.initialize(this.ship.position.x, this.ship.position.y);

    // Create HUD
    this.hud = new HUD(this.inventory);

    // Note: HUD mission connection happens in initializeMissionSystem
  }

  /**
   * Initializes the trading system (Sprint 2).
   */
  private initializeTradingSystem(): void {
    // Create stations from config
    const stationConfigs = getAllStations();
    this.stations = stationConfigs.map((config) => new Station(config));

    // Create markets for each station
    stationConfigs.forEach((config) => {
      this.markets.set(config.id, new Market(config.id, config.initialSupply));
    });

    // Create docking system
    this.dockingSystem = new DockingSystem(this.input);
    this.dockingSystem.setStations(this.stations);

    // Create station UI
    this.stationUI = new StationUI(this.inventory);

    // Pass all markets and stations for market intel tab
    const stationMap = new Map<string, Station>();
    for (const station of this.stations) {
      stationMap.set(station.id, station);
    }
    this.stationUI.setAllMarketsAndStations(this.markets, stationMap);
    this.stationUI.setSaveSystem(this.saveSystem);

    // Set up docking callbacks
    this.dockingSystem.setCallbacks({
      onDock: (station) => {
        const market = this.markets.get(station.id);
        if (market) {
          // Auto-discover station when docking and award credits
          if (this.saveSystem.discoverLocation(station.id)) {
            const reward = this.calculateDiscoveryReward(station.x, station.y);
            this.inventory.addCredits(reward);
            console.log(`[Game] Discovered ${station.name}! +${reward} CR`);
            this.showMissionNotification(
              `Discovered: ${station.name}`,
              `+${reward} CR`,
              '#fbbf24'
            );
          }
          this.stationUI.show(station, market);
          this.isDocked = true;
          // Hide virtual controller while docked to prevent touch interference
          if (this.virtualController.isEnabled()) {
            this.virtualController.disable();
          }
          console.log(`[Game] Docked at ${station.name}`);
        }
      },
      onUndock: () => {
        this.stationUI.hide();
        this.upgradeShopUI.hide();
        this.isDocked = false;
        // Re-enable virtual controller on undock (only on touch devices)
        if (!this.virtualController.isEnabled() && this.virtualController.isTouchDevice()) {
          this.virtualController.enable();
        }
        // Save game on undock
        this.saveSystem.save();
        console.log('[Game] Undocked');
      },
      onApproach: (station) => {
        console.log(`[Game] Approaching ${station.name}`);
      },
    });

    // Set up station UI callbacks
    this.stationUI.setCallbacks({
      onUndock: () => {
        this.dockingSystem.forceUndock();
        this.stationUI.hide();
        this.isDocked = false;
        // Re-enable virtual controller on undock (only on touch devices)
        if (!this.virtualController.isEnabled() && this.virtualController.isTouchDevice()) {
          this.virtualController.enable();
        }
        this.saveSystem.save();
      },
      onSell: () => {
        // Refresh station UI after transaction
        this.stationUI.refresh();
      },
      onBuy: () => {
        // Refresh station UI after transaction
        this.stationUI.refresh();
      },
      onOpenUpgrades: () => {
        this.upgradeShopUI.show();
      },
    });
  }

  /**
   * Initializes the combat system (Sprint 4).
   */
  private initializeCombatSystem(): void {
    // Create zone system
    this.zoneSystem = new ZoneSystem();

    // Create enemy spawner
    this.enemySpawner = new EnemySpawner({
      spawnRadius: 600,
      despawnRadius: 1000,
      minSpawnDistance: 400,
      spawnCheckInterval: 2.0,
    });

    // Create enemy AI
    this.enemyAI = new EnemyAI({
      updateInterval: 0.1,
      predictionFactor: 0.5,
      flockingEnabled: true,
      separationDistance: 60,
    });

    // Create combat system
    this.combatSystem = new CombatSystem({
      playerMaxHealth: this.shipStats.getStat('maxHealth'),
      invulnerabilityDuration: 1.5,
      knockbackForce: 300,
      damagePopupDuration: 1.0,
      respawnDelay: 2.0,
    });

    // Create jump gates between zones
    this.createJumpGates();

    // Handle zone changes
    this.zoneSystem.setOnZoneChange((event) => {
      console.log(`[Game] Zone transition: ${event.previousZone.name} -> ${event.newZone.name}`);
      console.log(`[Game] Zone resource multiplier: ${event.newZone.resourceMultiplier}x`);
    });

    // Handle combat events
    this.combatSystem.setOnCombatEvent((event) => {
      switch (event.type) {
        case 'player_damaged':
          console.log(`[Game] Player took ${event.damage} damage`);
          break;
        case 'player_destroyed':
          console.log('[Game] Player destroyed! Clearing cargo...');
          this.inventory.clear();
          // Set respawn at nearest station or origin
          const nearestStation = this.findNearestStation();
          if (nearestStation) {
            this.combatSystem.setRespawnPosition(nearestStation.x, nearestStation.y + 200);
          } else {
            this.combatSystem.setRespawnPosition(0, 0);
          }
          break;
        case 'player_respawned':
          console.log('[Game] Player respawned');
          // Make nearby pirates passive so they don't immediately attack
          // They will fly away and ignore the player unless shot at
          this.enemySpawner.makePiratesPassiveNear(
            this.ship.position.x,
            this.ship.position.y,
            1000 // Large radius for respawn protection
          );
          break;
        case 'pirate_destroyed':
          // Spawn random loot drops at pirate's position
          if (event.position) {
            this.spawnPirateLoot(event.position.x, event.position.y, event.loot || 50);
          }
          // Track pirate kill for missions
          if (this.missionSystem) {
            this.missionSystem.recordPirateKill();
          }
          break;
      }
    });
  }

  /**
   * Creates jump gates between zones.
   */
  private createJumpGates(): void {
    // Create gate pair between Safe Zone and Frontier
    // Gate in Safe Zone near the boundary
    const [gateSafe, gateFrontier] = createGatePair(
      SAFE_ZONE,
      1800, // Near east edge of safe zone
      0,
      FRONTIER_ZONE,
      2200, // Just outside safe zone in frontier
      0
    );

    this.jumpGates.push(gateSafe, gateFrontier);

    // Could add more gate pairs for additional zones
  }

  /**
   * Initializes the celestial system (Sprint 5).
   * Now uses procedural generation with chunk-based streaming.
   */
  private initializeCelestialSystem(): void {
    this.celestialSystem = new CelestialSystem();

    // Load initial chunks around player spawn (0, 0)
    this.loadChunksAroundPosition(0, 0);
  }

  /**
   * Load procedurally generated content from chunks around a position.
   */
  private loadChunksAroundPosition(x: number, y: number): void {
    const objects = this.worldGenerator.getObjectsInRange(x, y);

    // Add planets that haven't been loaded yet
    for (const planetConfig of objects.planets) {
      if (planetConfig.id && !this.loadedCelestialIds.has(planetConfig.id)) {
        this.celestialSystem.addPlanet(planetConfig);
        this.loadedCelestialIds.add(planetConfig.id);
      }
    }

    // Add stars that haven't been loaded yet
    for (const starConfig of objects.stars) {
      if (starConfig.id && !this.loadedCelestialIds.has(starConfig.id)) {
        this.celestialSystem.addStar(starConfig);
        this.loadedCelestialIds.add(starConfig.id);
      }
    }

    // Add black holes that haven't been loaded yet
    for (const blackHoleConfig of objects.blackHoles) {
      if (blackHoleConfig.id && !this.loadedCelestialIds.has(blackHoleConfig.id)) {
        this.celestialSystem.addBlackHole(blackHoleConfig);
        this.loadedCelestialIds.add(blackHoleConfig.id);
      }
    }

    // Add stations that haven't been loaded yet
    for (const stationConfig of objects.stations) {
      if (!this.loadedStationIds.has(stationConfig.id)) {
        const station = new Station(stationConfig);
        this.stations.push(station);
        this.markets.set(stationConfig.id, new Market(stationConfig.id, stationConfig.initialSupply));
        this.loadedStationIds.add(stationConfig.id);
        // Update docking system with new stations
        this.dockingSystem.setStations(this.stations);
        // Update station UI with new markets/stations
        const stationMap = new Map<string, Station>();
        for (const s of this.stations) {
          stationMap.set(s.id, s);
        }
        this.stationUI.setAllMarketsAndStations(this.markets, stationMap);
      }
    }

    // Track warp gates for interaction
    for (const warpGateConfig of objects.warpGates) {
      if (!this.warpGates.some(wg => wg.id === warpGateConfig.id)) {
        this.warpGates.push(warpGateConfig);
      }
    }
  }

  /**
   * Initializes the mission system (Sprint 6).
   */
  private initializeMissionSystem(): void {
    // Create mission system
    this.missionSystem = new MissionSystem();

    // Connect mission system to station UI
    this.stationUI.setMissionSystem(this.missionSystem);

    // Connect mission system to save system for persistence
    this.saveSystem.setMissionSystem(this.missionSystem);

    // Connect HUD to mission system for progress display
    this.hud.setMissionSystem(() => this.missionSystem.getActiveMissionsSummary());

    // Handle mission events with auto-reward
    this.missionSystem.setCallbacks({
      onMissionCompleted: (mission) => {
        console.log(`[Game] Mission completed: ${mission.title}`);

        // Auto-collect reward immediately
        const reward = this.missionSystem.collectReward(mission.id);
        if (reward > 0) {
          this.inventory.addCredits(reward);
          // Show notification
          this.showMissionNotification(`${mission.title} Complete!`, `+${reward} CR`, '#4ade80');
          // Save game
          this.saveSystem.save();
        }
      },
      onMissionProgress: (mission) => {
        if (mission.objective.type === 'kill_pirates') {
          console.log(`[Game] Mission progress: ${mission.objective.currentCount}/${mission.objective.targetCount}`);
        }
      },
    });
  }

  /**
   * Shows a floating notification for mission events.
   */
  private showMissionNotification(title: string, subtitle: string, color: string): void {
    // Create floating notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      padding: 20px 40px;
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid ${color};
      border-radius: 10px;
      z-index: 2000;
      text-align: center;
      animation: missionNotifyIn 0.3s ease-out, missionNotifyOut 0.5s ease-in 2s forwards;
      pointer-events: none;
      box-shadow: 0 0 30px ${color}40;
    `;

    notification.innerHTML = `
      <div style="color: ${color}; font-size: 24px; font-weight: bold; font-family: monospace; margin-bottom: 8px;">
        ${title}
      </div>
      <div style="color: #ffd700; font-size: 20px; font-weight: bold; font-family: monospace;">
        ${subtitle}
      </div>
    `;

    // Add animation keyframes if not present
    if (!document.getElementById('mission-notify-animations')) {
      const style = document.createElement('style');
      style.id = 'mission-notify-animations';
      style.textContent = `
        @keyframes missionNotifyIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes missionNotifyOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
      notification.remove();
    }, 2500);
  }

  /**
   * Finds the nearest station to the player.
   */
  private findNearestStation(): Station | null {
    if (this.stations.length === 0) return null;

    let nearest: Station | null = null;
    let nearestDist = Infinity;

    for (const station of this.stations) {
      const dist = station.distanceTo(this.ship.position.x, this.ship.position.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }

    return nearest;
  }

  /**
   * Loads saved game if it exists.
   */
  private loadGame(): void {
    const savedData = this.saveSystem.load();
    if (savedData) {
      // Apply saved ship position
      this.ship.position.x = savedData.shipPosition.x;
      this.ship.position.y = savedData.shipPosition.y;
      this.ship.rotation = savedData.shipRotation;

      // Re-initialize asteroid field at loaded position
      this.asteroidSpawner.initialize(this.ship.position.x, this.ship.position.y);

      console.log('[Game] Loaded saved game');
    }
  }

  /**
   * Sets up canvas dimensions and pixel ratio.
   */
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Set canvas size accounting for device pixel ratio
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale context for crisp rendering
    this.ctx.scale(dpr, dpr);

    // Update camera viewport
    this.camera.setViewport(rect.width, rect.height);
  }

  /**
   * Sets up all event handlers including resize and mouse tracking.
   */
  private setupEventHandlers(): void {
    // Resize handler
    window.addEventListener('resize', this.handleResize.bind(this));

    // Keyboard handler for UI controls
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handles keyboard input for UI controls.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Toggle upgrade shop with 'U' key (only when docked)
    if ((e.key === 'u' || e.key === 'U') && this.isDocked) {
      this.upgradeShopUI.toggle();
    }

    // Close UI with Escape
    if (e.key === 'Escape') {
      if (this.upgradeShopUI.isOpen()) {
        this.upgradeShopUI.hide();
      } else if (this.stationUI.isVisible()) {
        // Don't auto-undock on escape, just close upgrade shop if open
      }
    }

    // Toggle debug with backtick
    if (e.key === '`') {
      this.toggleDebug();
    }

    // Handle jump gate interaction
    if (e.key === 'e' || e.key === 'E') {
      this.checkJumpGateInteraction();
    }
  }

  /**
   * Checks if player is near a jump gate and initiates jump.
   */
  private checkJumpGateInteraction(): void {
    if (this.isDocked) return;

    for (const gate of this.jumpGates) {
      if (gate.isInInteractionRange(this.ship.position.x, this.ship.position.y)) {
        const dest = gate.getDestination();
        console.log(`[Game] Jumping to ${dest.zone.name}`);

        // Teleport ship to destination
        this.ship.position.x = dest.x;
        this.ship.position.y = dest.y;
        this.ship.velocity.set(0, 0);

        // Clear enemies when jumping
        this.enemySpawner.clear();

        // Re-initialize asteroids at new location
        this.asteroidSpawner.initialize(this.ship.position.x, this.ship.position.y);

        // Force zone update
        this.zoneSystem.update(this.ship.position.x, this.ship.position.y, 0);

        break;
      }
    }
  }

  /**
   * Checks if player is near a procedural warp gate and teleports them.
   */
  private checkWarpGateInteraction(): void {
    if (this.isDocked) return;

    const interactionRadius = 100;
    for (const warpGate of this.warpGates) {
      const dx = this.ship.position.x - warpGate.x;
      const dy = this.ship.position.y - warpGate.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < interactionRadius) {
        console.log(`[Game] Warping through ${warpGate.name}`);

        // Teleport ship to exit point
        this.ship.position.x = warpGate.exitX;
        this.ship.position.y = warpGate.exitY;
        this.ship.velocity.set(0, 0);

        // Clear enemies when warping
        this.enemySpawner.clear();

        // Re-initialize asteroids at new location
        this.asteroidSpawner.initialize(this.ship.position.x, this.ship.position.y);

        // Load chunks at new location
        this.loadChunksAroundPosition(warpGate.exitX, warpGate.exitY);

        // Force zone update
        this.zoneSystem.update(this.ship.position.x, this.ship.position.y, 0);

        break;
      }
    }
  }

  /**
   * Handles window resize events.
   */
  private handleResize(): void {
    this.setupCanvas();
  }

  /**
   * Starts the game loop.
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);

    console.log('Game started - WASD/Arrows to move, LMB to mine, E to dock/use gates, U for upgrades (when docked)');
  }

  /**
   * Stops the game loop.
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Main game loop using requestAnimationFrame.
   */
  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    // Calculate delta time in seconds
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Update game state
    this.update(deltaTime);

    // Render frame
    this.render();

    // Clear per-frame input state
    this.input.update();

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Updates all game systems and entities.
   */
  private update(deltaTime: number): void {
    // Update stations (animations even when docked)
    for (const station of this.stations) {
      station.update(deltaTime);
    }

    // Update jump gates (animations)
    for (const gate of this.jumpGates) {
      gate.update(deltaTime);

      // Check if player is near for visual feedback
      const near = gate.isInInteractionRange(this.ship.position.x, this.ship.position.y);
      gate.setPlayerNear(near);
    }

    // Skip gameplay updates if player is dead (respawning)
    if (this.combatSystem.isPlayerDeadState()) {
      this.combatSystem.update(this.ship, [], deltaTime);
      this.particles.update(deltaTime);
      return;
    }

    // Skip gameplay updates if docked
    if (this.isDocked) {
      // Only update particles for visual effects
      this.particles.update(deltaTime);
      return;
    }

    // Handle spacebar/fire button action - always shoot
    if (this.input.isActionPressed()) {
      // Always shoot in facing direction
      this.combatSystem.playerShoot(
        this.ship.position.x,
        this.ship.position.y,
        this.ship.rotation
      );
    }

    // Check projectile collisions with asteroids (mining via shooting)
    this.checkProjectileAsteroidCollisions();

    // Update ship movement
    this.ship.update(deltaTime);

    // Stream in new chunks based on player position (procedural generation)
    this.loadChunksAroundPosition(this.ship.position.x, this.ship.position.y);

    // Update celestial bodies
    this.celestialSystem.update(deltaTime);

    // Check for celestial discoveries (when player gets close)
    this.checkCelestialDiscoveries();

    // Update mission system and check delivery completions
    this.missionSystem.update(deltaTime);
    const planets = this.celestialSystem.getPlanets().map((p) => ({
      name: p.name,
      x: p.x,
      y: p.y,
      radius: p.radius,
    }));
    this.missionSystem.checkDeliveryCompletion(this.ship.position.x, this.ship.position.y, planets);

    // Apply black hole gravity to ship
    const gravity = this.celestialSystem.getGravityForce(
      this.ship.position.x,
      this.ship.position.y
    );
    this.ship.velocity.x += gravity.fx * deltaTime;
    this.ship.velocity.y += gravity.fy * deltaTime;

    // Check star damage
    const starDamage = this.celestialSystem.checkStarDamage(
      this.ship.position.x,
      this.ship.position.y
    );
    if (starDamage > 0) {
      this.combatSystem.damagePlayer(
        starDamage * deltaTime,
        this.ship.position.x,
        this.ship.position.y,
        this.ship
      );
    }

    // Check black hole capture
    const capturedBy = this.celestialSystem.checkBlackHoleCapture(
      this.ship.position.x,
      this.ship.position.y
    );
    if (capturedBy) {
      const exit = capturedBy.getExitPoint();
      this.ship.position.x = exit.x;
      this.ship.position.y = exit.y;
      this.ship.rotation = exit.angle;
      // Add some exit velocity
      this.ship.velocity.x = Math.cos(exit.angle) * 300;
      this.ship.velocity.y = Math.sin(exit.angle) * 300;
      // Clear enemies and reinitialize asteroids
      this.enemySpawner.clear();
      this.asteroidSpawner.initialize(exit.x, exit.y);
      // Load chunks at new location
      this.loadChunksAroundPosition(exit.x, exit.y);
    }

    // Check warp gate interaction
    this.checkWarpGateInteraction();

    // Update camera to follow ship
    this.camera.update(deltaTime);

    // Update zone system
    this.zoneSystem.update(this.ship.position.x, this.ship.position.y, deltaTime);

    // Update enemy systems
    const currentZone = this.zoneSystem.getCurrentZone();
    this.enemySpawner.update(
      this.ship.position.x,
      this.ship.position.y,
      currentZone,
      deltaTime
    );

    // Update enemy AI
    const pirates = this.enemySpawner.getPirates();
    this.enemyAI.update(
      pirates,
      {
        x: this.ship.position.x,
        y: this.ship.position.y,
        velocity: { x: this.ship.velocity.x, y: this.ship.velocity.y },
      },
      deltaTime
    );

    // Update combat system
    this.combatSystem.update(this.ship, pirates, deltaTime);

    // Update mining systems
    this.updateMiningSystems(deltaTime);

    // Update docking system (check approach and dock/undock)
    this.dockingSystem.updatePlayerPosition(this.ship.position.x, this.ship.position.y);
    this.dockingSystem.update(deltaTime);

    // Update virtual controller button mode based on station proximity
    if (this.virtualController.isEnabled()) {
      const nearStation = this.dockingSystem.isApproaching();
      this.virtualController.setButtonMode(nearStation ? 'dock' : 'fire');
    }

    // Update particles
    this.particles.update(deltaTime);
  }

  /**
   * Updates asteroid and resource drop systems.
   */
  private updateMiningSystems(deltaTime: number): void {
    // Get player position from ship
    const playerX = this.ship.position.x;
    const playerY = this.ship.position.y;

    // Update player position for all systems
    this.asteroidSpawner.updatePlayerPosition(playerX, playerY);
    this.resourceDrops.updatePlayerPosition(playerX, playerY);

    // Update all systems
    this.asteroidSpawner.update(deltaTime);
    this.resourceDrops.update(deltaTime);
    this.hud.update(deltaTime);
  }

  /**
   * Spawn loot drops when a pirate is destroyed.
   */
  private spawnPirateLoot(x: number, y: number, creditValue: number): void {
    // Spawn 2-4 random resource drops based on credit value
    const dropCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < dropCount; i++) {
      // Pick a random resource weighted by tier
      const roll = Math.random();
      let resource;
      if (roll < 0.1) {
        resource = RESOURCES.platinum;
      } else if (roll < 0.4) {
        resource = RESOURCES.titanium;
      } else {
        resource = RESOURCES.iron;
      }

      // Calculate quantity based on credit value and resource price
      const quantity = Math.max(1, Math.floor((creditValue / dropCount) / resource.basePrice));

      // Spawn with random velocity
      const angle = (i / dropCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 50;

      this.resourceDrops.spawn({
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        resource,
        quantity,
      });
    }

    // Spawn explosion particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color: '#f84',
        type: 'spark',
      });
    }

    console.log(`[Game] Spawned ${dropCount} loot drops from pirate`);
  }

  /**
   * Check player projectile collisions with asteroids for mining via shooting.
   */
  private checkProjectileAsteroidCollisions(): void {
    const projectiles = this.combatSystem.getWeaponSystem().getPlayerProjectiles();
    const asteroids = this.asteroidSpawner.getAsteroids();

    for (const projectile of projectiles) {
      if (!projectile.active) continue;

      for (const asteroid of asteroids) {
        if (asteroid.isDestroyed) continue;

        // Check collision
        const dx = asteroid.x - projectile.position.x;
        const dy = asteroid.y - projectile.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const collisionDistance = asteroid.radius + projectile.getCollisionRadius();

        if (distance < collisionDistance) {
          // Damage the asteroid
          const damage = projectile.damage;
          const resourcesDropped = asteroid.mine(damage);

          // Spawn mining particles
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.emit({
              x: projectile.position.x,
              y: projectile.position.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.3 + Math.random() * 0.3,
              size: 2 + Math.random() * 3,
              color: asteroid.resource.color,
              type: 'spark',
            });
          }

          // Check if asteroid was destroyed
          if (resourcesDropped > 0) {
            // Spawn destruction particles
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 30 + Math.random() * 80;
              this.particles.emit({
                x: asteroid.x,
                y: asteroid.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.5,
                size: 3 + Math.random() * 5,
                color: '#666',
                type: 'debris',
              });
            }

            // Spawn resource drops
            this.resourceDrops.spawnFromAsteroid(asteroid, resourcesDropped);
          }

          // Destroy the projectile
          projectile.destroy();
          break; // Projectile can only hit one asteroid
        }
      }
    }
  }

  /**
   * Renders the game frame.
   */
  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    // Clear canvas with zone background color
    const bgColor = this.zoneSystem.getBackgroundColor();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Render zone transition effects (flashes, vignettes)
    this.zoneSystem.render(ctx, rect.width, rect.height);

    // Render starfield (handles its own camera transformation)
    this.starfield.render(ctx, this.camera);

    // Calculate camera offset for world-space rendering
    const cameraX = this.camera.position.x - this.camera.width / 2;
    const cameraY = this.camera.position.y - this.camera.height / 2;

    // Render world objects (using camera offset)
    this.renderWorldObjects(ctx, cameraX, cameraY);

    // Apply camera transform for entity rendering
    this.camera.applyTransform(ctx);

    // Render ship (if not dead)
    if (!this.combatSystem.isPlayerDeadState()) {
      this.ship.render(ctx);
    }

    // Restore camera transform
    this.camera.restoreTransform(ctx);

    // Render combat damage popups (world space with offset)
    this.combatSystem.render(ctx, cameraX, cameraY);

    // Render UI (screen space)
    this.renderUI(ctx, rect.width, rect.height, cameraX, cameraY);
  }

  /**
   * Renders all world-space objects.
   */
  private renderWorldObjects(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    // Render celestial bodies (behind everything)
    this.celestialSystem.render(ctx, cameraX, cameraY);

    // Render asteroids
    this.asteroidSpawner.render(ctx, cameraX, cameraY);

    // Render resource drops
    this.resourceDrops.render(ctx, cameraX, cameraY);

    // Render stations
    for (const station of this.stations) {
      station.render(ctx, cameraX, cameraY);
    }

    // Render jump gates
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    for (const gate of this.jumpGates) {
      gate.render(ctx);
    }
    ctx.restore();

    // Render enemies
    this.enemySpawner.render(ctx, cameraX, cameraY);

    // Render particles (in world space)
    this.particles.render(ctx, cameraX, cameraY);
  }

  /**
   * Renders all UI elements.
   */
  private renderUI(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number,
    cameraY: number
  ): void {
    // Render debug info first (bottom layer)
    if (this.debug) {
      this.renderDebugInfo(ctx);
    }

    // Render HUD (credits, missions)
    this.hud.render(ctx);

    // Render zone indicator (top-left)
    this.zoneSystem.renderHUD(ctx, 20, 20);

    // Render health bar
    this.combatSystem.renderHealthBar(ctx, 10, height - 50);

    // Render cargo meter below health bar
    this.hud.renderCargoMeter(ctx, 10, height - 28);

    // Render threat indicator if enemies nearby
    if (this.enemySpawner.hasNearbyThreats(this.ship.position.x, this.ship.position.y)) {
      this.renderThreatIndicator(ctx, width);
    }

    // Render death screen if player is dead
    this.combatSystem.renderDeathScreen(ctx, width, height);

    // Render docking prompt if approaching
    if (this.dockingSystem.isApproaching() && !this.isDocked) {
      this.renderDockingPrompt(ctx, width, height);
    }

    // Render docked state indicator
    if (this.isDocked) {
      this.renderDockedIndicator(ctx, width);
    }

    // Build POI list for edge-of-screen markers (only discovered locations)
    const pois: POI[] = [];
    const markerRange = 3000; // 3km - only show markers within this range (unless enemy or mission target)

    // Helper to check if POI is within range
    const isWithinRange = (x: number, y: number): boolean => {
      const dx = x - this.ship.position.x;
      const dy = y - this.ship.position.y;
      return Math.sqrt(dx * dx + dy * dy) <= markerRange;
    };

    // Get active delivery mission destinations with coordinates (shown regardless of distance)
    const deliveryDestinations: { name: string; x: number; y: number }[] = [];
    for (const mission of this.missionSystem.getActiveMissions()) {
      if (mission.objective.type === 'delivery' && !mission.isComplete) {
        const obj = mission.objective;
        deliveryDestinations.push({
          name: obj.destinationPlanet,
          x: obj.destinationX,
          y: obj.destinationY,
        });
      }
    }

    // Add discovered stations (only within 3km)
    for (const station of this.stations) {
      if (this.saveSystem.isLocationDiscovered(station.id)) {
        if (isWithinRange(station.x, station.y)) {
          pois.push({
            x: station.x,
            y: station.y,
            type: 'station',
            name: station.name,
            color: '#4ade80',
          });
        }
      }
    }

    // Add jump gates (only within 3km)
    for (const gate of this.jumpGates) {
      if (isWithinRange(gate.position.x, gate.position.y)) {
        pois.push({
          x: gate.position.x,
          y: gate.position.y,
          type: 'gate',
          name: 'Jump Gate',
          color: '#22d3ee',
        });
      }
    }

    // Add procedural warp gates (only within 3km)
    for (const warpGate of this.warpGates) {
      if (isWithinRange(warpGate.x, warpGate.y)) {
        pois.push({
          x: warpGate.x,
          y: warpGate.y,
          type: 'warpgate',
          name: warpGate.name,
          color: '#34d399',
        });
      }
    }

    // Add nearby enemies (always visible - tactical awareness, no distance limit)
    for (const pirate of this.enemySpawner.getPirates()) {
      pois.push({
        x: pirate.position.x,
        y: pirate.position.y,
        type: 'enemy',
        color: '#ef4444',
      });
    }

    // Add celestial POIs (only within 3km, or if it's a delivery mission destination)
    const celestialPOIs = this.celestialSystem.getAllPOIs();

    for (const poi of celestialPOIs) {
      // Map celestial names to location IDs
      const locationId = this.getLocationIdFromPOI(poi);
      if (!locationId) continue;

      const isDiscovered = this.saveSystem.isLocationDiscovered(locationId);
      const isMissionDestination = poi.name ? deliveryDestinations.some(d => d.name === poi.name) : false;
      const withinRange = isWithinRange(poi.x, poi.y);

      if (isDiscovered) {
        // Show discovered POIs only within range
        if (withinRange) {
          pois.push(poi);
        }
      } else if (withinRange || isMissionDestination) {
        // Show undiscovered POIs within 3km OR if it's a mission destination (as amber "???")
        pois.push({
          x: poi.x,
          y: poi.y,
          type: 'undiscovered',
          name: '???',
          color: '#fbbf24', // Amber/gold for undiscovered
        });
      }
    }

    // Also show undiscovered stations within range
    for (const station of this.stations) {
      if (!this.saveSystem.isLocationDiscovered(station.id)) {
        if (isWithinRange(station.x, station.y)) {
          pois.push({
            x: station.x,
            y: station.y,
            type: 'undiscovered',
            name: '???',
            color: '#fbbf24',
          });
        }
      }
    }

    // Add delivery mission destinations directly (in case planet not loaded in celestialSystem)
    // These show as amber "???" markers regardless of distance
    for (const dest of deliveryDestinations) {
      // Check if we already added this POI from celestialPOIs
      const alreadyAdded = pois.some(p =>
        Math.abs(p.x - dest.x) < 10 && Math.abs(p.y - dest.y) < 10
      );
      if (!alreadyAdded) {
        pois.push({
          x: dest.x,
          y: dest.y,
          type: 'undiscovered',
          name: '???',
          color: '#fbbf24',
        });
      }
    }

    // Render POI markers at screen edges
    this.poiMarkers.render(
      ctx,
      width,
      height,
      cameraX,
      cameraY,
      this.ship.position.x,
      this.ship.position.y,
      pois
    );
  }

  /**
   * Renders threat indicator when enemies are nearby.
   */
  private renderThreatIndicator(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';

    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('HOSTILE CONTACTS', width / 2, 30);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  /**
   * Renders docking prompt.
   */
  private renderDockingPrompt(ctx: CanvasRenderingContext2D, _width: number, height: number): void {
    const station = this.dockingSystem.getNearbyStation();
    if (!station) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, height - 100, 200, 40);

    ctx.strokeStyle = '#4a8';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, height - 100, 200, 40);

    ctx.fillStyle = '#4a8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Dock at ${station.name}`, 20, height - 78);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('Press E to dock', 20, height - 65);

    ctx.restore();
  }

  /**
   * Maps POI names to location IDs for discovery tracking.
   */
  private getLocationIdFromPOI(poi: POI): string | null {
    if (!poi.name) return null;

    // For procedurally generated content, use type + name as ID
    // This works with the chunk-based generation where IDs follow patterns like:
    // planet_0_0_haven_prime, star_1_-1_solaris, etc.
    const normalizedName = poi.name.toLowerCase().replace(/\s+/g, '_');

    switch (poi.type) {
      case 'planet':
        return `planet_${normalizedName}`;
      case 'star':
        return `star_${normalizedName}`;
      case 'blackhole':
        return `blackhole_${normalizedName}`;
      case 'station':
        return `station_${normalizedName}`;
      case 'warpgate':
        return `warpgate_${normalizedName}`;
      default:
        return `celestial_${normalizedName}`;
    }
  }

  /**
   * Calculate discovery reward based on distance from origin.
   * Farther locations are worth more credits.
   */
  private calculateDiscoveryReward(x: number, y: number): number {
    const distFromOrigin = Math.sqrt(x * x + y * y);

    // Base reward scales with distance
    // Safe Zone (0-2000): 50-150 credits
    // Frontier (2000+): 150-500+ credits
    const baseReward = 50;
    const distanceMultiplier = 0.1; // 0.1 credits per unit distance

    const reward = Math.round(baseReward + distFromOrigin * distanceMultiplier);

    // Cap at reasonable maximum
    return Math.min(reward, 1000);
  }

  /**
   * Check if player is close to any celestial bodies and auto-discover them.
   * Awards credits based on distance from origin.
   */
  private checkCelestialDiscoveries(): void {
    const playerX = this.ship.position.x;
    const playerY = this.ship.position.y;
    const discoveryRange = 500; // Distance to auto-discover celestials

    const celestialPOIs = this.celestialSystem.getAllPOIs();
    for (const poi of celestialPOIs) {
      const dx = poi.x - playerX;
      const dy = poi.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < discoveryRange) {
        const locationId = this.getLocationIdFromPOI(poi);
        if (locationId && this.saveSystem.discoverLocation(locationId)) {
          // Calculate and award discovery bonus
          const reward = this.calculateDiscoveryReward(poi.x, poi.y);
          this.inventory.addCredits(reward);

          console.log(`[Game] Discovered ${poi.name}! +${reward} CR`);

          // Show discovery notification
          this.showMissionNotification(
            `Discovered: ${poi.name}`,
            `+${reward} CR`,
            '#fbbf24' // Amber/gold color for discoveries
          );

          // Save game after discovery
          this.saveSystem.save();
        }
      }
    }
  }

  /**
   * Renders docked indicator.
   */
  private renderDockedIndicator(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(100, 200, 100, 0.8)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DOCKED - Press U for upgrades, E to undock', width / 2, 50);

    ctx.restore();
  }

  /**
   * Renders debug information overlay.
   */
  private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';

    const zone = this.zoneSystem.getCurrentZone();
    const pirates = this.enemySpawner.getPirateCount();

    const lines = [
      `Position: ${this.ship.position.x.toFixed(1)}, ${this.ship.position.y.toFixed(1)}`,
      `Velocity: ${this.ship.velocity.x.toFixed(1)}, ${this.ship.velocity.y.toFixed(1)}`,
      `Speed: ${this.ship.getSpeed().toFixed(1)}`,
      `Rotation: ${((this.ship.rotation * 180) / Math.PI).toFixed(1)}deg`,
      `Thrusting: ${this.ship.isThrusting}`,
      `Zone: ${zone.name} (Danger: ${zone.dangerLevel})`,
      `Asteroids: ${this.asteroidSpawner.getAsteroidCount()}`,
      `Pirates: ${pirates}`,
      `Particles: ${this.particles.getActiveCount()}`,
      `Cargo: ${this.inventory.getCurrentWeight().toFixed(1)}/${this.inventory.getMaxWeight()} kg`,
      `Credits: ${this.inventory.getCredits()}`,
      `Health: ${this.combatSystem.getPlayerHealth()}/${this.combatSystem.getPlayerMaxHealth()}`,
      `Play Time: ${this.saveSystem.getPlayTimeString()}`,
    ];

    lines.forEach((line, i) => {
      ctx.fillText(line, 10, 20 + i * 15);
    });
  }

  /**
   * Toggles debug mode.
   */
  toggleDebug(): void {
    this.debug = !this.debug;
  }

  /**
   * Gets the player ship.
   */
  getShip(): Ship {
    return this.ship;
  }

  /**
   * Gets the camera.
   */
  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Gets the player inventory.
   */
  getInventory(): Inventory {
    return this.inventory;
  }

  /**
   * Gets the asteroid spawner.
   */
  getAsteroidSpawner(): AsteroidSpawner {
    return this.asteroidSpawner;
  }

  /**
   * Gets the ship stats manager.
   */
  getShipStats(): ShipStats {
    return this.shipStats;
  }

  /**
   * Gets the upgrade system.
   */
  getUpgradeSystem(): UpgradeSystem {
    return this.upgradeSystem;
  }

  /**
   * Gets the save system.
   */
  getSaveSystem(): SaveSystem {
    return this.saveSystem;
  }

  /**
   * Gets the zone system.
   */
  getZoneSystem(): ZoneSystem {
    return this.zoneSystem;
  }

  /**
   * Gets the combat system.
   */
  getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  /**
   * Cheat: Add credits for testing.
   * Usage: Open browser console and run: game.cheat.credits(10000)
   */
  public cheat = {
    credits: (amount: number) => {
      this.inventory.addCredits(amount);
      console.log(`[Cheat] Added ${amount} credits. Total: ${this.inventory.getCredits()}`);
    },
    health: (amount: number = 100) => {
      this.combatSystem.healPlayer(amount);
      console.log(`[Cheat] Healed ${amount} HP`);
    },
    resources: (resourceId: string = 'platinum', quantity: number = 50) => {
      this.inventory.addResource(resourceId, quantity);
      console.log(`[Cheat] Added ${quantity} ${resourceId}`);
    },
    teleport: (x: number, y: number) => {
      this.ship.position.x = x;
      this.ship.position.y = y;
      console.log(`[Cheat] Teleported to (${x}, ${y})`);
    },
  };

  /**
   * Cleans up game resources.
   */
  destroy(): void {
    this.stop();
    this.input.destroy();
    this.saveSystem.destroy();
    this.upgradeShopUI.destroy();
    this.stationUI.destroy();
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}
