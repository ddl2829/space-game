/**
 * Map offerings for each station
 * Each station sells maps to specific discoverable locations
 */

export interface MapOffering {
  locationId: string;
  name: string;
  description: string;
  price: number;
  locationType: 'station' | 'planet' | 'star' | 'blackhole' | 'gate';
}

export interface StationMapOfferings {
  stationId: string;
  offerings: MapOffering[];
}

/**
 * Map offerings available at each station
 * Each station has unique offerings based on their location and lore
 */
export const STATION_MAP_OFFERINGS: StationMapOfferings[] = [
  {
    stationId: 'station_alpha',
    offerings: [
      {
        locationId: 'station_beta',
        name: 'Beta Outpost Coordinates',
        description: 'Navigation data for a remote trading outpost in the outer sectors.',
        price: 500,
        locationType: 'station',
      },
      {
        locationId: 'planet_haven_prime',
        name: 'Haven Prime Survey',
        description: 'Detailed orbital charts for the lush world of Haven Prime.',
        price: 200,
        locationType: 'planet',
      },
      {
        locationId: 'planet_aurelia',
        name: 'Aurelia Mining Charts',
        description: 'Survey data revealing rich mineral deposits on Aurelia.',
        price: 800,
        locationType: 'planet',
      },
      {
        locationId: 'blackhole_void_gate_alpha',
        name: 'Void Gate Alpha Charts',
        description: 'Dangerous wormhole coordinates. Use with extreme caution.',
        price: 1500,
        locationType: 'blackhole',
      },
    ],
  },
  {
    stationId: 'station_beta',
    offerings: [
      {
        locationId: 'station_alpha',
        name: 'Alpha Station Beacon',
        description: 'Navigation coordinates for the main trading hub in safe space.',
        price: 500,
        locationType: 'station',
      },
      {
        locationId: 'planet_magnus',
        name: 'Magnus Gas Giant Survey',
        description: 'Approach vectors for the massive gas giant Magnus.',
        price: 600,
        locationType: 'planet',
      },
      {
        locationId: 'planet_glacius',
        name: 'Glacius Ice World Data',
        description: 'Surface scans of the frozen planet Glacius.',
        price: 700,
        locationType: 'planet',
      },
      {
        locationId: 'star_inferno',
        name: 'Inferno Star Warning Beacon',
        description: 'Safe distance charts for the deadly Inferno star.',
        price: 1000,
        locationType: 'star',
      },
      {
        locationId: 'blackhole_void_gate_beta',
        name: 'Void Gate Beta Charts',
        description: 'Return wormhole coordinates for travelers in deep space.',
        price: 1200,
        locationType: 'blackhole',
      },
    ],
  },
];

/**
 * Get map offerings for a specific station
 */
export function getMapOfferingsForStation(stationId: string): MapOffering[] {
  const stationOfferings = STATION_MAP_OFFERINGS.find(s => s.stationId === stationId);
  return stationOfferings?.offerings || [];
}

/**
 * Get a specific map offering
 */
export function getMapOffering(stationId: string, locationId: string): MapOffering | undefined {
  const offerings = getMapOfferingsForStation(stationId);
  return offerings.find(o => o.locationId === locationId);
}

/**
 * Location ID mappings to celestial names (for auto-discovery)
 */
export const LOCATION_NAMES: Record<string, string> = {
  'station_alpha': 'Alpha Station',
  'station_beta': 'Beta Outpost',
  'planet_haven_prime': 'Haven Prime',
  'planet_aurelia': 'Aurelia',
  'planet_magnus': 'Magnus',
  'planet_glacius': 'Glacius',
  'star_inferno': 'Inferno',
  'blackhole_void_gate_alpha': 'Void Gate Alpha',
  'blackhole_void_gate_beta': 'Void Gate Beta',
};

/**
 * Get location name from ID
 */
export function getLocationName(locationId: string): string {
  return LOCATION_NAMES[locationId] || locationId;
}
