import type { GameConfig } from '../types';
import { InputSystem } from './systems/InputSystem';
import { Camera } from './systems/Camera';
import { Ship } from './entities/Ship';
import { Starfield } from './rendering/Starfield';

// Mining system imports
import { Inventory } from './components/Inventory';
import { ParticleSystem } from './rendering/Particles';
import { ResourceDropManager } from './systems/ResourceDrop';
import { MiningSystem } from './systems/MiningSystem';
import { AsteroidSpawner } from './systems/AsteroidSpawner';
import { HUD } from './ui/HUD';

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

  /** Handles mining interaction with asteroids */
  private miningSystem!: MiningSystem;

  /** Spawns and manages asteroid field */
  private asteroidSpawner!: AsteroidSpawner;

  /** Heads-up display for UI */
  private hud!: HUD;

  /** Current mouse screen position */
  private mouseScreenX: number = 0;
  private mouseScreenY: number = 0;

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

  /** Whether player is currently docked */
  private isDocked: boolean = false;

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

    // Initialize upgrade system first (before mining, so stats are ready)
    this.initializeUpgradeSystem();

    // Initialize mining systems
    this.initializeMiningSystem();

    // Initialize trading systems (Sprint 2)
    this.initializeTradingSystem();

    // Initialize combat systems (Sprint 4)
    this.initializeCombatSystem();

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

    // Create mining system with speed from ShipStats
    const miningSpeedMultiplier = this.shipStats.getStat('miningSpeed');
    this.miningSystem = new MiningSystem(
      this.inventory,
      this.particles,
      this.resourceDrops,
      {
        miningRange: 150,
        miningRate: 50 * miningSpeedMultiplier,
        baseMineDuration: 3 / miningSpeedMultiplier,
      }
    );

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
    this.hud.setMiningSystem(this.miningSystem);

    // Connect mining system to asteroids
    this.miningSystem.setAsteroids(this.asteroidSpawner.getAsteroids());
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

    // Set up docking callbacks
    this.dockingSystem.setCallbacks({
      onDock: (station) => {
        const market = this.markets.get(station.id);
        if (market) {
          this.stationUI.show(station, market);
          this.isDocked = true;
          console.log(`[Game] Docked at ${station.name}`);
        }
      },
      onUndock: () => {
        this.stationUI.hide();
        this.upgradeShopUI.hide();
        this.isDocked = false;
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
          // Enemies are already cleared by respawn process
          break;
        case 'pirate_destroyed':
          // Award loot credits
          if (event.loot) {
            this.inventory.addCredits(event.loot);
            console.log(`[Game] Earned ${event.loot} credits from pirate loot`);
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

    // Mouse move handler to track mouse position
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

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
   * Handles mouse move events to track screen position.
   */
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreenX = e.clientX - rect.left;
    this.mouseScreenY = e.clientY - rect.top;
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

    // Update ship movement
    this.ship.update(deltaTime);

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

    // Update particles
    this.particles.update(deltaTime);
  }

  /**
   * Updates all mining-related systems.
   */
  private updateMiningSystems(deltaTime: number): void {
    // Get player position from ship
    const playerX = this.ship.position.x;
    const playerY = this.ship.position.y;

    // Update player position for all systems
    this.asteroidSpawner.updatePlayerPosition(playerX, playerY);
    this.resourceDrops.updatePlayerPosition(playerX, playerY);
    this.miningSystem.updatePlayerPosition(playerX, playerY);

    // Convert mouse screen position to world position
    const worldMousePos = this.camera.screenToWorld(this.mouseScreenX, this.mouseScreenY);
    this.miningSystem.updateMouseWorldPosition(worldMousePos.x, worldMousePos.y);

    // Update all systems
    this.asteroidSpawner.update(deltaTime);
    this.miningSystem.setAsteroids(this.asteroidSpawner.getAsteroids());
    this.miningSystem.update(deltaTime);
    this.resourceDrops.update(deltaTime);
    this.hud.update(deltaTime);
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
    this.renderUI(ctx, rect.width, rect.height);
  }

  /**
   * Renders all world-space objects.
   */
  private renderWorldObjects(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
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
  private renderUI(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Render debug info first (bottom layer)
    if (this.debug) {
      this.renderDebugInfo(ctx);
    }

    // Render HUD (cargo, etc.)
    this.hud.render(ctx);

    // Render zone indicator
    this.zoneSystem.renderHUD(ctx, width - 150, 10);

    // Render health bar
    this.combatSystem.renderHealthBar(ctx, 10, height - 50);

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
   * Gets the mining system.
   */
  getMiningSystem(): MiningSystem {
    return this.miningSystem;
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
   * Cleans up game resources.
   */
  destroy(): void {
    this.stop();
    this.input.destroy();
    this.miningSystem.cleanup();
    this.saveSystem.destroy();
    this.upgradeShopUI.destroy();
    this.stationUI.destroy();
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
  }
}
