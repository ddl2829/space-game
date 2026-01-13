/**
 * Heads-up display - Canvas-based UI overlay
 */

import type { Inventory } from '../components/Inventory';

interface HUDConfig {
  padding: number;
  fontSize: number;
  fontFamily: string;
}

interface MissionSummary {
  title: string;
  progress: string;
  isComplete: boolean;
}

export class HUD {
  private inventory: Inventory;
  private config: HUDConfig;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  // Animation states
  private cargoFlashTimer: number = 0;
  private lastCargoWeight: number = 0;

  // Mission tracking
  private getMissionSummary: (() => MissionSummary[]) | null = null;
  private missionCompleteFlash: number = 0;

  constructor(inventory: Inventory, config?: Partial<HUDConfig>) {
    this.inventory = inventory;
    this.config = {
      padding: 20,
      fontSize: 14,
      fontFamily: 'monospace',
      ...config,
    };
  }

  /**
   * Set mission system reference for displaying active missions
   */
  public setMissionSystem(getMissionSummary: () => MissionSummary[]): void {
    this.getMissionSummary = getMissionSummary;
  }

  public update(deltaTime: number): void {
    // Update flash animation
    if (this.cargoFlashTimer > 0) {
      this.cargoFlashTimer -= deltaTime;
    }

    // Update mission complete flash
    if (this.missionCompleteFlash > 0) {
      this.missionCompleteFlash -= deltaTime;
    }

    // Detect cargo changes
    const currentWeight = this.inventory.getCurrentWeight();
    if (currentWeight !== this.lastCargoWeight) {
      this.cargoFlashTimer = 0.3;
      this.lastCargoWeight = currentWeight;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.canvasWidth = ctx.canvas.width;
    this.canvasHeight = ctx.canvas.height;

    ctx.save();

    // Render credits (top-right)
    this.renderCredits(ctx);

    // Render active missions (bottom-right)
    this.renderMissions(ctx);

    ctx.restore();
  }

  /**
   * Render cargo meter below the hull bar (bottom-left)
   */
  public renderCargoMeter(ctx: CanvasRenderingContext2D, x: number, y: number, width: number = 150): void {
    const height = 8;
    const currentWeight = this.inventory.getCurrentWeight();
    const maxWeight = this.inventory.getMaxWeight();
    const weightPercent = maxWeight > 0 ? currentWeight / maxWeight : 0;

    // Label
    ctx.fillStyle = '#8ac';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CARGO', x, y + 7);

    // Bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 35, y, width - 35, height);

    // Bar fill color based on capacity
    let barColor = '#4a8';
    if (weightPercent > 0.9) {
      barColor = '#a44';
    } else if (weightPercent > 0.7) {
      barColor = '#aa4';
    }

    // Flash effect on change
    if (this.cargoFlashTimer > 0) {
      barColor = '#fff';
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(x + 35, y, (width - 35) * weightPercent, height);

    // Bar border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 35, y, width - 35, height);

    // Weight text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${currentWeight.toFixed(0)}/${maxWeight}`,
      x + 35 + (width - 35) / 2,
      y + height - 1
    );
    ctx.textAlign = 'left';
  }

  private renderCredits(ctx: CanvasRenderingContext2D): void {
    const credits = this.inventory.getCredits();
    const text = `${credits.toLocaleString()} CR`;

    ctx.font = `bold ${this.config.fontSize + 2}px ${this.config.fontFamily}`;
    const textWidth = ctx.measureText(text).width;

    const x = this.canvasWidth - this.config.padding - textWidth - 20;
    const y = this.config.padding;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    this.roundRect(ctx, x - 10, y, textWidth + 30, 30, 5);
    ctx.fill();
    ctx.stroke();

    // Credit symbol
    ctx.fillStyle = '#fc4';
    ctx.fillText('$', x, y + 20);

    // Credit amount
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + 15, y + 20);
  }

  private renderMissions(ctx: CanvasRenderingContext2D): void {
    if (!this.getMissionSummary) return;

    const missions = this.getMissionSummary();
    if (missions.length === 0) return;

    const panelWidth = 200;
    const missionHeight = 40;
    const panelHeight = 30 + missions.length * missionHeight;
    const x = this.canvasWidth - this.config.padding - panelWidth;
    const y = this.canvasHeight - this.config.padding - panelHeight - 70; // Above health bar area

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, panelWidth, panelHeight, 5);
    ctx.fill();
    ctx.stroke();

    // Panel title
    ctx.fillStyle = '#8ac';
    ctx.font = `bold ${this.config.fontSize}px ${this.config.fontFamily}`;
    ctx.fillText('MISSIONS', x + 10, y + 18);

    // Render each mission
    let missionY = y + 35;
    for (const mission of missions) {
      // Mission icon
      const iconColor = mission.isComplete ? '#4ade80' : '#e94560';
      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(x + 15, missionY + 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Mission title (truncated if needed)
      let title = mission.title;
      if (title.length > 18) {
        title = title.substring(0, 16) + '...';
      }
      ctx.fillStyle = mission.isComplete ? '#4ade80' : '#ddd';
      ctx.font = `bold ${this.config.fontSize - 2}px ${this.config.fontFamily}`;
      ctx.fillText(title, x + 25, missionY + 10);

      // Progress text
      let progress = mission.progress;
      if (progress.length > 22) {
        progress = progress.substring(0, 20) + '...';
      }
      ctx.fillStyle = mission.isComplete ? '#4ade80' : '#888';
      ctx.font = `${this.config.fontSize - 3}px ${this.config.fontFamily}`;
      ctx.fillText(progress, x + 25, missionY + 24);

      // Complete indicator
      if (mission.isComplete) {
        ctx.fillStyle = '#4ade80';
        ctx.font = `bold ${this.config.fontSize - 2}px ${this.config.fontFamily}`;
        ctx.fillText('DONE', x + panelWidth - 40, missionY + 10);
      }

      missionY += missionHeight;
    }
  }

  /**
   * Trigger mission complete flash animation
   */
  public flashMissionComplete(): void {
    this.missionCompleteFlash = 0.5;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
