export interface POI {
  x: number;
  y: number;
  type: 'station' | 'gate' | 'enemy' | 'asteroid' | 'undiscovered' | 'planet' | 'star' | 'blackhole' | 'warpgate';
  name?: string;
  color: string;
  hasMission?: boolean; // POIs with missions are always shown regardless of distance
}

const TYPE_COLORS: Record<POI['type'], string> = {
  station: '#4ade80',
  gate: '#22d3ee',
  enemy: '#ef4444',
  asteroid: '#a8a29e',
  undiscovered: '#fbbf24', // Amber/gold for undiscovered POIs
  planet: '#60a5fa', // Blue for planets
  star: '#fbbf24', // Yellow/amber for stars
  blackhole: '#a855f7', // Purple for black holes
  warpgate: '#34d399', // Teal for warp gates
};

export class POIMarkers {
  private edgePadding = 40;
  private arrowSize = 12;
  private fontSize = 11;
  private iconSize = 8;

  render(
    ctx: CanvasRenderingContext2D,
    screenWidth: number,
    screenHeight: number,
    cameraX: number,
    cameraY: number,
    playerX: number,
    playerY: number,
    pois: POI[]
  ): void {
    const screenCenterX = screenWidth / 2;
    const screenCenterY = screenHeight / 2;

    for (const poi of pois) {
      // Convert POI world position to screen position
      const screenX = poi.x - cameraX;
      const screenY = poi.y - cameraY;

      // Check if POI is on screen (with some margin)
      const margin = 20;
      const isOnScreen =
        screenX >= margin &&
        screenX <= screenWidth - margin &&
        screenY >= margin &&
        screenY <= screenHeight - margin;

      if (isOnScreen) {
        continue;
      }

      // Calculate distance from player to POI
      const dx = poi.x - playerX;
      const dy = poi.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate angle from screen center to POI
      const angle = Math.atan2(screenY - screenCenterY, screenX - screenCenterX);

      // Calculate marker position at screen edge
      const markerPos = this.calculateEdgePosition(
        screenCenterX,
        screenCenterY,
        angle,
        screenWidth,
        screenHeight
      );

      // Get color for this POI type
      const color = TYPE_COLORS[poi.type] || poi.color;

      // Render the marker
      this.renderMarker(ctx, markerPos.x, markerPos.y, angle, color, poi.type, distance, poi.name);
    }
  }

  private calculateEdgePosition(
    centerX: number,
    centerY: number,
    angle: number,
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number } {
    const padding = this.edgePadding;
    const halfWidth = screenWidth / 2 - padding;
    const halfHeight = screenHeight / 2 - padding;

    // Calculate intersection with screen bounds
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Determine which edge we hit first
    let t = Infinity;

    // Right edge
    if (cos > 0) {
      t = Math.min(t, halfWidth / cos);
    }
    // Left edge
    if (cos < 0) {
      t = Math.min(t, -halfWidth / cos);
    }
    // Bottom edge
    if (sin > 0) {
      t = Math.min(t, halfHeight / sin);
    }
    // Top edge
    if (sin < 0) {
      t = Math.min(t, -halfHeight / sin);
    }

    return {
      x: centerX + cos * t,
      y: centerY + sin * t,
    };
  }

  private renderMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    type: POI['type'],
    distance: number,
    name?: string
  ): void {
    ctx.save();

    // Draw arrow pointing toward POI
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Draw chevron/arrow
    ctx.beginPath();
    ctx.moveTo(this.arrowSize, 0);
    ctx.lineTo(-this.arrowSize / 2, -this.arrowSize / 2);
    ctx.lineTo(-this.arrowSize / 3, 0);
    ctx.lineTo(-this.arrowSize / 2, this.arrowSize / 2);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    // Draw outline for visibility
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reset rotation for text and icon
    ctx.rotate(-angle);

    // Draw type icon behind the arrow
    this.renderTypeIcon(ctx, -20, 0, type, color);

    // Format distance text
    const distanceText = this.formatDistance(distance);

    // Draw distance text
    ctx.font = `${this.fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position text offset from arrow (opposite to arrow direction)
    const textOffsetX = -Math.cos(angle) * 28;
    const textOffsetY = -Math.sin(angle) * 28;

    // Draw text background for readability
    const textWidth = ctx.measureText(distanceText).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(textOffsetX - textWidth / 2 - 3, textOffsetY - this.fontSize / 2 - 2, textWidth + 6, this.fontSize + 4);

    // Draw text
    ctx.fillStyle = color;
    ctx.fillText(distanceText, textOffsetX, textOffsetY);

    // Draw name if provided (below distance)
    if (name) {
      const nameOffsetY = textOffsetY + this.fontSize + 4;
      const nameWidth = ctx.measureText(name).width;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(textOffsetX - nameWidth / 2 - 3, nameOffsetY - this.fontSize / 2 - 2, nameWidth + 6, this.fontSize + 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = `${this.fontSize - 1}px monospace`;
      ctx.fillText(name, textOffsetX, nameOffsetY);
    }

    ctx.restore();
  }

  private renderTypeIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: POI['type'],
    color: string
  ): void {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    const size = this.iconSize;

    switch (type) {
      case 'station':
        // Square with dot (station icon)
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'gate':
        // Diamond shape (gate icon)
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, 0);
        ctx.lineTo(0, size / 2);
        ctx.lineTo(-size / 2, 0);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'enemy':
        // Triangle pointing right (hostile icon)
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(-size / 2, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'asteroid':
        // Circle (asteroid icon)
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'undiscovered':
        // Question mark (unknown/undiscovered icon)
        ctx.font = `bold ${size + 4}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 1);
        break;

      case 'planet':
        // Circle with ring (planet icon)
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.8, size * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'star':
        // Star burst shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? size / 2 : size / 4;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'blackhole':
        // Spiral/vortex shape
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'warpgate':
        // Portal/gate shape (two vertical lines with arc)
        ctx.beginPath();
        ctx.moveTo(-size / 2, -size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.moveTo(size / 2, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      const km = meters / 1000;
      if (km >= 10) {
        return `${Math.round(km)}km`;
      }
      return `${km.toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  }

  // Utility method to check if a POI is visible on screen
  isOnScreen(
    poi: POI,
    cameraX: number,
    cameraY: number,
    screenWidth: number,
    screenHeight: number,
    margin: number = 20
  ): boolean {
    const screenX = poi.x - cameraX;
    const screenY = poi.y - cameraY;

    return (
      screenX >= margin &&
      screenX <= screenWidth - margin &&
      screenY >= margin &&
      screenY <= screenHeight - margin
    );
  }

  // Configuration methods
  setEdgePadding(padding: number): void {
    this.edgePadding = padding;
  }

  setArrowSize(size: number): void {
    this.arrowSize = size;
  }

  setFontSize(size: number): void {
    this.fontSize = size;
  }
}
