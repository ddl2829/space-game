import type { Star, StarfieldLayer } from '../../types';
import type { Camera } from '../systems/Camera';

/**
 * Default starfield layer configurations.
 * Multiple layers create parallax depth effect.
 */
const DEFAULT_LAYERS: StarfieldLayer[] = [
  // Far background - slow, small, dim stars
  {
    starCount: 200,
    parallaxFactor: 0.1,
    minSize: 0.5,
    maxSize: 1,
    color: '#555577'
  },
  // Mid layer - medium parallax
  {
    starCount: 150,
    parallaxFactor: 0.3,
    minSize: 1,
    maxSize: 2,
    color: '#7777aa'
  },
  // Near layer - faster, larger, brighter stars
  {
    starCount: 100,
    parallaxFactor: 0.6,
    minSize: 1.5,
    maxSize: 3,
    color: '#aaaadd'
  },
  // Closest layer - occasional bright stars
  {
    starCount: 30,
    parallaxFactor: 0.9,
    minSize: 2,
    maxSize: 4,
    color: '#ffffff'
  }
];

/**
 * Parallax starfield background that creates a sense of depth and movement.
 * Stars wrap around the camera view to create an infinite field effect.
 */
export class Starfield {
  /** Star layers with different parallax speeds */
  private layers: { stars: Star[]; config: StarfieldLayer }[] = [];

  /** Field dimensions for star generation */
  private fieldWidth: number;
  private fieldHeight: number;

  constructor(
    width: number = 2000,
    height: number = 2000,
    layers: StarfieldLayer[] = DEFAULT_LAYERS
  ) {
    this.fieldWidth = width;
    this.fieldHeight = height;
    this.initializeLayers(layers);
  }

  /**
   * Creates all star layers with random star positions.
   */
  private initializeLayers(layerConfigs: StarfieldLayer[]): void {
    this.layers = layerConfigs.map(config => ({
      config,
      stars: this.generateStars(config)
    }));
  }

  /**
   * Generates random stars for a layer.
   */
  private generateStars(config: StarfieldLayer): Star[] {
    const stars: Star[] = [];

    for (let i = 0; i < config.starCount; i++) {
      stars.push({
        x: Math.random() * this.fieldWidth - this.fieldWidth / 2,
        y: Math.random() * this.fieldHeight - this.fieldHeight / 2,
        size: config.minSize + Math.random() * (config.maxSize - config.minSize),
        brightness: 0.5 + Math.random() * 0.5
      });
    }

    return stars;
  }

  /**
   * Renders the starfield with parallax effect based on camera position.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const bounds = camera.getWorldBounds();
    const viewWidth = bounds.right - bounds.left;
    const viewHeight = bounds.bottom - bounds.top;

    // Render each layer from back to front
    for (const layer of this.layers) {
      this.renderLayer(ctx, camera, layer.stars, layer.config, viewWidth, viewHeight);
    }
  }

  /**
   * Renders a single layer of stars with parallax.
   */
  private renderLayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    stars: Star[],
    config: StarfieldLayer,
    _viewWidth: number,
    _viewHeight: number
  ): void {
    // Calculate parallax offset
    const parallaxX = camera.position.x * config.parallaxFactor;
    const parallaxY = camera.position.y * config.parallaxFactor;

    ctx.fillStyle = config.color;

    for (const star of stars) {
      // Apply parallax offset
      let screenX = star.x - parallaxX;
      let screenY = star.y - parallaxY;

      // Wrap stars around the visible area
      screenX = this.wrap(screenX, -this.fieldWidth / 2, this.fieldWidth / 2);
      screenY = this.wrap(screenY, -this.fieldHeight / 2, this.fieldHeight / 2);

      // Convert to screen coordinates
      const screenPos = camera.worldToScreen(
        screenX + camera.position.x,
        screenY + camera.position.y
      );

      // Skip if outside visible area with margin
      const margin = star.size * 2;
      if (
        screenPos.x < -margin ||
        screenPos.x > camera.width + margin ||
        screenPos.y < -margin ||
        screenPos.y > camera.height + margin
      ) {
        continue;
      }

      // Draw star with slight twinkle effect
      const twinkle = 0.8 + Math.sin(Date.now() * 0.005 + star.x + star.y) * 0.2;
      const alpha = star.brightness * twinkle;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, star.size * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Wraps a value within a range for infinite scrolling effect.
   */
  private wrap(value: number, min: number, max: number): number {
    const range = max - min;
    while (value < min) value += range;
    while (value >= max) value -= range;
    return value;
  }

  /**
   * Resizes the starfield dimensions.
   */
  resize(width: number, height: number): void {
    // Scale factor for repositioning existing stars
    const scaleX = width / this.fieldWidth;
    const scaleY = height / this.fieldHeight;

    this.fieldWidth = width;
    this.fieldHeight = height;

    // Optionally scale existing star positions
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.x *= scaleX;
        star.y *= scaleY;
      }
    }
  }

  /**
   * Regenerates all stars (useful after major changes).
   */
  regenerate(): void {
    for (const layer of this.layers) {
      layer.stars = this.generateStars(layer.config);
    }
  }
}
