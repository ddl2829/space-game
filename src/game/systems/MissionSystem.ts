/**
 * MissionSystem - Manages player missions, tracking progress and completion
 */

import {
  Mission,
  generateStationMissions,
} from '../../data/missions';

export interface MissionSystemCallbacks {
  onMissionAccepted?: (mission: Mission) => void;
  onMissionCompleted?: (mission: Mission) => void;
  onMissionAbandoned?: (mission: Mission) => void;
  onMissionProgress?: (mission: Mission) => void;
}

export class MissionSystem {
  /** Currently active missions (max 3) */
  private activeMissions: Mission[] = [];

  /** Available missions at each station */
  private availableMissions: Map<string, Mission[]> = new Map();

  /** Maximum number of active missions */
  private maxActiveMissions: number = 3;

  /** Time until mission board refreshes (in seconds) */
  private refreshTimer: number = 0;
  private refreshInterval: number = 300; // 5 minutes

  /** Callbacks */
  private callbacks: MissionSystemCallbacks = {};

  constructor() {
    // Initialize with empty state
  }

  /**
   * Set callbacks for mission events
   */
  public setCallbacks(callbacks: MissionSystemCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Initialize available missions for a station
   */
  public initializeStationMissions(stationId: string): void {
    if (!this.availableMissions.has(stationId)) {
      this.availableMissions.set(stationId, generateStationMissions(stationId, 3));
    }
  }

  /**
   * Get available missions at a station
   */
  public getAvailableMissions(stationId: string): Mission[] {
    this.initializeStationMissions(stationId);
    return this.availableMissions.get(stationId) || [];
  }

  /**
   * Get all active missions
   */
  public getActiveMissions(): Mission[] {
    return [...this.activeMissions];
  }

  /**
   * Check if player can accept more missions
   */
  public canAcceptMission(): boolean {
    return this.activeMissions.length < this.maxActiveMissions;
  }

  /**
   * Accept a mission from a station
   */
  public acceptMission(stationId: string, missionId: string): boolean {
    if (!this.canAcceptMission()) {
      console.log('[MissionSystem] Cannot accept mission - max missions reached');
      return false;
    }

    const stationMissions = this.availableMissions.get(stationId);
    if (!stationMissions) return false;

    const missionIndex = stationMissions.findIndex((m) => m.id === missionId);
    if (missionIndex === -1) return false;

    // Remove from available and add to active
    const [mission] = stationMissions.splice(missionIndex, 1);
    this.activeMissions.push(mission);

    console.log(`[MissionSystem] Accepted mission: ${mission.title}`);
    this.callbacks.onMissionAccepted?.(mission);

    return true;
  }

  /**
   * Abandon an active mission
   */
  public abandonMission(missionId: string): boolean {
    const missionIndex = this.activeMissions.findIndex((m) => m.id === missionId);
    if (missionIndex === -1) return false;

    const [mission] = this.activeMissions.splice(missionIndex, 1);
    console.log(`[MissionSystem] Abandoned mission: ${mission.title}`);
    this.callbacks.onMissionAbandoned?.(mission);

    return true;
  }

  /**
   * Record a pirate kill for kill missions
   */
  public recordPirateKill(): void {
    for (const mission of this.activeMissions) {
      if (mission.objective.type === 'kill_pirates' && !mission.isComplete) {
        mission.objective.currentCount++;
        console.log(
          `[MissionSystem] Pirate kill recorded: ${mission.objective.currentCount}/${mission.objective.targetCount}`
        );

        this.callbacks.onMissionProgress?.(mission);

        // Check completion
        if (mission.objective.currentCount >= mission.objective.targetCount) {
          mission.isComplete = true;
          console.log(`[MissionSystem] Mission complete: ${mission.title}`);
          this.callbacks.onMissionCompleted?.(mission);
        }
      }
    }
  }

  /**
   * Check if player is near a delivery destination planet
   */
  public checkDeliveryCompletion(playerX: number, playerY: number, planets: { name: string; x: number; y: number; radius: number }[]): void {
    for (const mission of this.activeMissions) {
      if (mission.objective.type === 'delivery' && !mission.isComplete) {
        const objective = mission.objective;
        // Find the destination planet
        const targetPlanet = planets.find(
          (p) => p.name === objective.destinationPlanet
        );

        if (targetPlanet) {
          // Check if player is within landing range (radius + 100 units)
          const dx = playerX - targetPlanet.x;
          const dy = playerY - targetPlanet.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const deliveryRange = targetPlanet.radius + 100;

          if (distance < deliveryRange) {
            mission.isComplete = true;
            console.log(`[MissionSystem] Delivery complete: ${mission.title}`);
            this.callbacks.onMissionCompleted?.(mission);
          }
        }
      }
    }
  }

  /**
   * Collect reward for a completed mission
   * Returns the credits earned, or 0 if mission not complete
   */
  public collectReward(missionId: string): number {
    const missionIndex = this.activeMissions.findIndex(
      (m) => m.id === missionId && m.isComplete
    );

    if (missionIndex === -1) return 0;

    const [mission] = this.activeMissions.splice(missionIndex, 1);
    console.log(`[MissionSystem] Collected reward: ${mission.reward.credits} credits`);

    return mission.reward.credits;
  }

  /**
   * Refresh available missions at a station
   */
  public refreshStationMissions(stationId: string): void {
    this.availableMissions.set(stationId, generateStationMissions(stationId, 3));
    console.log(`[MissionSystem] Refreshed missions at station ${stationId}`);
  }

  /**
   * Update the mission system (called each frame)
   */
  public update(deltaTime: number): void {
    // Update refresh timer
    this.refreshTimer += deltaTime;

    // Auto-refresh missions periodically
    if (this.refreshTimer >= this.refreshInterval) {
      this.refreshTimer = 0;
      // Refresh all station missions
      for (const stationId of this.availableMissions.keys()) {
        // Only refresh if player isn't currently looking at that station
        this.refreshStationMissions(stationId);
      }
    }
  }

  /**
   * Get count of completed missions ready to turn in
   */
  public getCompletedMissionCount(): number {
    return this.activeMissions.filter((m) => m.isComplete).length;
  }

  /**
   * Check if there are any active missions
   */
  public hasActiveMissions(): boolean {
    return this.activeMissions.length > 0;
  }

  /**
   * Get progress string for HUD display
   */
  public getActiveMissionsSummary(): { title: string; progress: string; isComplete: boolean }[] {
    return this.activeMissions.map((mission) => {
      let progress = '';

      if (mission.objective.type === 'kill_pirates') {
        progress = `${mission.objective.currentCount}/${mission.objective.targetCount} pirates`;
      } else if (mission.objective.type === 'delivery') {
        progress = mission.isComplete
          ? 'Delivered!'
          : `Deliver to ${mission.objective.destinationName}`;
      }

      return {
        title: mission.title,
        progress,
        isComplete: mission.isComplete,
      };
    });
  }

  /**
   * Save mission state
   */
  public getSaveData(): {
    activeMissions: Mission[];
    availableMissions: Record<string, Mission[]>;
  } {
    const availableMissionsObj: Record<string, Mission[]> = {};
    this.availableMissions.forEach((missions, stationId) => {
      availableMissionsObj[stationId] = missions;
    });

    return {
      activeMissions: this.activeMissions,
      availableMissions: availableMissionsObj,
    };
  }

  /**
   * Load mission state
   */
  public loadSaveData(data: {
    activeMissions: Mission[];
    availableMissions: Record<string, Mission[]>;
  }): void {
    this.activeMissions = data.activeMissions || [];

    this.availableMissions.clear();
    if (data.availableMissions) {
      for (const [stationId, missions] of Object.entries(data.availableMissions)) {
        this.availableMissions.set(stationId, missions);
      }
    }

    console.log(`[MissionSystem] Loaded ${this.activeMissions.length} active missions`);
  }
}
