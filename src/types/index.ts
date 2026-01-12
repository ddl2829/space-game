/**
 * Shared TypeScript interfaces and types for the game engine.
 */

/**
 * Represents a 2D point or position in space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a rectangular bounds.
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Represents RGBA color values.
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Game configuration options.
 */
export interface GameConfig {
  canvasId: string;
  targetFps?: number;
  debug?: boolean;
}

/**
 * Input state for a single frame.
 */
export interface InputState {
  keys: Set<string>;
  mousePosition: Point;
  mouseButtons: Set<number>;
}

/**
 * Camera configuration.
 */
export interface CameraConfig {
  smoothing?: number;
  deadzone?: number;
}

/**
 * Ship physics configuration.
 */
export interface ShipConfig {
  thrustPower: number;
  rotationSpeed: number;
  friction: number;
  maxSpeed: number;
}

/**
 * Starfield layer configuration.
 */
export interface StarfieldLayer {
  starCount: number;
  parallaxFactor: number;
  minSize: number;
  maxSize: number;
  color: string;
}

/**
 * Represents a single star in the starfield.
 */
export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

/**
 * Renderable interface for objects that can be drawn.
 */
export interface Renderable {
  render(ctx: CanvasRenderingContext2D): void;
}

/**
 * Updateable interface for objects that update each frame.
 */
export interface Updateable {
  update(deltaTime: number): void;
}
