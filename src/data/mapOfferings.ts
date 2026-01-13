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
  // Frontier stations - share some common deep space intel
  {
    stationId: 'station_frontier_0',
    offerings: [
      {
        locationId: 'station_omega',
        name: 'Omega Outpost Signal',
        description: 'Encrypted coordinates to a legendary deep space trading post.',
        price: 2000,
        locationType: 'station',
      },
      {
        locationId: 'planet_deep_0',
        name: 'Terminus World Data',
        description: 'Survey charts for a remote world at the edge of known space.',
        price: 1500,
        locationType: 'planet',
      },
      {
        locationId: 'star_nemesis',
        name: 'Nemesis Star Warning',
        description: 'Danger zones around the deadly blue giant Nemesis.',
        price: 1800,
        locationType: 'star',
      },
    ],
  },
  {
    stationId: 'station_frontier_1',
    offerings: [
      {
        locationId: 'blackhole_the_maw',
        name: 'The Maw Coordinates',
        description: 'Gravitational charts for a massive black hole. Leads back to safe space.',
        price: 2500,
        locationType: 'blackhole',
      },
      {
        locationId: 'planet_deep_1',
        name: 'Erebus Survey',
        description: 'Dark world data from the far reaches of the frontier.',
        price: 1600,
        locationType: 'planet',
      },
    ],
  },
  {
    stationId: 'station_frontier_2',
    offerings: [
      {
        locationId: 'planet_deep_2',
        name: 'Polaris Navigation Data',
        description: 'Stellar cartography for a distant northern world.',
        price: 1700,
        locationType: 'planet',
      },
      {
        locationId: 'station_omega',
        name: 'Omega Outpost Beacon',
        description: 'Long-range signal data for the most remote station.',
        price: 2200,
        locationType: 'station',
      },
    ],
  },
  {
    stationId: 'station_frontier_3',
    offerings: [
      {
        locationId: 'planet_deep_3',
        name: 'Acheron Charts',
        description: 'Exploration data for a mysterious deep space world.',
        price: 1800,
        locationType: 'planet',
      },
      {
        locationId: 'star_nemesis',
        name: 'Nemesis Approach Vectors',
        description: 'Safe corridors near the blue giant Nemesis.',
        price: 2000,
        locationType: 'star',
      },
    ],
  },
  // Deep space station - sells return routes
  {
    stationId: 'station_omega',
    offerings: [
      {
        locationId: 'station_alpha',
        name: 'Return Route: Alpha Station',
        description: 'Navigation data for the long journey back to safe space.',
        price: 1000,
        locationType: 'station',
      },
      {
        locationId: 'blackhole_the_maw',
        name: 'The Maw Shortcut',
        description: 'Black hole coordinates - a dangerous but fast way home.',
        price: 1500,
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
  // Safe Zone
  'station_alpha': 'Alpha Station',
  'station_beta': 'Beta Outpost',
  'planet_haven_prime': 'Haven Prime',
  // Frontier
  'station_frontier_0': 'Gamma Hub',
  'station_frontier_1': 'Delta Station',
  'station_frontier_2': 'Epsilon Depot',
  'station_frontier_3': 'Zeta Outpost',
  'planet_aurelia': 'Aurelia',
  'planet_magnus': 'Magnus',
  'planet_glacius': 'Glacius',
  'star_inferno': 'Inferno',
  'blackhole_void_gate_alpha': 'Void Gate Alpha',
  'blackhole_void_gate_beta': 'Void Gate Beta',
  // Deep Space
  'station_omega': 'Omega Outpost',
  'planet_deep_0': 'Terminus',
  'planet_deep_1': 'Erebus',
  'planet_deep_2': 'Polaris',
  'planet_deep_3': 'Acheron',
  'planet_deep_4': 'Elysium',
  'planet_deep_5': 'Tartarus',
  'star_nemesis': 'Nemesis',
  'blackhole_the_maw': 'The Maw',
};

/**
 * Get location name from ID
 */
export function getLocationName(locationId: string): string {
  return LOCATION_NAMES[locationId] || locationId;
}
