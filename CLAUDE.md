# Space Mining Game - Development Guide

## Project Overview

A 2D space exploration browser game prototype with mining, trading, combat, and upgrades.

**Core Loop**: Shoot asteroids → Collect resource drops → Sell at stations → Buy upgrades → Explore dangerous zones → Repeat

## Tech Stack

- **Vite + TypeScript** - Build tooling
- **HTML5 Canvas** - 2D rendering
- **No frameworks** - Vanilla TS, custom game loop

## Quick Start

```bash
npm install
npm run dev    # Starts at localhost:5173 (--host enabled for mobile testing)
npm run build  # Production build
```

## Architecture

```
src/
├── main.ts              # Entry point
├── game/
│   ├── Game.ts          # Main controller - orchestrates all systems
│   ├── entities/        # Game objects (Ship, Asteroid, Station, Pirate, Planet, Star, BlackHole, JumpGate, Projectile)
│   ├── systems/         # Logic systems (Input, Camera, Combat, Docking, Zones, Celestial, Weapon, EnemyAI)
│   ├── components/      # Data containers (Inventory, ShipStats)
│   ├── rendering/       # Visual systems (Starfield, Particles)
│   └── ui/              # UI components (HUD, StationUI, UpgradeShopUI, POIMarkers, VirtualController)
├── data/                # Static configs (resources, stations, upgrades, zones, celestials)
├── utils/               # Helpers (Vector2)
└── types/               # TypeScript interfaces
```

## Key Systems

| System | File | Purpose |
|--------|------|---------|
| **Game Loop** | `Game.ts` | 60fps update/render cycle, system orchestration |
| **Input** | `InputSystem.ts` | Keyboard + virtual controller (mobile) |
| **Combat** | `CombatSystem.ts` | Health, damage, projectiles, death/respawn |
| **Weapons** | `WeaponSystem.ts` | Shooting projectiles at enemies and asteroids |
| **Trading** | `StationUI.ts` + `Market.ts` | Buy/sell resources at stations |
| **Upgrades** | `UpgradeSystem.ts` + `ShipStats.ts` | Ship improvements |
| **Zones** | `ZoneSystem.ts` | Safe Zone vs Frontier (danger levels) |
| **Celestial** | `CelestialSystem.ts` | Planets, stars (damage), black holes (teleport) |

## Game Controls

| Input | Action |
|-------|--------|
| WASD / Arrows | Move ship |
| Spacebar | Shoot (destroys asteroids and enemies) |
| E | Dock at station / Use jump gate |
| U | Open upgrades (when docked) |
| ` | Toggle debug overlay |

Mobile: Virtual joystick (left) + FIRE/E buttons (right)

## Mining

Mining is done by shooting asteroids with your weapons. When an asteroid is destroyed, it drops resources that you can fly over to collect. Upgrade your weapon system to destroy asteroids faster.

## Adding New Features

### New Entity
1. Create class in `src/game/entities/`
2. Extend or follow pattern from `Ship.ts` or `Asteroid.ts`
3. Add to relevant spawner/manager
4. Call `update()` and `render()` from `Game.ts`

### New Resource
Edit `src/data/resources.ts`:
```typescript
export const RESOURCES: Record<string, Resource> = {
  myResource: { id: 'myResource', name: 'My Resource', tier: 'rare', basePrice: 50, ... }
};
```

### New Upgrade
Edit `src/data/upgrades.ts`, add to `UPGRADES` array.

### New Zone
Edit `src/data/zones.ts`, create jump gates in `Game.ts` → `createJumpGates()`.

### New Celestial Body
Edit `src/data/celestials.ts`, add to `SAFE_ZONE_CELESTIALS` or `FRONTIER_CELESTIALS`.

## Coordinate System

- Origin (0,0) is world center (Safe Zone)
- Positive X = right, Positive Y = down
- Ship rotation: 0 = facing right, increases clockwise
- Units are roughly pixels at zoom 1

## Common Patterns

### Adding to Game Loop
```typescript
// In Game.ts update():
this.mySystem.update(deltaTime);

// In Game.ts renderWorldObjects():
this.mySystem.render(ctx, cameraX, cameraY);
```

### World vs Screen Space
```typescript
// World to screen (for rendering)
const screenX = worldX - cameraX;
const screenY = worldY - cameraY;

// Screen to world (for mouse input)
const worldPos = this.camera.screenToWorld(mouseX, mouseY);
```

### Entity Collision
```typescript
const dx = entity1.x - entity2.x;
const dy = entity1.y - entity2.y;
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < entity1.radius + entity2.radius) { /* collision */ }
```

## Save System

Saves to localStorage: credits, inventory, upgrades, ship position. Auto-saves on undock and every 60s.

Clear save: `localStorage.removeItem('space-game-save')` in browser console.

## Known Limitations

- No multiplayer
- No procedural generation (hand-placed celestials)
- Audio is placeholder (Web Audio beeps)
- Touch controls work but aren't optimized for small screens

## Design Docs

See `docs/` folder:
- `GAME_DESIGN.md` - Full game design document
- `TECHNICAL_ARCHITECTURE.md` - System architecture
- `MVP_SCOPE.md` - Feature priorities
- `PROTOTYPE_ROADMAP.md` - Sprint breakdown
